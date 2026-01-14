"""
Flashlabs Token Billing Service

This module provides integration with the Flashlabs Token HTTP API for billing operations.
It replaces the internal credit_accounts/credit_ledger system with external token service calls.

Key features:
- USD to Token conversion (向上取整)
- Company/User resolution from auth.users.email
- Token balance checking and deduction
- Fail-closed error handling
"""

import json
import re
import asyncio
from decimal import Decimal, ROUND_CEILING
from typing import Tuple, Optional, Dict, Any
from dataclasses import dataclass

from core.utils.config import config, EnvMode
from core.utils.logger import logger
from core.services.http_client import get_http_client
from core.services import redis


@dataclass
class TokenInfo:
    """Token balance information from Flashlabs service"""
    total: int
    used: int
    
    @property
    def remaining(self) -> int:
        """Calculate remaining tokens"""
        return self.total - self.used


class FeatIdConfig:
    """
    Feature ID configuration for Flashlabs Token service.
    
    FeatId is used to categorize different types of usage for billing/analytics.
    """
    
    # featId mapping rules (统一在此配置)
    # 1) LLM 调用对应的 featId
    LLM_USAGE = "llm_usage"
    # 2) Apify tool 对应 featId
    WEB_SCRAPE = "web_scrape"
    # 2.1) Web search tool (Tavily) 对应 featId
    WEB_SEARCH = "web_search"
    # 3) 图片 tool 对应 featId
    IMAGE = "images_generation"
    # 4) 视频 tool 对应 featId
    VIDEO_GENERATION = "video_generation"
    # 5) People search tool 对应 featId
    PEOPLE_SEARCH = "people_search"
    # 6) Company search tool 对应 featId
    COMPANY_SEARCH = "company_search"

    # Backwards-compatible alias for existing call sites:
    # - Apify code paths use APIFY
    APIFY = WEB_SCRAPE
    
    @classmethod
    def get_llm_feat_id(cls, model: str) -> str:
        """
        Get featId for LLM model.
        
        Args:
            model: Model name (e.g., "anthropic/claude-sonnet-4.5")
            
        Returns:
            featId string
        """
        # New rule: all LLM usage uses a single featId
        return cls.LLM_USAGE
    
    @staticmethod
    def _normalize_model_key(model: str) -> str:
        """
        Normalize model name to mapping key format.
        
        Examples:
            - "anthropic/claude-sonnet-4.5" → "claude_sonnet_4_5"
            - "openrouter/anthropic/claude-sonnet-4.5" → "claude_sonnet_4_5"
            - "gpt-4o-mini" → "gpt_4o_mini"
        """
        if not model:
            return ""
        
        # Remove provider prefix (keep last part)
        if '/' in model:
            model = model.split('/')[-1]
        
        # Lowercase, replace - and . with _
        normalized = model.lower().replace('-', '_').replace('.', '_')
        
        return normalized


