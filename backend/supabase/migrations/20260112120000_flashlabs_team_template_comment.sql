BEGIN;

-- Update user-facing comment only (no schema/identifier changes).
-- Keep internal identifiers (e.g., is_kortix_team) unchanged for compatibility.

COMMENT ON COLUMN agent_templates.is_kortix_team IS
'Indicates if this template is created by the Flashlabs team (official templates)';

COMMIT;

