-- Optimize get_llm_messages query performance
-- This migration adds a composite index specifically for the get_llm_messages function
-- which is called very frequently (every user request) and was causing performance issues
-- with threads containing 100-1000+ messages.

-- Problem Query (from backend/core/threads/repo.py lines 657-661):
-- SELECT message_id, type, content
-- FROM messages
-- WHERE thread_id = :thread_id AND is_llm_message = true
-- ORDER BY created_at ASC
-- LIMIT :limit

-- Solution: Create a composite index that matches the exact query pattern
-- Index column order optimized for:
-- 1. thread_id (highest selectivity - filters to specific thread)
-- 2. is_llm_message (boolean filter)
-- 3. created_at ASC (matches ORDER BY direction)
-- 4. Partial index WHERE clause reduces index size by ~50%

-- Note: CONCURRENTLY removed because Supabase migrations run in transaction blocks
-- For large tables in production, consider running this manually with CONCURRENTLY
CREATE INDEX IF NOT EXISTS idx_messages_thread_llm_created_asc 
ON messages(thread_id, is_llm_message, created_at ASC) 
WHERE is_llm_message = true;

-- This index will also benefit the non-lightweight version of get_llm_messages
-- which has additional metadata filtering but uses the same base conditions

-- Expected performance improvement:
-- - Query time: from seconds to milliseconds
-- - Reduced lock contention for concurrent queries
-- - Better scalability as message count grows

-- Index overhead:
-- - Storage: ~5-10% increase (acceptable for performance gain)
-- - Write performance: minimal impact on INSERT operations
-- - Memory: normal index memory usage