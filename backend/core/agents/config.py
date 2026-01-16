"""
Agent configuration loading utilities.
"""

import time
from typing import Optional, Dict, Any

from core.utils.logger import logger


async def load_agent_config(
    agent_id: Optional[str], 
    account_id: Optional[str], 
    user_id: Optional[str] = None,
    client = None,  # Kept for backward compatibility but not used for DB queries
    is_new_thread: bool = False
) -> Optional[Dict[str, Any]]:
    """Load agent configuration from cache or database."""
    from core.agents import repo as agents_repo
    
    t = time.time()
    logger.info(f"⏱️ [AGENT CONFIG] Starting load_agent_config for agent_id={agent_id}")
    user_id = user_id or account_id
    
    try:
        # Handle default agent loading (agent_id is None)
        if not agent_id:
            logger.debug(f"[AGENT LOAD] Loading default agent")
            
            if is_new_thread:
                from core.utils.ensure_suna import ensure_suna_installed
                await ensure_suna_installed(account_id)
            
            from core.agents.agent_loader import get_agent_loader
            loader = await get_agent_loader()
            
            # Use repo for direct SQL query
            default_agent_id = await agents_repo.get_default_agent_id(account_id)
            
            if default_agent_id:
                agent_data = await loader.load_agent(default_agent_id, user_id, load_config=True)
                logger.debug(f"Using default agent: {agent_data.name} ({agent_data.agent_id}) version {agent_data.version_name}")
                return agent_data.to_dict()
            else:
                logger.warning(f"[AGENT LOAD] No default agent found for account {account_id}, searching for shared SuperAgent")
                agent_data = await _find_shared_suna_agent()
                
                if not agent_data:
                    # Fallback to any agent
                    any_agent_id = await agents_repo.get_any_agent_id(account_id)
                    
                    if any_agent_id:
                        agent_data = await loader.load_agent(any_agent_id, user_id, load_config=True)
                        logger.info(f"[AGENT LOAD] Using fallback agent: {agent_data.name} ({agent_data.agent_id})")
                        return agent_data.to_dict()
                    else:
                        logger.error(f"[AGENT LOAD] No agents found for account {account_id}")
                        from fastapi import HTTPException
                        raise HTTPException(status_code=404, detail="No agents available. Please create an agent first.")
                return agent_data.to_dict()
        
        # Handle specific agent loading
        from core.cache.runtime_cache import (
            get_static_suna_config, 
            get_cached_user_mcps,
            get_cached_agent_config,
            set_cached_agent_config
        )
        from core.versioning import repo as versioning_repo
        
        # Step 1: Query latest version of the agent
        logger.debug(f"[AGENT CONFIG] Querying latest version for agent {agent_id}")
        t_version = time.time()
        
        latest_version = await versioning_repo.get_latest_agent_version(agent_id)
        
        if not latest_version:
            logger.warning(f"[AGENT CONFIG] No versions found for agent {agent_id}")
            return None
        
        version_id = latest_version['version_id']
        version_number = latest_version['version_number']
        
        logger.debug(f"[AGENT CONFIG] Latest version for agent {agent_id}: v{version_number} ({version_id}) - query took {(time.time() - t_version) * 1000:.1f}ms")
        
        # Step 2: Check if this is version 1 (use static config)
        if version_number == 1:
            logger.debug(f"[AGENT CONFIG] Using static config for version 1")
            static_config = get_static_suna_config()
            cached_mcps = await get_cached_user_mcps(agent_id)
            
            if static_config and cached_mcps is not None:
                agent_config = {
                    'agent_id': agent_id,
                    'system_prompt': static_config['system_prompt'],
                    'model': static_config['model'],
                    'agentpress_tools': static_config['agentpress_tools'],
                    'centrally_managed': static_config['centrally_managed'],
                    'is_suna_default': static_config['is_suna_default'],
                    'restrictions': static_config['restrictions'],
                    'configured_mcps': cached_mcps.get('configured_mcps', []),
                    'custom_mcps': cached_mcps.get('custom_mcps', []),
                    'triggers': cached_mcps.get('triggers', []),
                    'version_id': version_id,
                    'version_number': version_number,
                }
                logger.info(f"⏱️ [AGENT CONFIG] static config + Redis MCPs (v1): {(time.time() - t) * 1000:.1f}ms (CACHE HIT)")
            else:
                # Fallback for version 1 without static config
                logger.debug(f"[AGENT CONFIG] Static config not available for v1, loading from DB")
                t_db = time.time()
                from core.agents.agent_loader import get_agent_loader
                loader = await get_agent_loader()
                user_id_for_load = account_id or user_id or agent_id
                agent_data = await loader.load_agent(agent_id, user_id_for_load, load_config=True)
                agent_config = agent_data.to_dict()
                logger.info(f"⏱️ [AGENT CONFIG] DB load (v1 fallback): {(time.time() - t_db) * 1000:.1f}ms")
        else:
            # Step 3: For version > 1, use version-specific cache
            logger.debug(f"[AGENT CONFIG] Using version-specific cache for v{version_number}")
            t_cache = time.time()
            cached_config = await get_cached_agent_config(agent_id, version_id)
            
            if cached_config:
                agent_config = cached_config
                logger.info(f"⏱️ [AGENT CONFIG] version-specific cache hit (v{version_number}): {(time.time() - t_cache) * 1000:.1f}ms (CACHE HIT)")
            else:
                # Step 4: Cache miss - load from DB and auto-cache
                logger.info(f"⏱️ [AGENT CONFIG] Cache miss for v{version_number}, loading from DB and caching...")
                t_db = time.time()
                from core.agents.agent_loader import get_agent_loader
                loader = await get_agent_loader()
                user_id_for_load = account_id or user_id or agent_id
                agent_data = await loader.load_agent(agent_id, user_id_for_load, load_config=True)
                agent_config = agent_data.to_dict()
                
                # Auto-cache the loaded config with version-specific key
                try:
                    await set_cached_agent_config(agent_id, agent_config, version_id)
                    logger.debug(f"[AGENT CONFIG] Auto-cached config for agent {agent_id} v{version_number}")
                except Exception as cache_error:
                    logger.warning(f"[AGENT CONFIG] Failed to auto-cache config: {cache_error}")
                
                logger.info(f"⏱️ [AGENT CONFIG] DB load + auto-cache (v{version_number}): {(time.time() - t_db) * 1000:.1f}ms (CACHE MISS)")
        
        if agent_config:
            logger.debug(f"Using agent {agent_config.get('agent_id')} for this agent run")
        
        return agent_config
    except Exception as e:
        logger.warning(f"Failed to fetch agent config for {agent_id}: {e}")
        return None


async def _find_shared_suna_agent():
    """Find shared SuperAgent agent (helper for default agent loading)."""
    from core.agents.agent_loader import get_agent_loader
    from core.utils.config import config
    from core.agents import repo as agents_repo
    
    admin_user_id = config.SYSTEM_ADMIN_USER_ID
    
    # Use repo for direct SQL query
    shared_agent = await agents_repo.get_shared_suna_agent(admin_user_id)
    
    if shared_agent:
        loader = await get_agent_loader()
        agent_data = await loader.load_agent(
            shared_agent['agent_id'], 
            shared_agent['account_id'], 
            load_config=True
        )
        if admin_user_id and shared_agent['account_id'] == admin_user_id:
            logger.info(f"✅ Using system SuperAgent agent from admin user: {agent_data.name} ({agent_data.agent_id})")
        else:
            logger.info(f"Using shared SuperAgent agent: {agent_data.name} ({agent_data.agent_id})")
        return agent_data
    
    if admin_user_id:
        logger.warning(f"⚠️ SYSTEM_ADMIN_USER_ID configured but no SuperAgent agent found for user {admin_user_id}")
    
    logger.error("❌ No SuperAgent agent found! Set SYSTEM_ADMIN_USER_ID in .env")
    return None
