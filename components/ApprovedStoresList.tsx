import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Store } from "@/utils/type";

export default function ApprovedStoresList({ userId }: { userId: string }) {
	const [stores, setStores] = useState<Store[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchStores = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const supabase = createClient();
				// Fetch stores with category information
				const { data, error } = await supabase
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
					.eq("user_id", userId)
					.order("created_at", { ascending: false });

				if (error) throw error;
				setStores((data as unknown as Store[]) || []);
			} catch (err) {
				console.error("Error fetching approved stores:", err);
				setError("Failed to load approved stores");
			} finally {
				setIsLoading(false);
			}
		};

		if (userId) {
			fetchStores();
		}
	}, [userId]);

	const getStoreTypeText = (type: number) => {
		switch (type) {
			case 0:
				return "온라인 전용";
			case 1:
				return "오프라인 전용";
			case 2:
				return "온라인 & 오프라인";
			default:
				return "정보 없음";
		}
	};

	if (isLoading) {
		return <div className="text-center py-4">로딩 중...</div>;
	}

	if (error) {
		return <div className="text-center py-4 text-red-500">{error}</div>;
	}

	if (stores.length === 0) {
		return (
			<div className="text-center py-4 text-gray-500">
				승인된 스토어이 없습니다.
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
			{stores.map((store) => (
				<div
					key={store.store_id}
					className="border border-primary/20 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-200 hover:border-primary/40 flex flex-col"
				>
					<div className="aspect-[4/3] bg-gray-100 relative">
						{store.image_url ? (
							<img
								src={store.image_url}
								alt={store.store_name}
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="absolute inset-0 flex items-center justify-center text-gray-400">
								Store Image
							</div>
						)}
						<div className="absolute top-2 right-2 bg-primary/80 text-white text-xs rounded-full px-2 py-1">
							{store.categories?.category_name || "카테고리 없음"}
						</div>
						<div className="absolute top-2 left-2 bg-black/60 text-white text-xs rounded-full px-2 py-1">
							{getStoreTypeText(store.store_type)}
						</div>
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

							{store.operating_hours && (
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
										<circle cx="12" cy="12" r="10"></circle>
										<polyline points="12 6 12 12 16 14"></polyline>
									</svg>
									<span className="line-clamp-1">{store.operating_hours}</span>
								</div>
							)}

							{store.website_url && (
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
										<circle cx="12" cy="12" r="10"></circle>
										<line x1="2" y1="12" x2="22" y2="12"></line>
										<path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path>
									</svg>
									<a
										href={store.website_url}
										className="text-primary hover:underline line-clamp-1"
										target="_blank"
										rel="noopener noreferrer"
									>
										웹사이트 방문
									</a>
								</div>
							)}
						</div>

						<div className="mt-auto">
							<div className="flex gap-2 flex-col sm:flex-row">
								<Link
									href={`/stores/${store.store_id}`}
									className="flex-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors duration-200 text-sm sm:text-base font-medium flex items-center justify-center gap-1 sm:gap-2"
								>
									자세히 보기
									<span className="text-base sm:text-lg">→</span>
								</Link>
								<Link
									href={`/stores/edit/${store.store_id}`}
									className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200 text-sm sm:text-base font-medium flex items-center justify-center"
								>
									수정
								</Link>
							</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
