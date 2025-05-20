-- Kiosk Order Item Options Table Migration

-- Create kiosk_order_item_options table
CREATE TABLE IF NOT EXISTS kiosk_order_item_options (
  option_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kiosk_order_item_id UUID NOT NULL REFERENCES kiosk_order_items(kiosk_order_item_id) ON DELETE CASCADE,
  option_group_id UUID NOT NULL, -- Store the original option group ID
  option_group_name TEXT NOT NULL, -- Store the name for display purposes
  option_choice_id UUID NOT NULL, -- Store the original option choice ID
  option_choice_name TEXT NOT NULL, -- Store the name for display purposes
  price_impact NUMERIC NOT NULL DEFAULT 0, -- Store the price impact at time of purchase
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on kiosk_order_item_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_kiosk_order_item_options_item_id ON kiosk_order_item_options(kiosk_order_item_id);

-- Add table comment
COMMENT ON TABLE kiosk_order_item_options IS 'Stores option selections for kiosk order items';
COMMENT ON COLUMN kiosk_order_item_options.option_group_id IS 'Reference to the original option group';
COMMENT ON COLUMN kiosk_order_item_options.option_group_name IS 'Name of the option group at time of purchase';
COMMENT ON COLUMN kiosk_order_item_options.option_choice_id IS 'Reference to the original option choice';
COMMENT ON COLUMN kiosk_order_item_options.option_choice_name IS 'Name of the option choice at time of purchase';
COMMENT ON COLUMN kiosk_order_item_options.price_impact IS 'Price impact of the option at time of purchase'; 