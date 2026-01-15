-- AgentScope Compression Support
-- This migration adds support for AgentScope's memory compression mechanism

-- 1. Add is_compressed field to messages table
-- This marks messages that have been compressed (summarized) by AgentScope
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_compressed BOOLEAN DEFAULT FALSE;

-- Index for efficient filtering of non-compressed messages
-- Most queries will filter WHERE is_compressed = FALSE
CREATE INDEX IF NOT EXISTS idx_messages_thread_compressed 
ON messages(thread_id, is_compressed) 
WHERE is_compressed = FALSE;

-- 2. Create thread compression summaries table
-- Stores the LLM-generated summary for each thread
CREATE TABLE IF NOT EXISTS thread_compression_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(thread_id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    compressed_message_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Each thread has at most one summary (latest)
    CONSTRAINT thread_compression_summaries_thread_id_unique UNIQUE(thread_id)
);

-- Index for fast lookup by thread_id
CREATE INDEX IF NOT EXISTS idx_thread_compression_summaries_thread_id 
ON thread_compression_summaries(thread_id);

-- Trigger for updated_at
CREATE TRIGGER update_thread_compression_summaries_updated_at
    BEFORE UPDATE ON thread_compression_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Row Level Security for thread_compression_summaries
ALTER TABLE thread_compression_summaries ENABLE ROW LEVEL SECURITY;

-- Select policy: can view if has access to the thread
CREATE POLICY thread_compression_summaries_select_policy 
ON thread_compression_summaries
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM threads t
        LEFT JOIN projects p ON t.project_id = p.project_id
        WHERE t.thread_id = thread_compression_summaries.thread_id
        AND (
            p.is_public = TRUE OR
            basejump.has_role_on_account(t.account_id) = true OR 
            basejump.has_role_on_account(p.account_id) = true
        )
    )
);

-- Insert policy: can insert if has access to the thread
CREATE POLICY thread_compression_summaries_insert_policy 
ON thread_compression_summaries
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM threads t
        LEFT JOIN projects p ON t.project_id = p.project_id
        WHERE t.thread_id = thread_compression_summaries.thread_id
        AND (
            basejump.has_role_on_account(t.account_id) = true OR 
            basejump.has_role_on_account(p.account_id) = true
        )
    )
);

-- Update policy: can update if has access to the thread
CREATE POLICY thread_compression_summaries_update_policy 
ON thread_compression_summaries
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM threads t
        LEFT JOIN projects p ON t.project_id = p.project_id
        WHERE t.thread_id = thread_compression_summaries.thread_id
        AND (
            basejump.has_role_on_account(t.account_id) = true OR 
            basejump.has_role_on_account(p.account_id) = true
        )
    )
);

-- Delete policy: can delete if has access to the thread
CREATE POLICY thread_compression_summaries_delete_policy 
ON thread_compression_summaries
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM threads t
        LEFT JOIN projects p ON t.project_id = p.project_id
        WHERE t.thread_id = thread_compression_summaries.thread_id
        AND (
            basejump.has_role_on_account(t.account_id) = true OR 
            basejump.has_role_on_account(p.account_id) = true
        )
    )
);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE thread_compression_summaries TO authenticated, service_role;

-- Comment
COMMENT ON TABLE thread_compression_summaries IS 'Stores AgentScope memory compression summaries for each thread. When conversation exceeds token threshold, older messages are summarized and this summary is prepended to context.';
COMMENT ON COLUMN messages.is_compressed IS 'TRUE if this message has been compressed (summarized) by AgentScope and should be excluded from direct LLM context. Original content is preserved for expand_message tool.';

