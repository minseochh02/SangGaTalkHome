-- Create table for global option groups at the store level
CREATE TABLE IF NOT EXISTS store_option_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for choices within global option groups
CREATE TABLE IF NOT EXISTS store_option_choices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES store_option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  price_impact INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for linking products to global option groups
CREATE TABLE IF NOT EXISTS product_global_option_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  store_option_group_id UUID NOT NULL REFERENCES store_option_groups(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure a product can't be linked to the same option group multiple times
  UNIQUE(product_id, store_option_group_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_store_option_groups_store_id ON store_option_groups(store_id);
CREATE INDEX IF NOT EXISTS idx_store_option_choices_group_id ON store_option_choices(group_id);
CREATE INDEX IF NOT EXISTS idx_product_global_option_links_product_id ON product_global_option_links(product_id);
CREATE INDEX IF NOT EXISTS idx_product_global_option_links_option_group_id ON product_global_option_links(store_option_group_id);
CREATE INDEX IF NOT EXISTS idx_product_global_option_links_store_id ON product_global_option_links(store_id); 