// 1. USERS
export interface User {
	user_id: string;
	username: string;
	email: string;
	role: string; // customer, store_owner, admin, super_admin
	created_at: string;
	updated_at: string;
}

// 1-1. STORE_APPLICATIONS
export interface StoreApplication {
	store_application_id: string;
	user_id: string;
	business_name: string;
	owner_name: string;
	business_number: string;
	phone_number: string;
	email: string;
	address: string;
	category_id: string;
	description: string;
	operating_hours: string;
	website: string;
	status: number; // 0: pending, 1: approved, 2: rejected
	created_at: string;
	updated_at: string;
	referrer_phone_number: string;
	image_url?: string;
	location: string; // geography(Point,4326) format
	latitude: number;
	longitude: number;
	type?: number; // 0: online_only, 1: offline_only, 2: both
}

// 1-2. STORES
export interface Store {
	store_id: string;
	user_id: string;
	category_id: string;
	store_name: string;
	store_type: number; // 0: online_only, 1: offline_only, 2: both
	description: string;
	markdown_content?: string;
	address: string;
	phone_number: string;
	website_url: string;
	image_url: string;
	business_number: string;
	owner_name: string;
	email: string;
	operating_hours: string;
	store_wallet_address: string; 
	kiosk_key?: string; // Encrypted hash key for kiosk access
	kiosk_dine_in_enabled?: boolean; // Whether dine-in option is enabled in kiosk
	kiosk_takeout_enabled?: boolean; // Whether takeout option is enabled in kiosk
	kiosk_delivery_enabled?: boolean; // Whether delivery option is enabled in kiosk
	// store_order_sheet_id: string; NOT YET IMPLEMENTED
	location: string; // geography(Point,4326) format
	latitude: number;
	longitude: number;
	created_at: string;
	updated_at: string;
	deleted_at?: string;
	referrer_phone_number?: string;
	categories?: {
		category_id: string;
		category_name: string;
	};
}

// 1-2-1. PRODUCTS
export interface Product {
	product_id: string;
	product_name: string;
	description: string | null;
	won_price: number;
	sgt_price: number | null;
	sgt_price_text?: string;
	category_id: string | null;
	image_url: string | null;
	store_id: string;
	is_sgt_product: boolean;
	won_delivery_fee: number;
	won_special_delivery_fee: number;
	sgt_delivery_fee: number;
	sgt_special_delivery_fee: number;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	status: number; // 0: active, 1: not_active, 2: soft_delete
	markdown_content?: string | null;
	is_kiosk_enabled?: boolean; // Whether this product is enabled in kiosk
	kiosk_order?: number; // The order of this product in kiosk
	is_sold_out?: boolean; // Indicates if the product is sold out
}

// 1-2-2. ORDERS
export interface Order {
	order_id: string;
	wallet_id: string;
	sgt_total: number;
	won_total: number;
	sgt_shipping_cost: number;
	won_shipping_cost: number;
	shipping_address: string;
	recipient_name?: string;
	phone_number?: string;
	status: number; // 0: pending, 1: completed, 2: other statuses
	created_at: string;
	updated_at: string;
}

// 1-2-2-1. ORDER_ITEMS
export interface OrderItem {
	order_items_id: string;
	order_id: string;
	product_id: string;
	quantity: number;
	won_price: number;
	sgt_price: number;
	created_at: string;
}

// 1-2-3. COUPONS
export interface Coupon {
	coupon_id: string;
	store_id: string;
	name: string;
	description?: string;
	warning?: string;
	created_at: string;
	expiry_date: string;
	radius_meters: number;
	is_active: boolean;
	max_claims?: number;
}

export interface CouponFormData {
  name: string;
  description: string;
  warning: string;
  expiry_date: string;
  radius_meters: number;
  max_claims: number | null;
  is_active: boolean;
}

// 2. DEVICES
export interface Device {
	device_id: string;
	// device_token: string; Shouldn't be visible to the public
	created_at: string;
	updated_at: string;
	location: string; // geography(Point,4326) format
}

// Below shouldnt be visible to the public
// // 2-1. FAVORITE_STORES
// export interface FavoriteStore {
// 	favorite_store_id: string;
// 	device_id: string;
// 	store_id: string;
// 	created_at: string;
// }

// // 2-2. SAVED_ADDRESSES
// export interface SavedAddress {
// 	saved_address_id: string;
// 	device_id: string;
// 	nickname?: string;
// 	address: string;
// 	is_default: boolean;
// 	address_detail?: string;
// 	recipient_name?: string;
// 	phone_number?: string;
// 	created_at: string;
// }

// // 2-3. CART_ITEMS
// export interface CartItem {
// 	cart_item_id: string;
// 	wallet_id: string;
// 	product_id: string;
// 	quantity: number;
// 	created_at: string;
// }

// 3. WALLETS
export interface Wallet {
	wallet_id: string;
	created_at: string;
	wallet_address: string;
	nfc_id?: string;
	wallet_name: string;
	balance: number;
}

