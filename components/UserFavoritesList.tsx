import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ImagePlaceholder from "@/components/ImagePlaceholder";

interface FavoriteItem {
	favorite_id: string;
	favorite_type: string;
	target_id: string;
	user_id: string;
	created_at: string;
}

interface Category {
	category_id: number;
	category_name: string;
}

interface StoreData {
	store_id: string;
	store_name: string;
	store_type?: number;
	description?: string;
	address?: string;
	phone_number?: string;
	website_url?: string;
	image_url?: string;
	operating_hours?: string;
	created_at: string;
	categories?: any; // Using any to avoid type issues
}

interface FavoriteStore extends StoreData {
	favorite_id: string;
}

export default function UserFavoritesList({ userId }: { userId: string }) {
	const [favorites, setFavorites] = useState<FavoriteStore[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchFavorites = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const supabase = createClient();

				// First get all favorites of type 'store' for this user
				const { data: favoritesData, error: favoritesError } = await supabase
					.from("favorites")
					.select("*")
					.eq("user_id", userId)
					.eq("favorite_type", "store");

				if (favoritesError) throw favoritesError;

				if (!favoritesData || favoritesData.length === 0) {
					setFavorites([]);
					return;
				}

				// Get all the store details for the favorited stores
				const storeIds = favoritesData.map(
					(fav: FavoriteItem) => fav.target_id
				);

				const { data: storesData, error: storesError } = await supabase
					.from("stores")
					.select(
						`
            store_id, 
            store_name, 
            store_type, 
            description, 
            address, 
            phone_number,
            website_url,
            image_url, 
            operating_hours,
            created_at,
            categories:category_id(category_id, category_name)
          `
					)
					.in("store_id", storeIds);

				if (storesError) throw storesError;

				// Combine the favorites data with the store data
				const combinedData: FavoriteStore[] = [];

				for (const store of storesData) {
					const favorite = favoritesData.find(
						(fav: FavoriteItem) => fav.target_id === store.store_id
					);
					if (favorite) {
						combinedData.push({
							store_id: store.store_id,
							store_name: store.store_name,
							store_type: store.store_type,
							description: store.description,
							address: store.address,
							phone_number: store.phone_number,
							website_url: store.website_url,
							image_url: store.image_url,
							operating_hours: store.operating_hours,
							created_at: favorite.created_at || store.created_at,
							categories: store.categories,
							favorite_id: favorite.favorite_id,
						});
					}
				}

				setFavorites(combinedData);
			} catch (err) {
				console.error("Error fetching favorite stores:", err);
				setError("즐겨찾기 스토어을 불러오는데 실패했습니다.");
			} finally {
				setIsLoading(false);
			}
		};

		if (userId) {
			fetchFavorites();
		}
	}, [userId]);

	const removeFavorite = async (favoriteId: string) => {
		try {
			const supabase = createClient();
			const { error } = await supabase
				.from("favorites")
				.delete()
				.eq("favorite_id", favoriteId);

			if (error) throw error;

			// Update the local state to remove the deleted favorite
			setFavorites(favorites.filter((fav) => fav.favorite_id !== favoriteId));
		} catch (err) {
			console.error("Error removing favorite:", err);
			setError("즐겨찾기 삭제에 실패했습니다.");
		}
	};

	if (isLoading) {
		return <div className="text-center py-4">로딩 중...</div>;
	}

	if (error) {
		return <div className="text-center py-4 text-red-500">{error}</div>;
	}

	if (favorites.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				즐겨찾기한 스토어가 없습니다.
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-4 sm:gap-6">
			{favorites.map((store) => (
				<div
					key={store.store_id}
					className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col sm:flex-row border border-gray-100"
				>
					<div className="relative h-40 sm:h-auto sm:w-44 sm:min-w-44">
						<ImagePlaceholder
							src={store.image_url}
							alt={store.store_name}
							fill
							objectFit="cover"
						/>
					</div>

					<div className="p-3 sm:p-4 md:p-6 flex-1 flex flex-col">
						<h3 className="font-bold text-base sm:text-lg mb-2">
							{store.store_name}
						</h3>
						<p className="text-gray-600 text-xs sm:text-sm mb-3 flex-grow line-clamp-3">
							{store.description}
						</p>

						<div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
							{store.address && (
								<div className="flex items-start gap-1 sm:gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										className="shrink-0 mt-0.5"
									>
										<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
										<circle cx="12" cy="10" r="3"></circle>
									</svg>
									<span className="line-clamp-1">{store.address}</span>
								</div>
							)}

							{store.phone_number && (
								<div className="flex items-start gap-1 sm:gap-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										className="shrink-0 mt-0.5"
									>
										<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
									</svg>
									<span>{store.phone_number}</span>
								</div>
							)}
						</div>

						<div className="flex flex-wrap gap-2 mt-auto">
							<Link
								href={`/stores/${store.store_id}`}
								className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-white rounded-md text-xs sm:text-sm hover:bg-primary/90 transition-colors"
							>
								스토어 보기
							</Link>
							<button
								onClick={() => removeFavorite(store.favorite_id)}
								className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-50 text-red-600 rounded-md text-xs sm:text-sm hover:bg-red-100 transition-colors flex items-center gap-1"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									className="shrink-0"
								>
									<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
								</svg>
								즐겨찾기 삭제
							</button>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
