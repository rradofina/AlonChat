-- Enable realtime for agents table to support training status updates
-- This ensures that the training progress indicator and status updates work in real-time

-- Set replica identity to FULL for the agents table
-- This is required for Supabase Realtime to track changes
ALTER TABLE agents REPLICA IDENTITY FULL;

-- Note: Realtime needs to be enabled in the Supabase dashboard
-- Go to Database > Replication and enable realtime for the agents table