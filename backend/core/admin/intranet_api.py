"""
Intranet API
Provides intranet login functionality for Flashintel users.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from supabase import AsyncClientOptions, create_async_client
from gotrue.errors import AuthApiError

from core.utils.flashintel_service import FlashintelService
from core.services.supabase import DBConnection
from core.utils.config import config
from core.utils.logger import logger

router = APIRouter(prefix="/intranet", tags=["intranet"])


class IntranetLoginRequest(BaseModel):
    token: str
    company_id: str


class IntranetLoginResponse(BaseModel):
    email: str
    password: str
    account_id: str


class IntranetCreateUserRequest(BaseModel):
    user_id: str
    company_id: str


class IntranetCreateUserResponse(BaseModel):
    code: int
    message: str


@router.post("/login", response_model=IntranetLoginResponse)
async def intranet_login(request: IntranetLoginRequest):
    """
    Intranet login endpoint for Flashintel users.

    Flow:
    1. Verify token with Flashintel API
    2. Check if user exists (companyId: 0, userId: 0 means user doesn't exist)
    3. Build email/password derived from user_id and request.company_id
    4. Query Supabase auth.users by email to get the user's id
    5. Return {email, password, account_id} if user exists

    Returns:
        - 403 "User not found" if Flashintel returns companyId: 0, userId: 0
        - 404 "User not found" if Supabase auth.users does not contain this email
        - 200 with email/password/account_id on success
    """
    try:
        # Step 1: Check token with Flashintel API.
        flashintel_service = FlashintelService()
        flashintel_response = await flashintel_service.check_token(
            token=request.token,
            company_id=request.company_id
        )
        logger.info(f"Flashintel response: {flashintel_response}")

        # Step 2: Check if user exists.
        data = flashintel_response.get("data", {})
        logger.info(f"Intranet login response: {data}")
        company_id_from_response = data.get("companyId")
        user_id = data.get("userId")


        # Treat both numeric 0 and string "0" as "not found" for compatibility.
        if str(company_id_from_response) == "0" and str(user_id) == "0":
            logger.warning(
                f"Intranet login failed: User not found in Flashintel "
                f"(company_id: {request.company_id}, token: {request.token[:10]}...)"
            )
            raise HTTPException(status_code=403, detail="User not found")

        if not user_id:
            logger.warning(
                "Intranet login failed: Flashintel did not return userId "
                f"(company_id: {request.company_id}, token: {request.token[:10]}...)"
            )
            raise HTTPException(status_code=403, detail="User not found")

        # Step 3: Build email/password derived from user_id and request.company_id.
        # Email format: "{user_id}_{company_id}@flashlabs.ai"
        # Password format: "{user_id}_{company_id}"
        # Important: company_id must come from request input (by requirement).
        password_prefix = f"{user_id}_{request.company_id}"
        email = f"{password_prefix}@flashlabs.ai"
        password = password_prefix

        try:
            # Step 4: Query Supabase Auth user id (auth.users.id) by derived email.
            #
            # Important: PostgREST does NOT expose the `auth` schema tables directly.
            # We call a SECURITY DEFINER RPC in `public` which reads `auth.users`
            # internally and returns the UUID.
            db = DBConnection()
            client = await db.client
            rpc_result = await client.rpc("get_user_id_by_email", {"email_param": email}).execute()  
            logger.info(f"Supabase RPC result: {rpc_result}")

            account_id = rpc_result.data
        except Exception as e:
            logger.error(
                f"Intranet login error: Supabase query failed (email: {email}): {e}",
                exc_info=True,
            )
            raise HTTPException(status_code=500, detail="Supabase query error")

        if not account_id:
            raise HTTPException(status_code=404, detail="User not found")

        return IntranetLoginResponse(
            email=email,
            password=password,
            account_id=account_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intranet login error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create_user", response_model=IntranetCreateUserResponse)
async def intranet_create_user(request: IntranetCreateUserRequest):
    """
    Create a Supabase Auth user using email/password derived from user_id and company_id.

    Email format: "{user_id}_{company_id}@flashlabs.ai"
    Password format: "{user_id}_{company_id}"

    Notes:
    - No Flashintel token validation (by requirement)
    - Supabase is configured to auto-confirm emails (by requirement)
    """
    # Email/password format must match intranet_login (L74-L76).
    password_prefix = f"{request.user_id}_{request.company_id}"
    email = f"{password_prefix}@flashlabs.ai"
    password = password_prefix

    # Use Admin API to create users (matches Supabase Studio "Create user" behavior).
    # This requires the service_role key and must only be called server-side.
    if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_ROLE_KEY:
        logger.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured")
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: Supabase not configured",
        )

    httpx_client = httpx.AsyncClient(timeout=50)
    options = AsyncClientOptions(httpx_client=httpx_client)
    client = await create_async_client(
        config.SUPABASE_URL.rstrip("/"),
        config.SUPABASE_SERVICE_ROLE_KEY,
        options=options,
    )
    try:
        await client.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
            }
        )
    except AuthApiError as e:
        msg = getattr(e, "message", None) or str(e)
        status = getattr(e, "status", None)
        code = getattr(e, "code", None)

        if "Invalid API key" in msg:
            logger.error(
                "Supabase sign-up failed: invalid API key. "
                "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY belong to the same project."
            )
            raise HTTPException(
                status_code=500,
                detail="Server configuration error: invalid Supabase API key",
            )

        # Treat "already exists" as idempotent success.
        if code in ("email_exists", "user_already_exists") or "already been registered" in msg:
            logger.info(f"Intranet create_user: user already exists (email: {email})")
            return IntranetCreateUserResponse(code=200, message="User already exists")

        logger.warning(
            f"Intranet create_user failed: Supabase rejected sign-up "
            f"(email: {email}, status: {status}, code: {code})"
        )
        raise HTTPException(status_code=400, detail="User creation failed")
    finally:
        await httpx_client.aclose()

    logger.info(f"Intranet create_user successful for {email}")
    return IntranetCreateUserResponse(code=200, message="User created")
