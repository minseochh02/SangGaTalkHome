"use client";

import { useState, useEffect } from "react";
import { Category, Store } from "@/utils/type";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

export default function CategoriesStoresContent() {
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
	const [categories, setCategories] = useState<Category[]>([]);
	const [stores, setStores] = useState<Store[]>([]);
	const [loading, setLoading] = useState(true);
	const [storesLoading, setStoresLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [storesError, setStoresError] = useState<string | null>(null);

	// Fetch categories
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				setLoading(true);
				const supabase = createClient();
				const { data, error } = await supabase
					.from("categories")
					.select("category_id, category_name, description")
					.order("category_name");

				if (error) {
					throw error;
				}

				setCategories(data || []);
			} catch (err) {
				console.error("Error fetching categories:", err);
				setError("카테고리를 불러오는 중 오류가 발생했습니다.");
			} finally {
				setLoading(false);
			}
		};

		fetchCategories();
	}, []);

	// Fetch stores with expanded fields
	useEffect(() => {
		const fetchStores = async () => {
			try {
				setStoresLoading(true);
				const supabase = createClient();

				// Build the query based on whether a category is selected
				let query = supabase.from("stores").select(
					`
						store_id,
						user_id,
						store_name, 
						store_type, 
						category_id, 
						description, 
						address,
						phone_number,
						website_url,
						image_url,
						business_number,
						owner_name,
						email,
						operating_hours,
						latitude,
						longitude,
						created_at,
						updated_at,
						categories:category_id(category_id, category_name)
						`
				);

				if (selectedCategory !== null) {
					query = query.eq("category_id", selectedCategory);
				}

				const { data: storesData, error } = await query.order("store_name");

				if (error) {
					throw error;
				}

				if (storesData) {
					// Type assertion to ensure the data matches our Store type
					setStores(storesData as unknown as Store[]);
				}
			} catch (err) {
				console.error("Error fetching stores:", err);
				setStoresError("스토어 정보를 불러오는 중 오류가 발생했습니다.");
			} finally {
				setStoresLoading(false);
			}
		};

		fetchStores();
	}, [selectedCategory]); // Re-fetch when selected category changes

	// Helper function to get store type text
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

	// The stores to display from the state
	const displayStores = stores;

	return (
		<div className="flex flex-col md:flex-row min-h-screen">
			{/* Mobile filter toggle */}
			<div className="md:hidden p-4 border-b">
				<button
					onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
					className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg"
				>
					<span>카테고리 필터</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={`transition-transform ${mobileFilterOpen ? "rotate-180" : ""}`}
					>
						<polyline points="6 9 12 15 18 9"></polyline>
					</svg>
				</button>
			</div>

			{/* Categories Sidebar */}
			<div
				className={`${mobileFilterOpen ? "block" : "hidden"} md:block w-full md:w-64 bg-gray-50 p-6 border-r shrink-0`}
			>
				<h2 className="text-lg font-bold mb-4">카테고리</h2>
				{loading ? (
					<div className="py-4 text-center">로딩 중...</div>
				) : error ? (
					<div className="py-4 text-center text-red-500">{error}</div>
				) : (
					<div className="flex flex-col gap-2">
						<button
							onClick={() => {
								setSelectedCategory(null);
								setMobileFilterOpen(false);
							}}
							className={`px-4 py-3 rounded-lg text-left ${
								selectedCategory === null
									? "bg-primary text-white"
									: "hover:bg-primary/10"
							}`}
						>
							전체
						</button>
						{categories.map((category) => (
							<button
								key={category.category_id}
								onClick={() => {
									setSelectedCategory(category.category_id);
									setMobileFilterOpen(false);
								}}
								className={`px-4 py-3 rounded-lg text-left ${
									selectedCategory === category.category_id
										? "bg-primary text-white"
										: "hover:bg-primary/10"
								}`}
							>
								{category.category_name}
							</button>
						))}
					</div>
				)}
			</div>

			{/* Main Content */}
			<div className="flex-1 p-4 md:p-8">
				{/* Stores Grid */}
				{storesLoading ? (
					<div className="py-8 text-center">스토어 정보를 불러오는 중...</div>
				) : storesError ? (
					<div className="py-8 text-center text-red-500">{storesError}</div>
				) : displayStores.length === 0 ? (
					<div className="py-8 text-center">
						해당 카테고리에 스토어이 없습니다.
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
						{displayStores.map((store) => (
							<div
								key={store.store_id}
								className="border border-primary/20 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-200 hover:border-primary/40 flex flex-col"
							>
								<div className="h-48 bg-white relative">
									{store.image_url ? (
										<img
											src={store.image_url}
											alt={store.store_name}
											className="w-full h-full object-contain"
										/>
									) : (
										<div className="absolute inset-0 flex items-center justify-center text-gray-400">
											Store Image
										</div>
									)}
									<div className="absolute top-3 right-3 bg-primary/80 text-white text-xs rounded-full px-2 py-1">
										{store.categories?.category_name || "카테고리 없음"}
									</div>
									<div className="absolute top-3 left-3 bg-black/60 text-white text-xs rounded-full px-2 py-1">
										{getStoreTypeText(store.store_type)}
									</div>
								</div>
								<div className="p-4 md:p-6 flex-1 flex flex-col">
									<h3 className="font-bold text-lg mb-2">{store.store_name}</h3>
									<p className="text-gray-600 text-sm mb-3 line-clamp-3 flex-grow">
										{store.description}
									</p>

									<div className="space-y-2 text-sm text-gray-600 mb-4">
										{store.address && (
											<div className="flex items-start gap-2">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													className="shrink-0 mt-0.5"
												>
													<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path>
													<circle cx="12" cy="10" r="3"></circle>
												</svg>
												<span>{store.address}</span>
											</div>
										)}

										{store.phone_number && (
											<div className="flex items-start gap-2">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="16"
													height="16"
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
											<div className="flex items-start gap-2">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													className="shrink-0 mt-0.5"
												>
													<circle cx="12" cy="12" r="10"></circle>
													<polyline points="12 6 12 12 16 14"></polyline>
												</svg>
												<span>{store.operating_hours}</span>
											</div>
										)}

										{store.website_url && (
											<div className="flex items-start gap-2">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="16"
													height="16"
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
													className="text-primary hover:underline"
													target="_blank"
													rel="noopener noreferrer"
												>
													웹사이트 방문
												</a>
											</div>
										)}
									</div>

									<div className="mt-auto">
										<Link
											href={`/stores/${store.store_id}`}
											className="w-full px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors duration-200 text-base font-medium flex items-center justify-center gap-2"
										>
											자세히 보기
											<span className="text-lg">→</span>
										</Link>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