class FlashlabsTokenService:
    """
    Flashlabs Token Service adapter.
    
    Provides methods for:
    - Token balance checking
    - Token deduction
    - USD to Token conversion
    - User/Company resolution from UUID
    """
    
    # Token price: $0.012 per token
    TOKEN_PRICE_USD = Decimal("0.012")
    
    # Cache TTL for user mapping (5 minutes)
    USER_MAPPING_CACHE_TTL = 300
    
    # HTTP timeout for token service calls
    HTTP_TIMEOUT = 10.0
    
    def __init__(self):
        self._base_url = None

    @property
    def billing_enabled(self) -> bool:
        """
        Whether billing is enabled in current environment.

        By default, billing is skipped in local mode; can be overridden for local
        testing by setting TOKEN_BILLING_ENABLE_LOCAL=true.
        """
        if config.ENV_MODE == EnvMode.LOCAL:
            return bool(getattr(config, "TOKEN_BILLING_ENABLE_LOCAL", False))
        return True
    
    @property
    def base_url(self) -> str:
        """Get Token API base URL from config"""
        if self._base_url is None:
            self._base_url = getattr(config, 'TOKEN_API_BASE_URL', None)
        return self._base_url
    
    @property
    def is_configured(self) -> bool:
        """Check if Token service is configured"""
        return bool(self.base_url)
    
    # ========== USD ↔ Token Conversion ==========
    
    @classmethod
    def usd_to_token(cls, cost_usd: Decimal) -> int:
        """
        Convert USD cost to Token amount (向上取整).
        
        Args:
            cost_usd: Cost in USD (Decimal)
            
        Returns:
            Token amount (positive integer, >=1 when cost_usd > 0)
        """
        if cost_usd <= 0:
            return 0
        
        # Use Decimal division and ceiling rounding
        token_value = cost_usd / cls.TOKEN_PRICE_USD
        return int(token_value.to_integral_value(rounding=ROUND_CEILING))
    
    @classmethod
    def token_to_usd(cls, token: int) -> Decimal:
        """
        Convert Token amount back to USD (for display purposes).
        
        Args:
            token: Token amount
            
        Returns:
            USD amount (Decimal)
        """
        return Decimal(token) * cls.TOKEN_PRICE_USD
    
    # ========== User/Company Resolution ==========
    
    async def resolve_company_user(self, account_uuid: str) -> Tuple[int, int]:
        """
        Resolve account UUID to (companyId, userId).
        
        The mapping is derived from auth.users.email with format:
        {userId}_{companyId}@flashlabs.ai
        
        Results are cached in Redis for performance.
        
        Args:
            account_uuid: Supabase auth.users.id (UUID string)
            
        Returns:
            Tuple of (companyId, userId) as integers
            
        Raises:
            ValueError: If email format is invalid or user not found
        """
        cache_key = f"user_mapping:{account_uuid}"
        
        # Check Redis cache first
        try:
            cached = await redis.get(cache_key)
            if cached:
                data = json.loads(cached)
                return (data['company_id'], data['user_id'])
        except Exception as e:
            logger.debug(f"[TOKEN_SERVICE] Cache read failed: {e}")
        
        # Query auth.users.email via Supabase
        from core.services.supabase import DBConnection
        db = DBConnection()
        client = await db.client
        
        try:
            # Use RPC to get user email (auth.users is not directly queryable)
            result = await client.rpc('get_user_email', {'user_id': account_uuid}).execute()
            
            if not result.data:
                raise ValueError(f"User {account_uuid} not found")
            
            email = result.data
            if isinstance(email, list) and len(email) > 0:
                email = email[0].get('email') if isinstance(email[0], dict) else email[0]
            
            if not email or '@flashlabs.ai' not in email:
                raise ValueError(f"Invalid email format for user {account_uuid}: {email}")
            
            # Parse email: {userId}_{companyId}@flashlabs.ai
            prefix = email.split('@')[0]
            parts = prefix.split('_')
            
            if len(parts) < 2:
                raise ValueError(f"Invalid email format: {email}")
            
            user_id = int(parts[0])
            company_id = int(parts[1])
            
            # Cache the result
            try:
                cache_data = json.dumps({'company_id': company_id, 'user_id': user_id})
                await redis.set(cache_key, cache_data, ex=self.USER_MAPPING_CACHE_TTL)
            except Exception as e:
                logger.debug(f"[TOKEN_SERVICE] Cache write failed: {e}")
            
            logger.debug(f"[TOKEN_SERVICE] Resolved {account_uuid} -> company={company_id}, user={user_id}")
            return (company_id, user_id)
            
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"[TOKEN_SERVICE] Failed to resolve user {account_uuid}: {e}")
            raise ValueError(f"Failed to resolve user: {e}")

    async def resolve_account_uuid_from_thread(
        self,
        thread_id: str,
        supabase_client: Any,
    ) -> Optional[str]:
        """
        Resolve thread_id -> account_uuid (threads.account_id).

        Note:
        - 这里不依赖 ThreadManager，调用方传入已初始化的 Supabase client（例如 thread_manager.db.client）。
        - 仅用于工具层在扣费前（或异步扣费任务中）补齐 account_uuid。
        """
        try:
            if not thread_id:
                return None

            cache_key = f"account_uuid_from_thread:{thread_id}"

            # Check Redis cache first
            try:
                cached = await redis.get(cache_key)
                if cached:
                    # redis returns str/bytes depending on implementation; normalize to str
                    if isinstance(cached, (bytes, bytearray)):
                        cached = cached.decode("utf-8", errors="replace")
                    logger.debug(
                        f"[TOKEN_SERVICE] account_uuid_from_thread cache hit - thread_id={thread_id}"
                    )
                    return str(cached)
            except Exception as e:
                logger.debug(f"[TOKEN_SERVICE] Cache read failed: {e}")

            logger.debug(
                f"[TOKEN_SERVICE] account_uuid_from_thread cache miss - thread_id={thread_id}"
            )
            result = (
                await supabase_client.from_("threads")
                .select("account_id")
                .eq("thread_id", thread_id)
                .single()
                .execute()
            )
            if result.data:
                account_id = result.data.get("account_id")
                if account_id:
                    try:
                        await redis.set(cache_key, str(account_id), ex=self.USER_MAPPING_CACHE_TTL)
                    except Exception as e:
                        logger.debug(f"[TOKEN_SERVICE] Cache write failed: {e}")
                return account_id
        except Exception as e:
            logger.error(f"[TOKEN_SERVICE] Failed to resolve account_uuid from thread {thread_id}: {e}")
        return None

    def schedule_deduct_tokens(
        self,
        *,
        thread_id: str,
        db: Any,
        feat_id: str,
        action: str,
        token_value: int,
        tool_call_id: Optional[str] = None,
        message_suffix: Optional[str] = None,
    ) -> None:
        """
        异步扣费调度（fire-and-forget），不阻塞工具调用性能。

        - 调用方显式传入 thread_id（避免 service 强耦合 structlog context）
        - db 期望为 DBConnection 或兼容对象（需支持 await db.client 获取 supabase client）
        - messageId 默认：{thread_id}:{action}:{tool_call_id|no_tool_call_id}
          batch/聚合场景可通过 message_suffix 追加以区分幂等键
        """
        # Keep a single messageId for traceability across logs and token service idempotency.
        base_message_id = f"{thread_id}:{action}:{tool_call_id or 'no_tool_call_id'}"
        message_id = f"{base_message_id}:{message_suffix}" if message_suffix else base_message_id

        if not self.billing_enabled:
            logger.debug(
                "[TOKEN_SERVICE] schedule_deduct_tokens skipped (billing disabled) "
                f"- thread_id={thread_id}, feat_id={feat_id}, action={action}, "
                f"token_value={token_value}, message_id={message_id}"
            )
            return

        if not thread_id:
            logger.warning("[TOKEN_SERVICE] schedule_deduct_tokens missing thread_id; skipping")
            return

        if token_value <= 0:
            logger.debug(
                "[TOKEN_SERVICE] schedule_deduct_tokens skipped (token_value<=0) "
                f"- thread_id={thread_id}, feat_id={feat_id}, action={action}, "
                f"token_value={token_value}, message_id={message_id}"
            )
            return

        logger.info(
            "[TOKEN_SERVICE] schedule_deduct_tokens scheduled "
            f"- thread_id={thread_id}, feat_id={feat_id}, action={action}, "
            f"token_value={token_value}, tool_call_id={tool_call_id or 'no_tool_call_id'}, "
            f"message_id={message_id}"
        )

        async def _run():
            try:
                logger.debug(
                    "[TOKEN_SERVICE] schedule_deduct_tokens task start "
                    f"- thread_id={thread_id}, feat_id={feat_id}, action={action}, "
                    f"token_value={token_value}, message_id={message_id}"
                )
                client = await db.client
                account_id = await self.resolve_account_uuid_from_thread(thread_id, client)
                if not account_id:
                    logger.error(f"[TOKEN_SERVICE] Cannot resolve account_id for thread {thread_id}")
                    return
                account_id_str = str(account_id)
                account_id_safe = (
                    f"{account_id_str[:8]}...{account_id_str[-6:]}"
                    if len(account_id_str) > 14
                    else account_id_str
                )
                logger.debug(
                    "[TOKEN_SERVICE] schedule_deduct_tokens resolved account "
                    f"- thread_id={thread_id}, account_uuid={account_id_safe}, "
                    f"feat_id={feat_id}, action={action}, token_value={token_value}, "
                    f"message_id={message_id}"
                )
                await self.deduct_tokens_for_tool(
                    account_uuid=account_id,
                    feat_id=feat_id,
                    token_value=token_value,
                    message_id=message_id,
                )
                logger.info(
                    "[TOKEN_SERVICE] schedule_deduct_tokens completed "
                    f"- thread_id={thread_id}, account_uuid={account_id_safe}, "
                    f"feat_id={feat_id}, action={action}, token_value={token_value}, "
                    f"message_id={message_id}"
                )
            except Exception as e:
                logger.error(f"[TOKEN_SERVICE] Async billing deduction failed: {e}")

        try:
            asyncio.create_task(_run())
        except RuntimeError:
            logger.warning("[TOKEN_SERVICE] No running event loop; cannot schedule async billing deduction")
    
    # ========== Token API Calls ==========
    
    async def get_token(self, company_id: int) -> TokenInfo:
        """
        Query token balance from Flashlabs service.
        
        GET /api/v2/sales/agent/get/token/{companyId}
        
        Fail-closed: Any error is treated as "no balance".
        
        Args:
            company_id: Company ID
            
        Returns:
            TokenInfo with total and used amounts
            
        Raises:
            Exception: On any failure (fail-closed behavior)
        """
        if not self.is_configured:
            raise Exception("TOKEN_API_BASE_URL not configured")
        
        url = f"{self.base_url}/api/v2/sales/agent/get/token/{company_id}"
        
        import time
        t0 = time.time()
        url_safe = url
        try:
            import time
            async with get_http_client() as client:
                response = await client.get(url, timeout=self.HTTP_TIMEOUT)
                status_code = response.status_code
                text_preview = (response.text or "")[:300]
                response.raise_for_status()
                data = response.json()
            elapsed_ms = (time.time() - t0) * 1000
            
            # Success: code == 200 and data exists
            if data.get('code') == 200 and data.get('data'):
                token_data = data['data']
                token_info = TokenInfo(
                    total=int(token_data.get('tokenTotal', 0)),
                    used=int(token_data.get('tokenUsed', 0))
                )
                logger.info(
                    f"[TOKEN_SERVICE] get_token success - company={company_id}, "
                    f"total={token_info.total}, used={token_info.used}, remaining={token_info.remaining}, "
                    f"elapsed_ms={elapsed_ms:.1f}"
                )
                return token_info
            else:
                # Fail-closed: treat as no balance
                logger.error(
                    f"[TOKEN_SERVICE] get_token failed - code={data.get('code')}, "
                    f"message={data.get('message')}, companyId={company_id}"
                )
                raise Exception(f"Token query failed: {data.get('message', 'Unknown error')}")
                
        except Exception as e:
            elapsed_ms = (time.time() - t0) * 1000
            # Some exception types may have empty str(e); log type + repr for observability.
            logger.error(
                f"[TOKEN_SERVICE] get_token exception - company={company_id}, "
                f"elapsed_ms={elapsed_ms:.1f}, error_type={type(e).__name__}, error={e!r}"
            )
            # If we already got an HTTP response, include more context.
            try:
                logger.error(
                    f"[TOKEN_SERVICE] get_token http context - company={company_id}, "
                    f"status_code={locals().get('status_code', None)}, url={url_safe}, "
                    f"body_preview={locals().get('text_preview', '')!r}"
                )
            except Exception:
                pass
            raise
    
    async def reduce_token(
        self,
        company_id: int,
        user_id: int,
        feat_id: str,
        value: int,
        message_id: str
    ) -> bool:
        """
        Deduct tokens from Flashlabs service.
        
        POST /api/v2/sales/agent/reduce/token
        
        Fail-closed: Only code==200 AND data==true is success.
        
        Args:
            company_id: Company ID
            user_id: User ID
            feat_id: Feature ID (from FeatIdConfig)
            value: Token amount to deduct (positive integer)
            message_id: Idempotency key
            
        Returns:
            True only if deduction succeeded
            
        Raises:
            Exception: On any failure (fail-closed behavior)
        """
        if not self.is_configured:
            raise Exception("TOKEN_API_BASE_URL not configured")
        
        if value <= 0:
            logger.debug(f"[TOKEN_SERVICE] Skipping reduce_token with value={value}")
            return True
        
        url = f"{self.base_url}/api/v2/sales/agent/reduce/token"
        payload = {
            "companyId": company_id,
            "userId": user_id,
            "featId": feat_id,
            "value": value,
            "messageId": message_id
        }
        
        try:
            async with get_http_client() as client:
                response = await client.post(
                    url,
                    json=payload,
                    timeout=self.HTTP_TIMEOUT
                )
                data = response.json()
            
            # Success ONLY if code == 200 AND data == true
            if data.get('code') == 200 and data.get('data') is True:
                logger.info(
                    f"[TOKEN_SERVICE] reduce_token success - company={company_id}, "
                    f"user={user_id}, feat={feat_id}, value={value}, msgId={message_id}"
                )
                return True
            else:
                # Fail-closed: any other case is failure
                logger.error(
                    f"[TOKEN_SERVICE] reduce_token failed - code={data.get('code')}, "
                    f"data={data.get('data')}, message={data.get('message')}, "
                    f"companyId={company_id}, userId={user_id}, featId={feat_id}, "
                    f"value={value}, messageId={message_id}"
                )
                raise Exception(f"Token deduction failed: {data.get('message', 'Unknown error')}")
                
        except Exception as e:
            logger.error(
                f"[TOKEN_SERVICE] reduce_token exception - company={company_id}, "
                f"user={user_id}, feat={feat_id}, value={value}, error={e}"
            )
            raise
    
    # ========== Convenience Methods ==========
    
    async def check_balance(self, account_uuid: str) -> Tuple[bool, int, str]:
        """
        Check if account has sufficient balance to run.
        
        Args:
            account_uuid: Supabase auth.users.id
            
        Returns:
            Tuple of (can_run, remaining, message)
        """
        # Skip in local mode unless explicitly enabled
        if not self.billing_enabled:
            return True, 999999, "Local mode (billing skipped)"
        
        try:
            company_id, _ = await self.resolve_company_user(account_uuid)
            token_info = await self.get_token(company_id)
            
            if token_info.remaining <= 0:
                return False, 0, "Insufficient credits. Please add credits to continue."
            
            return True, token_info.remaining, f"Credits available: {token_info.remaining}"
            
        except Exception as e:
            # Fail-closed: treat errors as "no balance"
            logger.error(
                f"[TOKEN_SERVICE] check_balance failed for {account_uuid}: "
                f"{type(e).__name__} {e!r}"
            )
            return False, 0, f"Failed to check balance: {type(e).__name__}"
    
    async def deduct_for_llm(
        self,
        account_uuid: str,
        cost_usd: Decimal,
        model: str,
        message_id: str
    ) -> bool:
        """
        Deduct tokens for LLM usage.
        
        Args:
            account_uuid: Supabase auth.users.id
            cost_usd: Cost in USD (Decimal)
            model: Model name
            message_id: Idempotency key (usually the message_id from llm_response_end)
            
        Returns:
            True if deduction succeeded
        """
        # Skip in local mode unless explicitly enabled
        if not self.billing_enabled:
            return True
        
        value = self.usd_to_token(cost_usd)
        if value <= 0:
            return True
        
        feat_id = FeatIdConfig.get_llm_feat_id(model)
        company_id, user_id = await self.resolve_company_user(account_uuid)

        logger.info(f"deduct_for_llm cost_usd:{cost_usd}, value:{value}")
        
        return await self.reduce_token(company_id, user_id, feat_id, value, message_id)
    
    async def deduct_for_tool(
        self,
        account_uuid: str,
        cost_usd: Decimal,
        feat_id: str,
        message_id: str
    ) -> bool:
        """
        Deduct tokens for tool usage.
        
        Args:
            account_uuid: Supabase auth.users.id
            cost_usd: Cost in USD (Decimal)
            feat_id: Feature ID (e.g. FeatIdConfig.WEB_SCRAPE / VIDEO_GENERATION / PEOPLE_SEARCH / COMPANY_SEARCH)
            message_id: Idempotency key
            
        Returns:
            True if deduction succeeded
        """
        # Skip in local mode unless explicitly enabled
        if not self.billing_enabled:
            return True
        
        value = self.usd_to_token(cost_usd)
        if value <= 0:
            return True
        
        company_id, user_id = await self.resolve_company_user(account_uuid)
        
        return await self.reduce_token(company_id, user_id, feat_id, value, message_id)

    async def deduct_tokens_for_tool(
        self,
        account_uuid: str,
        feat_id: str,
        token_value: int,
        message_id: str
    ) -> bool:
        """
        Deduct tokens for tool usage with fixed token amount.

        与 deduct_for_tool 类似，但不接收 cost_usd，不做 usd_to_token 换算，
        直接按 token_value 扣减（用于固定扣 token 的工具）。
        """
        # Skip in local mode unless explicitly enabled
        if not self.billing_enabled:
            return True

        if token_value <= 0:
            return True

        company_id, user_id = await self.resolve_company_user(account_uuid)
        return await self.reduce_token(company_id, user_id, feat_id, token_value, message_id)
    
    async def get_balance_for_display(self, account_uuid: str) -> Dict[str, Any]:
        """
        Get balance information for display purposes.
        
        Args:
            account_uuid: Supabase auth.users.id
            
        Returns:
            Dict with total, used, remaining tokens
        """
        # Skip in local mode unless explicitly enabled
        if not self.billing_enabled:
            return {
                'total': 999999,
                'used': 0,
                'remaining': 999999,
                'local_mode': True,
                'billing_skipped': True
            }
        
        try:
            company_id, _ = await self.resolve_company_user(account_uuid)
            token_info = await self.get_token(company_id)
            
            return {
                'total': token_info.total,
                'used': token_info.used,
                'remaining': token_info.remaining
            }
            
        except Exception as e:
            logger.error(f"[TOKEN_SERVICE] get_balance_for_display failed for {account_uuid}: {e}")
            return {
                'total': 0,
                'used': 0,
                'remaining': 0,
                'error': str(e)
            }


# Singleton instance
token_service = FlashlabsTokenService()
