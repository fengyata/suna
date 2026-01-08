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
        
        # 2) Upsert credit_accounts
        credit_data = {
            'account_id': account_id,
            'tier': request.tier,
            'credits_balance': request.credits,
            'credits_used': 0,
            'daily_credits': 0,
            'lifetime_credits_granted': request.credits,
            'lifetime_credits_purchased': 0,
            'lifetime_credits_used': 0,
            'trial_status': None,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Check if exists
        existing = await client.from_('credit_accounts').select(
            'account_id'
        ).eq('account_id', account_id).execute()
        
        if existing.data:
            # Update
            await client.from_('credit_accounts').update({
                'tier': request.tier,
                'credits_balance': request.credits,
                'lifetime_credits_granted': request.credits,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('account_id', account_id).execute()
            logger.info(f"[ADMIN] Updated credit_accounts for {account_id}")
        else:
            # Insert
            credit_data['created_at'] = datetime.utcnow().isoformat()
            await client.from_('credit_accounts').insert(credit_data).execute()
            logger.info(f"[ADMIN] Created credit_accounts for {account_id}")
        
        # 3) Create default project if not exists
        project_check = await client.from_('projects').select(
            'project_id'
        ).eq('account_id', account_id).eq('is_default', True).execute()
        
        if not project_check.data:
            await client.from_('projects').insert({
                'account_id': account_id,
                'name': 'Default Project',
                'description': 'Default project for organizing threads',
                'is_default': True,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }).execute()
            logger.info(f"[ADMIN] Created default project for {account_id}")
        
        logger.info(f"[ADMIN] ✅ User {request.user_id} initialized: tier={request.tier}, credits={request.credits}")
        
        return InitializeUserResponse(
            success=True,
            message=f"User initialized successfully with {request.tier} tier and {request.credits} credits",
            account_id=account_id,
            user_id=request.user_id,
            tier=request.tier,
            credits=request.credits
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

