-- Add kiosk service options columns to stores table
ALTER TABLE IF EXISTS stores 
ADD COLUMN IF NOT EXISTS kiosk_dine_in_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kiosk_takeout_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kiosk_delivery_enabled BOOLEAN DEFAULT FALSE;

-- Add kiosk product management columns to products table
ALTER TABLE IF EXISTS products 
ADD COLUMN IF NOT EXISTS is_kiosk_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kiosk_order INTEGER;

-- Create index on kiosk_order for faster sorting
CREATE INDEX IF NOT EXISTS idx_products_kiosk_order ON products (kiosk_order);

-- Create index on store_id and is_kiosk_enabled for faster queries
CREATE INDEX IF NOT EXISTS idx_products_store_kiosk ON products (store_id, is_kiosk_enabled);

-- Comments for documentation
COMMENT ON COLUMN stores.kiosk_dine_in_enabled IS 'Whether dine-in option is enabled in kiosk';
COMMENT ON COLUMN stores.kiosk_takeout_enabled IS 'Whether takeout option is enabled in kiosk';
COMMENT ON COLUMN stores.kiosk_delivery_enabled IS 'Whether delivery option is enabled in kiosk';
COMMENT ON COLUMN products.is_kiosk_enabled IS 'Whether this product is enabled in kiosk';
COMMENT ON COLUMN products.kiosk_order IS 'The order of this product in kiosk'; 