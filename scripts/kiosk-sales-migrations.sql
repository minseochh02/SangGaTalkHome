-- Kiosk Orders and Order Items Tables Migration

-- Create kiosk_orders table
CREATE TABLE IF NOT EXISTS kiosk_orders (
  kiosk_order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  order_type TEXT NOT NULL CHECK (order_type IN ('kiosk_dine_in', 'kiosk_takeout', 'kiosk_delivery')),
  total_amount NUMERIC NOT NULL,
  device_number INTEGER,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending_payment', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES users(user_id),
  notes TEXT
);

-- Create index on store_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_kiosk_orders_store_id ON kiosk_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_orders_created_at ON kiosk_orders(created_at DESC);

-- Add table comment
COMMENT ON TABLE kiosk_orders IS 'Stores orders made through the kiosk feature';
COMMENT ON COLUMN kiosk_orders.device_number IS 'The kiosk device number from which the order was placed';

-- Create kiosk_order_items table
CREATE TABLE IF NOT EXISTS kiosk_order_items (
  kiosk_order_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kiosk_order_id UUID NOT NULL REFERENCES kiosk_orders(kiosk_order_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_kiosk_order_items_kiosk_order_id ON kiosk_order_items(kiosk_order_id);
CREATE INDEX IF NOT EXISTS idx_kiosk_order_items_product_id ON kiosk_order_items(product_id);

-- Add table comment
COMMENT ON TABLE kiosk_order_items IS 'Stores individual items for kiosk orders'; 