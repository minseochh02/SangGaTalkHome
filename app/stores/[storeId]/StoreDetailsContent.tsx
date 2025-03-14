"use client";

import { useState, useEffect } from "react";
import { Store, Product } from "@/utils/type";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function StoreDetailsContent({ storeId }: { storeId: string }) {
	const [store, setStore] = useState<Store | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isOwner, setIsOwner] = useState(false);
	const [products, setProducts] = useState<Product[]>([]);
	const [loadingProducts, setLoadingProducts] = useState(true);
	const { user } = useAuth();

	useEffect(() => {
		const fetchStoreDetails = async () => {
			try {
				setLoading(true);
				const supabase = createClient();

				const { data, error } = await supabase
					.from("stores")
					.select(
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
					)
					.eq("store_id", storeId)
					.single();

				if (error) {
					throw error;
				}

				setStore(data as unknown as Store);

				// Check if current user is the owner
				if (user && data.user_id === user.id) {
					setIsOwner(true);
				}
			} catch (err) {
				console.error("Error fetching store details:", err);
				setError("매장 정보를 불러오는 중 오류가 발생했습니다.");
			} finally {
				setLoading(false);
			}
		};

		const fetchStoreProducts = async () => {
			try {
				setLoadingProducts(true);
				const supabase = createClient();

				// Fetch only active products (status = 1)
				const { data, error } = await supabase
					.from("products")
					.select("*")
					.eq("store_id", storeId)
					.eq("status", 1)
					.order("created_at", { ascending: false });

				if (error) {
					throw error;
				}

				setProducts(data as Product[]);
			} catch (err) {
				console.error("Error fetching store products:", err);
				// We don't set the main error state here to avoid blocking the whole page
			} finally {
				setLoadingProducts(false);
			}
		};

		if (storeId) {
			fetchStoreDetails();
			fetchStoreProducts();
		}
	}, [storeId, user]);

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

	if (loading) {
		return (
			<div className="container mx-auto py-16 px-4">
				<div className="flex justify-center items-center min-h-[50vh]">
					<div className="text-center">
						<div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p className="text-lg">매장 정보를 불러오는 중...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error || !store) {
		return (
			<div className="container mx-auto py-16 px-4">
				<div className="flex justify-center items-center min-h-[50vh]">
					<div className="text-center">
						<div className="text-5xl mb-4">😕</div>
						<h2 className="text-2xl font-bold mb-2">
							매장 정보를 찾을 수 없습니다
						</h2>
						<p className="text-gray-600 mb-6">
							{error || "요청하신 매장 정보가 존재하지 않습니다."}
						</p>
						<Link
							href="/stores/categories"
							className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
						>
							매장 목록으로 돌아가기
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 px-4 md:py-12">
			{/* Back button */}
			<div className="mb-6">
				<Link
					href="/stores/categories"
					className="inline-flex items-center text-primary hover:underline"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						className="mr-2"
					>
						<path d="M19 12H5M12 19l-7-7 7-7" />
					</svg>
					매장 목록으로 돌아가기
				</Link>
			</div>

			{/* Store Header */}
			<div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
				<div className="relative h-64 md:h-96 bg-gray-100">
					{store.image_url ? (
						<div className="relative w-full h-full">
							<img
								src={store.image_url}
								alt={store.store_name}
								className="w-full h-full object-cover"
							/>
						</div>
					) : (
						<div className="flex items-center justify-center h-full text-gray-400">
							<div className="text-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="64"
									height="64"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									className="mx-auto mb-2"
								>
									<rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
									<circle cx="9" cy="9" r="2"></circle>
									<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
								</svg>
								<p>매장 이미지 없음</p>
							</div>
						</div>
					)}

					<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
						<div className="flex items-center gap-3 mb-2">
							<span className="bg-primary text-white text-sm px-3 py-1 rounded-full">
								{store.categories?.category_name || "카테고리 없음"}
							</span>
							<span className="bg-black/60 text-white text-sm px-3 py-1 rounded-full">
								{getStoreTypeText(store.store_type)}
							</span>
						</div>
						<h1 className="text-3xl md:text-4xl font-bold text-white">
							{store.store_name}
						</h1>
					</div>
				</div>
			</div>

			{/* Store Details */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Left Column - Main Info */}
				<div className="lg:col-span-2 space-y-8">
					{/* Description */}
					<div className="bg-white rounded-xl shadow-md p-6">
						<h2 className="text-xl font-bold mb-4 flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								className="mr-2 text-primary"
							>
								<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"></path>
								<path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path>
							</svg>
							매장 소개
						</h2>
						<p className="text-gray-700 whitespace-pre-line">
							{store.description || "매장 소개 정보가 없습니다."}
						</p>
					</div>

					{/* Products Section */}
					<div
						id="products-section"
						className="bg-white rounded-xl shadow-md p-6"
					>
						<h2 className="text-xl font-bold mb-4 flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								className="mr-2 text-primary"
							>
								<path d="M20.91 8.84 8.56 21.18a4.18 4.18 0 0 1-5.91 0 4.18 4.18 0 0 1 0-5.91L14.99 2.92a2.79 2.79 0 0 1 3.94 0 2.79 2.79 0 0 1 0 3.94L7.67 18.12a1.4 1.4 0 0 1-1.97 0 1.4 1.4 0 0 1 0-1.97L16.23 5.6"></path>
							</svg>
							상품 목록
						</h2>

						{loadingProducts ? (
							<div className="flex justify-center items-center py-8">
								<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
							</div>
						) : products.length === 0 ? (
							<div className="text-center py-8">
								<p className="text-muted-foreground">등록된 상품이 없습니다.</p>
							</div>
						) : (
							<>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
									{products.slice(0, 4).map((product) => (
										<div
											key={product.product_id}
											className="border rounded-lg overflow-hidden flex flex-col"
										>
											<div className="aspect-video w-full overflow-hidden bg-gray-100">
												{product.image_url ? (
													<img
														src={product.image_url}
														alt={product.product_name}
														className="w-full h-full object-cover"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<p className="text-muted-foreground">이미지 없음</p>
													</div>
												)}
											</div>
											<div className="p-4 flex-1 flex flex-col">
												<h3 className="font-semibold text-lg line-clamp-1">
													{product.product_name}
												</h3>
												<p className="text-sm text-muted-foreground line-clamp-2 mt-1 flex-1">
													{product.description || "상품 설명이 없습니다."}
												</p>
												<div className="mt-2">
													<p className="font-semibold">
														{product.price.toLocaleString()}원
													</p>
													{product.sgt_price && (
														<p className="text-xs text-primary">
															SGT: {product.sgt_price.toLocaleString()} 토큰
														</p>
													)}
												</div>
											</div>
										</div>
									))}
								</div>

								{products.length > 4 && (
									<div className="mt-6 text-center">
										<Link href={`/stores/${storeId}/products/list`}>
											<button className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
												더 많은 상품 보기 ({products.length - 4}개 더)
											</button>
										</Link>
									</div>
								)}
							</>
						)}
					</div>

					{/* Location */}
					{store.address && (store.latitude || store.longitude) && (
						<div className="bg-white rounded-xl shadow-md p-6">
							<h2 className="text-xl font-bold mb-4 flex items-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									className="mr-2 text-primary"
								>
									<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
									<circle cx="12" cy="10" r="3"></circle>
								</svg>
								위치 정보
							</h2>
							<p className="text-gray-700 mb-4">{store.address}</p>

							{/* Map placeholder - In a real app, you would integrate with a map service */}
							<div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
								<div className="text-center text-gray-500">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="48"
										height="48"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.5"
										className="mx-auto mb-2"
									>
										<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
										<circle cx="12" cy="10" r="3"></circle>
									</svg>
									<p>지도 표시 영역</p>
									<p className="text-sm mt-1">
										위도: {store.latitude}, 경도: {store.longitude}
									</p>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Right Column - Contact & Details */}
				<div className="space-y-8">
					{/* Contact Information */}
					<div className="bg-white rounded-xl shadow-md p-6">
						<h2 className="text-xl font-bold mb-4 flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								className="mr-2 text-primary"
							>
								<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
							</svg>
							연락처 정보
						</h2>
						<ul className="space-y-4">
							{store.phone_number && (
								<li className="flex items-start gap-3">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										className="shrink-0 mt-0.5 text-gray-500"
									>
										<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
									</svg>
									<div>
										<p className="text-sm text-gray-500">전화번호</p>
										<p className="text-gray-800">{store.phone_number}</p>
									</div>
								</li>
							)}

							{store.email && (
								<li className="flex items-start gap-3">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										className="shrink-0 mt-0.5 text-gray-500"
									>
										<rect width="20" height="16" x="2" y="4" rx="2"></rect>
										<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
									</svg>
									<div>
										<p className="text-sm text-gray-500">이메일</p>
										<p className="text-gray-800">{store.email}</p>
									</div>
								</li>
							)}

							{store.website_url && (
								<li className="flex items-start gap-3">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										className="shrink-0 mt-0.5 text-gray-500"
									>
										<circle cx="12" cy="12" r="10"></circle>
										<line x1="2" y1="12" x2="22" y2="12"></line>
										<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
									</svg>
									<div>
										<p className="text-sm text-gray-500">웹사이트</p>
										<a
											href={store.website_url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-primary hover:underline"
										>
											{store.website_url}
										</a>
									</div>
								</li>
							)}
						</ul>
					</div>

					{/* Business Details */}
					<div className="bg-white rounded-xl shadow-md p-6">
						<h2 className="text-xl font-bold mb-4 flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								className="mr-2 text-primary"
							>
								<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
								<path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"></path>
							</svg>
							사업자 정보
						</h2>
						<ul className="space-y-4">
							{store.owner_name && (
								<li className="flex items-start gap-3">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										className="shrink-0 mt-0.5 text-gray-500"
									>
										<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
										<circle cx="12" cy="7" r="4"></circle>
									</svg>
									<div>
										<p className="text-sm text-gray-500">대표자명</p>
										<p className="text-gray-800">{store.owner_name}</p>
									</div>
								</li>
							)}

							{store.business_number && (
								<li className="flex items-start gap-3">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										className="shrink-0 mt-0.5 text-gray-500"
									>
										<rect width="20" height="14" x="2" y="5" rx="2"></rect>
										<line x1="2" x2="22" y1="10" y2="10"></line>
									</svg>
									<div>
										<p className="text-sm text-gray-500">사업자 등록번호</p>
										<p className="text-gray-800">{store.business_number}</p>
									</div>
								</li>
							)}

							{store.operating_hours && (
								<li className="flex items-start gap-3">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										className="shrink-0 mt-0.5 text-gray-500"
									>
										<circle cx="12" cy="12" r="10"></circle>
										<polyline points="12 6 12 12 16 14"></polyline>
									</svg>
									<div>
										<p className="text-sm text-gray-500">영업시간</p>
										<p className="text-gray-800 whitespace-pre-line">
											{store.operating_hours}
										</p>
									</div>
								</li>
							)}
						</ul>
					</div>

					{/* Owner Actions - Only visible to store owner */}
					{isOwner && (
						<div className="bg-white rounded-xl shadow-md p-6">
							<h2 className="text-xl font-bold mb-4 flex items-center">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									className="mr-2 text-primary"
								>
									<path d="M12 20h9"></path>
									<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
								</svg>
								매장 관리
							</h2>
							<div className="space-y-3">
								<Link href={`/stores/edit/${storeId}`} className="w-full">
									<button className="w-full px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors duration-200 text-base font-medium flex items-center justify-center gap-2">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											className="shrink-0"
										>
											<path d="M12 20h9"></path>
											<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
										</svg>
										매장 정보 수정
									</button>
								</Link>

								<Link href={`/stores/${storeId}/products`} className="w-full">
									<button className="w-full px-4 py-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200 text-base font-medium flex items-center justify-center gap-2">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											className="shrink-0"
										>
											<path d="M20.91 8.84 8.56 21.18a4.18 4.18 0 0 1-5.91 0 4.18 4.18 0 0 1 0-5.91L14.99 2.92a2.79 2.79 0 0 1 3.94 0 2.79 2.79 0 0 1 0 3.94L7.67 18.12a1.4 1.4 0 0 1-1.97 0 1.4 1.4 0 0 1 0-1.97L16.23 5.6"></path>
										</svg>
										상품 관리
									</button>
								</Link>
							</div>
						</div>
					)}

					{/* Action Buttons */}
					<div className="space-y-3">
						<button className="w-full px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors duration-200 text-base font-medium flex items-center justify-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								className="shrink-0"
							>
								<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
							</svg>
							즐겨찾기에 추가
						</button>

						<button className="w-full px-4 py-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200 text-base font-medium flex items-center justify-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								className="shrink-0"
							>
								<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
							</svg>
							리뷰 작성하기
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