// 3-1. TRANSACTIONS
export interface Transaction {
	transaction_id: string;
	amount: number;
	created_at: string;
	receiver_wallet_address: string;
	sender_wallet_address?: string;
	status: number;
	completed_at?: string;
	notes?: string;
	transaction_fee?: number;
	location?: string; // geography(Point,4326) format
	type: number; // 0: offline, 1: online, 2: sgt_exchange_out, 3: sgt_exchange_in, 4: sgt_TVL
}

// 3-2. DISTRIBUTED_COUPONS
export interface DistributedCoupon {
	distributed_coupon_id: string;
	coupon_id: string;
	wallet_id: string;
	device_id: string;
	status: number; // 0: pending, 1: accepted, 2: rejected
	created_at: string;
}

// 3-3. REVIEWS
export interface Review {
	review_id: string;
	wallet_id: string;
	order_id: string;
	store_id: string;
	rating: number; // 1-5
	review_text?: string;
	created_at: string;
}

//4. LIQUID_SUPPLIERS
export interface LiquidSupplier {
	liquid_supplier_id: string;
	wallet_id: string;
	bank_name: string;
	bank_account_no: string;
	registered_at: string;
}

// 4-1. POLICIES
export interface Policy {
	policy_id: string;
	liquid_supplier_id: string;
	rate: number;
	baseline_fee: number;
	title: string;
	content: string;
	created_at: string;
}

// 4-2. EXCHANGES
export interface Exchange {
	exchange_id: string;
	transaction_id: string;
	liquid_supplier_id: string;
	policy_id: string;
	sgt_amount: number;
	won_amount: number;
	supplier_fee: number;
	content?: string;
	status: number; // 0: pending, 1: sgt_sent, 2: payment_complete, 3: canceled
	created_at: string;
	receiver_wallet_address?: string;
}

// categories
export interface Category {
	category_id: string;
	category_name: string;
	description?: string;
	created_at: string;
	updated_at: string;
}

// notifications
export interface Notification {
	notification_id: string;
	device_id: string;
	created_at: string;
	message: string;
	topic?: string;
	title: string;
	body?: string;
	read: boolean;
	metadata?: any;
}

export interface FavoriteStore {
	favorite_store_id: string;
	device_id: string;
	store_id: string;
	created_at: string;
}

export interface SavedAddress {
	saved_address_id: string;
	device_id: string;
	nickname?: string;
	address: string;
	is_default: boolean;
	address_detail?: string;
	recipient_name?: string;
	phone_number?: string;
	created_at: string;
}

export interface CartItem {
	cart_item_id: string;
	wallet_id: string;
	product_id: string;
	quantity: number;
	created_at: string;
}

export interface Wallet {
	wallet_id: string;
	created_at: string;
	wallet_address: string;
	nfc_id?: string;
	wallet_name: string;
	balance: number;
}

export interface Transaction {
	transaction_id: string;
	amount: number;
	created_at: string;
	receiver_wallet_address: string;
	sender_wallet_address?: string;
	status: number;
	completed_at?: string;
	notes?: string;
	transaction_fee?: number;
	location?: string; // geography(Point,4326) format
	type: number; // 0: offline, 1: online, 2: sgt_exchange_out, 3: sgt_exchange_in, 4: sgt_TVL
}

export interface DistributedCoupon {
	distributed_coupon_id: string;
	coupon_id: string;
	wallet_id: string;
	device_id: string;
	status: number; // 0: pending, 1: accepted, 2: rejected
}

export interface Review {
	review_id: string;
	wallet_id: string;
	order_id: string;
	store_id: string;
	rating: number; // 1-5
	review_text?: string;
	created_at: string;
}

export interface LiquidSupplier {
	liquid_supplier_id: string;
	wallet_id: string;
	bank_name: string;
	bank_account_no: string;
	registered_at: string;
}

export interface Policy {
	policy_id: string;
	liquid_supplier_id: string;
	rate: number;
	baseline_fee: number;
	title: string;
	content: string;
	created_at: string;
}

export interface Exchange {
	exchange_id: string;
	transaction_id: string;
	liquid_supplier_id: string;
	policy_id: string;
	sgt_amount: number;
	won_amount: number;
	supplier_fee: number;
	content?: string;
	status: number; // 0: pending, 1: sgt_sent, 2: payment_complete, 3: canceled
	created_at: string;
	receiver_wallet_address?: string;
}

export interface Notification {
	notification_id: string;
	device_id: string;
	created_at: string;
	message: string;
	topic?: string;
	title: string;
	body?: string;
	read: boolean;
	metadata?: any;
}

export interface KioskOrder {
	kiosk_order_id: string; // UUID
	store_id: string; // UUID
	order_type: 'kiosk_dine_in' | 'kiosk_takeout' | 'kiosk_delivery';
	total_amount: number;
	status: 'completed' | 'pending_payment' | 'cancelled';
	created_at: string; // ISO date string
	user_id?: string; // UUID, optional
	notes?: string; // optional
	// Relations
	store?: Store;
	items?: KioskOrderItem[];
}

export interface KioskOrderItem {
	kiosk_order_item_id: string; // UUID
	kiosk_order_id: string; // UUID
	product_id: string; // UUID
	quantity: number;
	price_at_purchase: number;
	created_at: string; // ISO date string
	// Relations
	product?: Product;
	order?: KioskOrder;
}
