-- Maintenance functions for kiosk sessions

-- Function to mark expired or inactive sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_kiosk_sessions()
RETURNS void AS $$
BEGIN
  -- Mark sessions as expired if they have passed their expiry time
  UPDATE kiosk_sessions
  SET status = 'expired'
  WHERE 
    status = 'active' 
    AND expired_at < NOW();
  
  -- Mark sessions as expired if they haven't had activity in 2 hours
  -- (This is a safety net in case the expired_at time wasn't updated properly)
  UPDATE kiosk_sessions
  SET status = 'expired'
  WHERE 
    status = 'active' 
    AND last_active_at < (NOW() - INTERVAL '2 hours');
    
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up inactive kiosk sessions at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a view to show the current active sessions with store names
CREATE OR REPLACE VIEW active_kiosk_sessions_view AS
SELECT 
  ks.kiosk_session_id,
  ks.store_id,
  ks.device_number,
  ks.created_at,
  ks.last_active_at,
  ks.expired_at,
  ks.status,
  s.store_name
FROM 
  kiosk_sessions ks
  JOIN stores s ON ks.store_id = s.store_id
WHERE 
  ks.status = 'active'
ORDER BY 
  s.store_name, 
  ks.device_number;

-- To call this function from a scheduled task or manually:
-- SELECT cleanup_inactive_kiosk_sessions();

COMMENT ON FUNCTION cleanup_inactive_kiosk_sessions() IS 'Automatically marks expired or inactive kiosk sessions as expired'; 