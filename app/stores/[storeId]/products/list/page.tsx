"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Store, Product } from "@/utils/type";

interface StoreProductsListProps {
	storeId: string;
}

function StoreProductsListContent({ storeId }: StoreProductsListProps) {
	const router = useRouter();
	const [store, setStore] = useState<Store | null>(null);
	const [products, setProducts] = useState<Product[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setIsLoading(true);
				const supabase = createClient();

				// Fetch store data
				const { data: storeData, error: storeError } = await supabase
					.from("stores")
					.select(
						`
            store_id,
            store_name,
            image_url,
            categories:category_id(category_id, category_name)
          `
					)
					.eq("store_id", storeId)
					.single();

				if (storeError) throw storeError;
				setStore(storeData as unknown as Store);

				// Fetch active products for this store
				const { data: productsData, error: productsError } = await supabase
					.from("products")
					.select("*")
					.eq("store_id", storeId)
					.eq("status", 1) // Only active products
					.order("created_at", { ascending: false });

				if (productsError) throw productsError;

				// Process the products to ensure SGT prices maintain their precision
				// In your product processing code
				const processedProducts = productsData.map((product) => {
					if (product.sgt_price !== null) {
						// Use a more precise string conversion
						const rawSgtPrice =
							typeof product.sgt_price === "string"
								? product.sgt_price
								: product.sgt_price.toFixed(50); // Adjust the number of decimal places as needed

						return {
							...product,
							_original_sgt_price: product.sgt_price,
							sgt_price: rawSgtPrice,
						};
					}
					return product;
				});

				setProducts(processedProducts as Product[]);
			} catch (error) {
				console.error("Error fetching data:", error);
				setError("데이터를 불러오는 중 오류가 발생했습니다.");
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [storeId]);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-xl font-semibold">로딩 중...</p>
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
		<div className="container mx-auto py-10 px-4 md:px-6">
			<div className="mb-8">
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
					매장 정보로 돌아가기
				</Link>
			</div>

			<div className="flex items-center space-x-4 mb-8">
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
					<h1 className="text-3xl font-bold">{store.store_name} 상품 목록</h1>
					{store.categories?.category_name && (
						<p className="text-muted-foreground">
							{store.categories.category_name}
						</p>
					)}
				</div>
			</div>

			{products.length === 0 ? (
				<div className="text-center py-12 border rounded-lg">
					<p className="text-xl text-muted-foreground mb-4">
						등록된 상품이 없습니다.
					</p>
					<Link href={`/stores/${storeId}`}>
						<button className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
							매장 정보로 돌아가기
						</button>
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
					{products.map((product) => (
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
											SGT:{" "}
											{typeof product.sgt_price === "string"
												? product.sgt_price
												: product.sgt_price.toFixed(10)}{" "}
											토큰
										</p>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// This is the actual page component that Next.js will use
export default async function StoreProductsListPage({
	params,
}: {
	params: Promise<{ storeId: string }>;
}) {
	const resolvedParams = await params;
	const { storeId } = resolvedParams;
	return <StoreProductsListContent storeId={storeId} />;
}
