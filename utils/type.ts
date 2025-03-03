export interface Category {
	category_id: number;
	category_name: string;
	description?: string;
}

export interface Store {
	store_id: number;
	store_name: string;
	store_type: number;
	category_id: number;
	description: string;
	address: string;
	image_url: string;
}