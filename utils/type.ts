export interface Category {
	category_id: number;
	category_name: string;
	description?: string;
}

export interface Store {
	store_id: string;
	user_id: string;
	store_name: string;
	store_type: number;
	category_id: string;
	description: string;
	address: string;
	phone_number: string;
	website_url: string;
	image_url: string;
	business_number: string;
	owner_name: string;
	email: string;
	operating_hours: string;
	latitude: number;
	longitude: number;
	created_at: string;
	updated_at: string;
	categories?: {
		category_id: number;
		category_name: string;
	};
}