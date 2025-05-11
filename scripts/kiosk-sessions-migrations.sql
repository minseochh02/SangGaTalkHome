-- Kiosk Sessions Table Migration

-- Create kiosk_sessions table
CREATE TABLE IF NOT EXISTS kiosk_sessions (
  kiosk_session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  device_number INTEGER NOT NULL,
  device_identifier TEXT NOT NULL, -- Could be a device/browser fingerprint
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expired_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '4 hours'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disconnected'))
);

-- Create index on store_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_store_id ON kiosk_sessions(store_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_sessions_status ON kiosk_sessions(status);

-- Create a function to get next available device number for a store
CREATE OR REPLACE FUNCTION get_next_device_number(p_store_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Get the highest device number currently in use for this store
  SELECT COALESCE(MAX(device_number), 0) + 1 INTO next_number
  FROM kiosk_sessions
  WHERE store_id = p_store_id AND status = 'active';
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Add table comment
COMMENT ON TABLE kiosk_sessions IS 'Tracks active kiosk sessions and device information'; 