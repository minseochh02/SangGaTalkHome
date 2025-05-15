-- Add device_number column to kiosk_orders if it doesn't exist
ALTER TABLE IF EXISTS kiosk_orders 
ADD COLUMN IF NOT EXISTS device_number INTEGER;

-- Add column comment
COMMENT ON COLUMN kiosk_orders.device_number IS 'The kiosk device number from which the order was placed';

-- Create an index on device_number for faster queries
CREATE INDEX IF NOT EXISTS idx_kiosk_orders_device_number ON kiosk_orders(device_number); 