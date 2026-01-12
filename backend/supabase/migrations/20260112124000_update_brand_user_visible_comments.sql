BEGIN;

-- Update user-facing text only (no schema/identifier changes).
-- Keep internal identifiers (e.g., is_suna_default, RPC names, routes) unchanged for compatibility.

COMMENT ON COLUMN public.agents.metadata IS 'Stores additional agent metadata including:
- is_suna_default: boolean - Whether this is the official SuperAgent default agent
- centrally_managed: boolean - Whether this agent is managed centrally by SuperAgent
- management_version: string - Version identifier for central management
- restrictions: object - What editing restrictions apply to this agent
- installation_date: timestamp - When this agent was installed
- last_central_update: timestamp - Last time centrally managed updates were applied';

COMMENT ON FUNCTION public.trigger_welcome_email() IS
'Triggers a webhook to the backend when a new user is created. The webhook handles account initialization (free tier + SuperAgent agent) and welcome email. Endpoint: /v1/webhooks/user-created';

COMMIT;

