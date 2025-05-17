-- kiosk_orders table migration
-- Check if the table exists first
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kiosk_orders') THEN
        -- Create the kiosk_orders table if it doesn't already exist
        CREATE TABLE public.kiosk_orders (
            order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id UUID NOT NULL REFERENCES public.stores(store_id) ON DELETE CASCADE,
            kiosk_session_id UUID REFERENCES public.kiosk_sessions(kiosk_session_id) ON DELETE SET NULL,
            device_number INTEGER,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready_for_pickup', 'completed', 'cancelled')),
            total_amount NUMERIC(12, 2),
            payment_method TEXT,
            order_type TEXT CHECK (order_type IN ('dine_in', 'takeout', 'delivery')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            completed_at TIMESTAMPTZ
        );

        -- Optional: Add a basic index on store_id and status for common queries
        CREATE INDEX idx_kiosk_orders_store_status ON public.kiosk_orders(store_id, status);
        CREATE INDEX idx_kiosk_orders_session ON public.kiosk_orders(kiosk_session_id);

        -- Optional: Create an order_items table for order details
        CREATE TABLE public.kiosk_order_items (
            order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_id UUID NOT NULL REFERENCES public.kiosk_orders(order_id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES public.products(product_id) ON DELETE RESTRICT,
            quantity INTEGER NOT NULL CHECK (quantity > 0),
            unit_price NUMERIC(12, 2) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX idx_kiosk_order_items_order ON public.kiosk_order_items(order_id);

        -- Enable Row Level Security
        ALTER TABLE public.kiosk_orders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.kiosk_order_items ENABLE ROW LEVEL SECURITY;

        -- Create policies for kiosk_orders
        -- 1. Store owners can read/write/update/delete their own store's orders
        CREATE POLICY store_owner_all_access ON public.kiosk_orders 
            FOR ALL 
            TO authenticated
            USING (
                store_id IN (
                    SELECT store_id FROM public.stores 
                    WHERE user_id = auth.uid()
                )
            );

        -- 2. Anonymous can read orders for a specific store
        CREATE POLICY anon_read_store_orders ON public.kiosk_orders
            FOR SELECT 
            TO anon
            USING (true);  -- Simplified for example - you might want to restrict this further

        -- Create policies for kiosk_order_items
        -- 1. Store owners can read/write/update/delete their own store's order items
        CREATE POLICY store_owner_all_access ON public.kiosk_order_items 
            FOR ALL 
            TO authenticated
            USING (
                order_id IN (
                    SELECT order_id FROM public.kiosk_orders
                    WHERE store_id IN (
                        SELECT store_id FROM public.stores 
                        WHERE user_id = auth.uid()
                    )
                )
            );

        -- 2. Anonymous can read order items
        CREATE POLICY anon_read_order_items ON public.kiosk_order_items
            FOR SELECT 
            TO anon
            USING (true);  -- Simplified for example

        -- Create a function to set updated_at to NOW() on update
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Set trigger for updating updated_at
        CREATE TRIGGER set_kiosk_orders_updated_at
        BEFORE UPDATE ON public.kiosk_orders
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();

        -- Add a trigger to set completed_at when status changes to 'ready_for_pickup' or 'completed'
        CREATE OR REPLACE FUNCTION set_completed_at()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.status IN ('ready_for_pickup', 'completed') AND OLD.status NOT IN ('ready_for_pickup', 'completed') THEN
                NEW.completed_at = NOW();
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER set_kiosk_orders_completed_at
        BEFORE UPDATE ON public.kiosk_orders
        FOR EACH ROW
        EXECUTE FUNCTION set_completed_at();

    ELSE
        -- If the table exists, check if device_number column exists and add it if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'kiosk_orders' 
            AND column_name = 'device_number'
        ) THEN
            ALTER TABLE public.kiosk_orders ADD COLUMN device_number INTEGER;
        END IF;

        -- Check if 'ready_for_pickup' is a valid status in the check constraint
        -- This is harder to modify programmatically - might need manual DB update if needed
        RAISE NOTICE 'IMPORTANT: Ensure the CHECK constraint on kiosk_orders.status includes ''ready_for_pickup'' as a valid value.';
    END IF;
END
$$; 