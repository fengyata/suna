"""
User Admin API
Provides user management for admins including:
- Initialize user with credits
- Delete user
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime

from core.auth import require_super_admin
from core.services.supabase import DBConnection
from core.utils.logger import logger

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


class InitializeUserRequest(BaseModel):
    user_id: str
    tier: str = "ultra"
    credits: int = 1000000


class InitializeUserResponse(BaseModel):
    success: bool
    message: str
    account_id: Optional[str] = None
    user_id: str
    tier: str
    credits: int
    agent_id: Optional[str] = None


@router.post("/initialize", response_model=InitializeUserResponse)
async def initialize_user(
    request: InitializeUserRequest,
    _admin = Depends(require_super_admin)
):
    """
    Initialize a user with specified tier and credits.
    Super admin only.
    
    - Creates credit_accounts record if not exists
    - Sets tier and credits balance
    - Creates default project if not exists
    """
    db = DBConnection()
    await db.initialize()
    
    try:
        client = await db.client
        
        # 1) Get account_id from user_id
        account_result = await client.schema('basejump').from_('accounts').select(
            'id'
        ).eq(
            'primary_owner_user_id', request.user_id
        ).eq(
            'personal_account', True
        ).single().execute()
        
        if not account_result.data:
            raise HTTPException(
                status_code=404, 
                detail=f"Account not found for user_id: {request.user_id}"
            )
        
        account_id = account_result.data['id']
        logger.info(f"[ADMIN] Found account {account_id} for user {request.user_id}")
        
        # 2) Upsert credit_accounts using raw SQL for reliability
        from core.services.db import execute_one, execute_mutate
        
        # Check if exists
        existing = await execute_one(
            "SELECT account_id FROM credit_accounts WHERE account_id = :account_id",
            {"account_id": account_id}
        )
        
        if existing:
            # Update existing record
            await execute_mutate(
                """
                UPDATE credit_accounts 
                SET tier = :tier,
                    balance = :balance,
                    lifetime_granted = :lifetime_granted,
                    updated_at = NOW()
                WHERE account_id = :account_id
                """,
                {
                    "account_id": account_id,
                    "tier": request.tier,
                    "balance": request.credits,
                    "lifetime_granted": request.credits
                }
            )
            logger.info(f"[ADMIN] Updated credit_accounts for {account_id}")
        else:
            # Insert new record
            await execute_mutate(
                """
                INSERT INTO credit_accounts (account_id, tier, balance, lifetime_granted, lifetime_purchased, lifetime_used, created_at, updated_at)
                VALUES (:account_id, :tier, :balance, :lifetime_granted, 0, 0, NOW(), NOW())
                """,
                {
                    "account_id": account_id,
                    "tier": request.tier,
                    "balance": request.credits,
                    "lifetime_granted": request.credits
                }
            )
            logger.info(f"[ADMIN] Created credit_accounts for {account_id}")
        
        # 3) Create default project if no projects exist
        project_check = await execute_one(
            "SELECT project_id FROM projects WHERE account_id = :account_id LIMIT 1",
            {"account_id": account_id}
        )
        
        if not project_check:
            await execute_mutate(
                """
                INSERT INTO projects (account_id, name, description, created_at, updated_at)
                VALUES (:account_id, 'Default Project', 'Default project for organizing threads', NOW(), NOW())
                """,
                {"account_id": account_id}
            )
            logger.info(f"[ADMIN] Created default project for {account_id}")
        
        # 4) Install SuperAgent agent (docs, etc.)
        agent_id = None
        try:
            from core.utils.suna_default_agent_service import SunaDefaultAgentService
            suna_service = SunaDefaultAgentService(db)
            agent_id = await suna_service.install_suna_agent_for_user(account_id)
            if agent_id:
                logger.info(f"[ADMIN] Installed SuperAgent agent {agent_id} for {account_id}")
            else:
                logger.warning(f"[ADMIN] Failed to install SuperAgent agent for {account_id}")
        except Exception as e:
            logger.error(f"[ADMIN] Error installing SuperAgent agent for {account_id}: {e}")
        
        logger.info(f"[ADMIN] ✅ User {request.user_id} initialized: tier={request.tier}, credits={request.credits}, agent={agent_id}")
        
        return InitializeUserResponse(
            success=True,
            message=f"User initialized successfully with {request.tier} tier and {request.credits} credits",
            account_id=account_id,
            user_id=request.user_id,
            tier=request.tier,
            credits=request.credits,
            agent_id=agent_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ADMIN] Error initializing user {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class DeleteUserRequest(BaseModel):
    user_id: str


@router.delete("/delete")
async def delete_user(
    request: DeleteUserRequest,
    _admin = Depends(require_super_admin)
):
    """
    Delete a user and all their data.
    Super admin only.
    Uses the existing delete_user_immediately function.
    """
    db = DBConnection()
    await db.initialize()
    
    try:
        client = await db.client
        
        # Get account_id
        account_result = await client.schema('basejump').from_('accounts').select(
            'id'
        ).eq(
            'primary_owner_user_id', request.user_id
        ).eq(
            'personal_account', True
        ).single().execute()
        
        if not account_result.data:
            raise HTTPException(
                status_code=404,
                detail=f"Account not found for user_id: {request.user_id}"
            )
        
        account_id = account_result.data['id']
        
        # Call the delete function
        result = await client.rpc(
            'delete_user_immediately',
            {'p_account_id': account_id, 'p_user_id': request.user_id}
        ).execute()
        
        logger.info(f"[ADMIN] ✅ User {request.user_id} deleted")
        
        return {
            "success": True,
            "message": f"User {request.user_id} deleted successfully",
            "account_id": account_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ADMIN] Error deleting user {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

