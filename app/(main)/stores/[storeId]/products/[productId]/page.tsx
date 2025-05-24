"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Store, Product } from "@/utils/type";
import HtmlContent from "@/components/HtmlContent";
import { formatSGTPrice } from "@/utils/formatters";

interface ProductDetailsPageProps {
	storeId: string;
	productId: string;
}

function ProductDetailsContent({
	storeId,
	productId,
}: ProductDetailsPageProps) {
	const router = useRouter();
	const supabase = createClient();
	const [store, setStore] = useState<Store | null>(null);
	const [product, setProduct] = useState<Product | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isOwner, setIsOwner] = useState(false);
	const [user, setUser] = useState<any>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);
	const [isProductDescriptionExpanded, setIsProductDescriptionExpanded] =
		useState(false);
	const [isHtmlContentExpanded, setIsHtmlContentExpanded] = useState(false);

	// First, check authentication status
	useEffect(() => {
		const checkAuth = async () => {
			try {
				const {
					data: { user: authUser },
					error,
				} = await supabase.auth.getUser();
				setUser(authUser || null);
			} catch (error) {
				console.error("Auth error:", error);
			} finally {
				setIsAuthLoading(false);
			}
		};

		checkAuth();
	}, [supabase]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setIsLoading(true);

				// Fetch store data
				const { data: storeData, error: storeError } = await supabase
					.from("stores")
					.select(
						`
            store_id,
            user_id,
            store_name, 
            store_type, 
            category_id,
            image_url,
            categories:category_id(category_id, category_name)
            `
					)
					.eq("store_id", storeId)
					.single();

				if (storeError) throw storeError;
				setStore(storeData as unknown as Store);

				// Check if user is store owner
				if (user && storeData.user_id === user.id) {
					setIsOwner(true);
				}

				// Fetch product data
				const { data: productData, error: productError } = await supabase
					.from("products")
					.select(
						`
            *,
            sgt_price_text:sgt_price::text,
            markdown_content
            `
					)
					.eq("product_id", productId)
					.eq("store_id", storeId)
					.single();

				if (productError) throw productError;
				setProduct(productData as Product);
			} catch (error) {
				console.error("Error fetching data:", error);
				setError("데이터를 불러오는 중 오류가 발생했습니다.");
			} finally {
				setIsLoading(false);
			}
		};

		// Add visibility change event listener to handle tab switching
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				console.log("Product page: Tab became visible again, refreshing data");
				// Refetch data when tab becomes visible again
				if (storeId && productId) {
					fetchData();
				}
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		if (storeId && productId) {
			fetchData();
		}

		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [storeId, productId, user]);

	if (isLoading) {
		return (
			<div className="container mx-auto py-16 px-4">
				<div className="flex justify-center items-center min-h-[50vh]">
					<div className="text-center">
						<div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p className="text-lg">상품 정보를 불러오는 중...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error || !product || !store) {
		return (
			<div className="container mx-auto py-16 px-4">
				<div className="flex justify-center items-center min-h-[50vh]">
					<div className="text-center">
						<div className="text-5xl mb-4">😕</div>
						<h2 className="text-2xl font-bold mb-2">
							상품 정보를 찾을 수 없습니다
						</h2>
						<p className="text-gray-600 mb-6">
							{error || "요청하신 상품 정보가 존재하지 않습니다."}
						</p>
						<Link
							href={`/stores/${storeId}`}
							className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
						>
							스토어 정보로 돌아가기
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
					href={`/stores/${storeId}`}
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
					스토어으로 돌아가기
				</Link>
			</div>

			{/* Product Header */}
			<div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
				<div className="relative h-64 md:h-96 bg-gray-100">
					{product.image_url ? (
						<div className="relative w-full h-full">
							<img
								src={product.image_url}
								alt={product.product_name}
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
								<p>상품 이미지 없음</p>
							</div>
						</div>
					)}

					<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
						<div className="flex items-center gap-3 mb-2">
							<span className="bg-primary text-white text-sm px-3 py-1 rounded-full">
								{store.categories?.category_name || "카테고리 없음"}
							</span>
							{product.is_sgt_product && (
								<span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full">
									SGT 상품
								</span>
							)}
						</div>
						<h1 className="text-3xl md:text-4xl font-bold text-white">
							{product.product_name}
						</h1>
					</div>
				</div>
			</div>

			{/* Product Details */}
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
							상품 설명
						</h2>

						{product.description ? (
							<div>
								<div
									className={
										isProductDescriptionExpanded
											? ""
											: "max-h-40 overflow-hidden relative"
									}
								>
									<p className="text-gray-700 whitespace-pre-line">
										{product.description}
									</p>
									{!isProductDescriptionExpanded &&
										product.description.length > 200 && (
											<div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
										)}
								</div>
								{product.description.length > 200 && (
									<div className="text-center mt-4">
										<button
											onClick={() =>
												setIsProductDescriptionExpanded(
													!isProductDescriptionExpanded
												)
											}
											className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
										>
											{isProductDescriptionExpanded ? "접기" : "더 보기"}
										</button>
									</div>
								)}
							</div>
						) : (
							<p className="text-gray-700">상품 설명 정보가 없습니다.</p>
						)}
					</div>

					{/* Markdown Content Section - Only show if there's markdown content or if user is owner */}
					{(product.markdown_content || isOwner) && (
						<div className="bg-white rounded-xl shadow-md p-6">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-xl font-bold flex items-center">
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
										<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
										<path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
									</svg>
									상품 상세 정보
								</h2>
								{isOwner && (
									<Link
										href={`/stores/${storeId}/products/markdown-edit/${productId}`}
									>
										<button className="text-primary hover:text-primary/80 flex items-center text-sm">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												className="mr-1"
											>
												<path d="M12 20h9"></path>
												<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
											</svg>
											수정하기
										</button>
									</Link>
								)}
							</div>

							{product.markdown_content ? (
								<div>
									<div
										className={
											isHtmlContentExpanded
												? ""
												: "max-h-40 overflow-hidden relative"
										}
									>
										<HtmlContent content={product.markdown_content} />
										{!isHtmlContentExpanded && (
											<div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
										)}
									</div>
									<div className="text-center mt-4">
										<button
											onClick={() =>
												setIsHtmlContentExpanded(!isHtmlContentExpanded)
											}
											className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
										>
											{isHtmlContentExpanded ? "접기" : "더 보기"}
										</button>
									</div>
								</div>
							) : isOwner ? (
								<div className="bg-primary/5 rounded-lg p-6 text-center">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="40"
										height="40"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.5"
										className="mx-auto mb-3 text-primary/70"
									>
										<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
										<path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
									</svg>
									<h3 className="text-lg font-medium mb-2">
										상품 상세 정보를 추가해보세요!
									</h3>
									<p className="text-muted-foreground mb-4">
										편집기를 사용해 이미지, 표, 목록 등을 포함한 풍부한 콘텐츠를
										작성할 수 있습니다.
									</p>
									<Link
										href={`/stores/${storeId}/products/markdown-edit/${productId}`}
									>
										<button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
											상세 정보 추가하기
										</button>
									</Link>
								</div>
							) : null}
						</div>
					)}

					{/* Store Information */}
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
								<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path>
								<path d="M4 12V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"></path>
								<path d="M15 15h3"></path>
								<path d="m6 12 6 7 6-7M6 5h12"></path>
							</svg>
							판매 스토어 정보
						</h2>

						<div className="flex items-center space-x-4 mb-4">
							{store.image_url && (
								<div className="w-16 h-16 rounded-full overflow-hidden">
									<img
										src={store.image_url}
										alt={store.store_name}
										className="w-full h-full object-cover"
									/>
								</div>
							)}
							<div>
								<h3 className="text-lg font-semibold">{store.store_name}</h3>
								{store.categories?.category_name && (
									<p className="text-muted-foreground text-sm">
										{store.categories.category_name}
									</p>
								)}
							</div>
						</div>

						<Link href={`/stores/${storeId}`} className="w-full block">
							<button className="w-full px-4 py-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200 text-base font-medium">
								스토어 정보 보기
							</button>
						</Link>
					</div>
				</div>

				{/* Right Column - Price & Actions */}
				<div className="space-y-8">
					{/* Price Information */}
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
								<circle cx="12" cy="12" r="10"></circle>
								<path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
								<path d="M12 18V6"></path>
							</svg>
							가격 정보
						</h2>

						<div className="space-y-4">
							<div className="bg-gray-50 p-4 rounded-lg">
								<p className="text-sm text-gray-500 mb-1">상품 가격</p>
								<p className="text-2xl font-bold">
									{product.won_price.toLocaleString()}원
								</p>
							</div>

							{(product.sgt_price || product.sgt_price_text) && (
								<div className="bg-primary/5 p-4 rounded-lg">
									<p className="text-sm text-primary mb-1">SGT 가격</p>
									<p className="text-2xl font-bold text-primary">
										{formatSGTPrice(
											product.sgt_price_text || product.sgt_price || 0
										)}{" "}
										포인트
									</p>
								</div>
							)}
						</div>
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
								상품 관리
							</h2>
							<div className="space-y-3">
								<Link
									href={`/stores/${storeId}/products/edit/${productId}`}
									className="w-full"
								>
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
										상품 정보 수정
									</button>
								</Link>
							</div>
						</div>
					)}

					{/* Customer Actions */}
					<div className="space-y-3">

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
								<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
							</svg>
							찜하기
						</button>
						
						{/* Legal policy links */}
						<div className="mt-6 text-xs text-gray-500 text-center">
							<p>상품 구매 시 아래 정책에 동의하는 것으로 간주합니다:</p>
							<div className="flex justify-center mt-1 space-x-3">
								<Link href="/terms" target="_blank" className="hover:underline text-blue-600">이용약관</Link>
								<span>|</span>
								<Link href="/privacy" target="_blank" className="hover:underline text-blue-600">개인정보처리방침</Link>
								<span>|</span>
								<Link href="/return-policy" target="_blank" className="hover:underline text-blue-600">환불정책</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// This is the actual page component that Next.js will use
export default async function ProductDetailsPage({
	params,
}: {
	params: Promise<{ storeId: string; productId: string }>;
}) {
	const resolvedParams = await params;
	const { storeId, productId } = resolvedParams;
	return <ProductDetailsContent storeId={storeId} productId={productId} />;
}
