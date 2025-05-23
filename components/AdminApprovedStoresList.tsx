import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Store } from "@/utils/type";

export default function AdminApprovedStoresList() {
	const [stores, setStores] = useState<Store[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [processingId, setProcessingId] = useState<string | null>(null);
	const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

	useEffect(() => {
		fetchStores();
	}, []);

	const fetchStores = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const supabase = createClient();
			// Fetch all stores with category information
			const { data, error } = await supabase
				.from("stores")
				.select(
					`
          store_id,
          user_id,
          store_name, 
          store_type, 
          description, 
          address, 
          phone_number,
          website_url,
          image_url, 
          business_number,
          owner_name,
          email,
          operating_hours,
          referrer_phone_number,
          created_at,
          updated_at,
          categories:category_id(category_id, category_name)
        `
				)
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

	const handleRemoveStore = async (store: Store) => {
		if (processingId) return; // Prevent multiple simultaneous operations
		setProcessingId(store.store_id);

		if (
			!confirm(
				`정말로 "${store.store_name}" 스토어을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다. 관련된 모든 제품, 이미지, 리뷰 등이 함께 삭제됩니다. 주문 기록은 유지됩니다.`
			)
		) {
			setProcessingId(null);
			return;
		}

		try {
			const supabase = createClient();

			// Delete in a transaction-like sequence to maintain data integrity
			// We need to delete in the following order to avoid foreign key constraint errors:

			// 1. First, gather all data we need to delete files from storage

			// Get all products for this store
			const { data: productData, error: productFetchError } = await supabase
				.from("products")
				.select("product_id, image_url")
				.eq("store_id", store.store_id);

			if (productFetchError) throw productFetchError;

			// Get all product IDs for later use
			const productIds = productData?.map(product => product.product_id) || [];

			// Get all product images
			interface ProductImage {
				product_id: string;
				image_url: string;
			}

			// 2.1 Delete product main images
			if (productData && productData.length > 0) {
				for (const product of productData) {
					if (product.image_url) {
						try {
							// Extract the path from the URL
							const urlParts = product.image_url.split("/");
							const filePath = urlParts[urlParts.length - 1]; // Get filename from URL

							// Delete from bucket - using the correct bucket name
							await supabase.storage.from("product-images").remove([filePath]);
						} catch (error) {
							console.error(
								`Failed to delete image for product ${product.product_id}:`,
								error
							);
							// Continue with other deletions even if this one fails
						}
					}
				}
			}

			// 2.3 Delete store main image
			if (store.image_url) {
				try {
					const urlParts = store.image_url.split("/");
					const filePath = urlParts[urlParts.length - 1];

					// Delete from store-thumbnail bucket instead of store-images
					await supabase.storage.from("store-thumbnail").remove([filePath]);
				} catch (error) {
					console.error("Failed to delete store main image:", error);
				}
			}

			// 3. Now handle database records in the correct order
			
			// 3.1 Handle cart_items - delete them completely
			if (productIds.length > 0) {
				const { error: cartItemsError } = await supabase
					.from("cart_items")
					.delete()
					.in("product_id", productIds);

				if (cartItemsError) throw cartItemsError;
			}
			
			// 3.2 Handle coupons - delete them completely
			const { error: couponsError } = await supabase
				.from("coupons")
				.delete()
				.eq("store_id", store.store_id);

			if (couponsError) throw couponsError;
			
			// 3.3 Handle distributed_coupons - delete them completely
			// First get all coupon IDs for this store
			const { data: couponData, error: couponFetchError } = await supabase
				.from("coupons")
				.select("coupon_id")
				.eq("store_id", store.store_id);
				
			if (couponFetchError) throw couponFetchError;
			
			const couponIds = couponData?.map(coupon => coupon.coupon_id) || [];
			
			if (couponIds.length > 0) {
				const { error: distributedCouponsError } = await supabase
					.from("distributed_coupons")
					.delete()
					.in("coupon_id", couponIds);

				if (distributedCouponsError) throw distributedCouponsError;
			}

			// 3.4 For order_items, we keep them for history but mark the products as deleted
			// We'll need to add a 'is_deleted' field to the products table or use another approach
			// For now, let's use a different approach by keeping products but marking them
			
			// 3.5 Delete products in this store - but first update order_items to preserve history
			if (productIds.length > 0) {
				// Instead of deleting products referenced in order_items, we'll mark them as deleted
				// First, get all product_ids that are referenced in order_items
				const { data: orderItemProducts, error: orderItemsQueryError } = await supabase
					.from("order_items")
					.select("product_id")
					.in("product_id", productIds);
					
				if (orderItemsQueryError) throw orderItemsQueryError;
				
				// Products that need to be preserved (with is_deleted flag) because they're in order_items
				const productsInOrders = orderItemProducts 
					? Array.from(new Set(orderItemProducts.map(item => item.product_id as string)))
					: [];
				
				// Products that can be safely deleted (not in any orders)
				const productsToDelete = productIds.filter(id => !productsInOrders.includes(id));
				
				// Update products in orders to mark them as deleted
				if (productsInOrders.length > 0) {
					const { error: productUpdateError } = await supabase
						.from("products")
						.update({ is_deleted: true, store_id: null })
						.in("product_id", productsInOrders);
						
					if (productUpdateError) throw productUpdateError;
				}
				
				// Delete products that aren't in any orders
				if (productsToDelete.length > 0) {
					const { error: productsDeleteError } = await supabase
						.from("products")
						.delete()
						.in("product_id", productsToDelete);
						
					if (productsDeleteError) throw productsDeleteError;
				}
			} else {
				// If no products, proceed with normal product deletion
				const { error: productsError } = await supabase
					.from("products")
					.delete()
					.eq("store_id", store.store_id);

				if (productsError) throw productsError;
			}

			// 3.6 Delete favorites where target_id is this store's ID and favorite_type is 'store'
			const { error: favoritesError } = await supabase
				.from("favorites")
				.delete()
				.eq("target_id", store.store_id)
				.eq("favorite_type", "store");

			if (favoritesError) throw favoritesError;

			// 3.7 Delete reviews where target_id is this store's ID and review_type is 'store'
			const { error: reviewsError } = await supabase
				.from("reviews")
				.delete()
				.eq("target_id", store.store_id)
				.eq("review_type", "store");

			if (reviewsError) throw reviewsError;

			// 3.8 Finally, either delete the store or mark it as deleted
			// First check if store has any orders
			const { data: storeOrders, error: storeOrdersError } = await supabase
				.from("orders")
				.select("order_id")
				.eq("store_id", store.store_id)
				.limit(1);
				
			if (storeOrdersError) throw storeOrdersError;
			
			if (storeOrders && storeOrders.length > 0) {
				// If store has orders, mark as deleted but preserve for order history
				const { error: storeUpdateError } = await supabase
					.from("stores")
					.update({ is_deleted: true })
					.eq("store_id", store.store_id);
					
				if (storeUpdateError) throw storeUpdateError;
			} else {
				// If store has no orders, delete it completely
				const { error: storeError } = await supabase
					.from("stores")
					.delete()
					.eq("store_id", store.store_id);

				if (storeError) throw storeError;
			}

			// Refresh the stores list
			await fetchStores();
			toast({
				title: "스토어 삭제 완료",
				description: `${store.store_name} 스토어와 관련된 데이터가 성공적으로 삭제되었습니다. 주문 기록은 유지됩니다.`,
				variant: "default",
			});
		} catch (err) {
			console.error("Error removing store:", err);
			toast({
				title: "오류 발생",
				description: "스토어 삭제 중 오류가 발생했습니다. 다시 시도해주세요.",
				variant: "destructive",
			});
		} finally {
			setProcessingId(null);
		}
	};

	const toggleExpand = (storeId: string) => {
		if (expandedStoreId === storeId) {
			setExpandedStoreId(null);
		} else {
			setExpandedStoreId(storeId);
		}
	};

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

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("ko-KR", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
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
				등록된 스토어가 없습니다.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
					<tr>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							스토어명
						</th>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							사업자명
						</th>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							카테고리
						</th>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							스토어 유형
						</th>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							등록일
						</th>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							액션
						</th>
					</tr>
				</thead>
				<tbody className="bg-white divide-y divide-gray-200">
					{stores.map((store) => (
						<>
							<tr
								key={store.store_id}
								className={`hover:bg-gray-50 cursor-pointer ${expandedStoreId === store.store_id ? "bg-gray-50" : ""}`}
								onClick={() => toggleExpand(store.store_id)}
							>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm font-medium text-gray-900 flex items-center">
										{store.store_name}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											className={`ml-2 transition-transform ${expandedStoreId === store.store_id ? "rotate-180" : ""}`}
										>
											<polyline points="6 9 12 15 18 9"></polyline>
										</svg>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{store.owner_name}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{store.categories?.category_name || "카테고리 없음"}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{getStoreTypeText(store.store_type)}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{formatDate(store.created_at)}
									</div>
								</td>
								<td
									className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
									onClick={(e) => e.stopPropagation()}
								>
									<div className="flex space-x-2 mt-4">
										<Link
											href={`/stores/${store.store_id}`}
											className="px-3 py-1 bg-primary/10 text-primary rounded-md text-sm hover:bg-primary hover:text-white transition-colors"
										>
											보기
										</Link>
										<Link
											href={`/stores/edit/${store.store_id}`}
											className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
										>
											수정
										</Link>
										<Button
											variant="destructive"
											size="sm"
											onClick={() => handleRemoveStore(store)}
											disabled={processingId === store.store_id}
											className="px-3 py-1 text-sm"
										>
											{processingId === store.store_id ? "처리 중..." : "삭제"}
										</Button>
									</div>
								</td>
							</tr>
							{expandedStoreId === store.store_id && (
								<tr>
									<td
										colSpan={6}
										className="px-6 py-4 bg-gray-50 border-t border-gray-100"
									>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											<div>
												<h4 className="font-semibold text-gray-700 mb-3">
													스토어 정보
												</h4>
												<div className="space-y-2">
													<div className="flex">
														<span className="text-gray-500 w-32">
															사업자 등록번호:
														</span>
														<span>{store.business_number}</span>
													</div>
													<div className="flex">
														<span className="text-gray-500 w-32">
															스토어 유형:
														</span>
														<span>{getStoreTypeText(store.store_type)}</span>
													</div>
													{store.description && (
														<div className="flex">
															<span className="text-gray-500 w-32">설명:</span>
															<span>{store.description}</span>
														</div>
													)}
													{store.operating_hours && (
														<div className="flex">
															<span className="text-gray-500 w-32">
																영업 시간:
															</span>
															<span>{store.operating_hours}</span>
														</div>
													)}
												</div>
											</div>

											<div>
												<h4 className="font-semibold text-gray-700 mb-3">
													연락처 정보
												</h4>
												<div className="space-y-2">
													{store.address && (
														<div className="flex">
															<span className="text-gray-500 w-32">주소:</span>
															<span>{store.address}</span>
														</div>
													)}
													{store.phone_number && (
														<div className="flex">
															<span className="text-gray-500 w-32">
																전화번호:
															</span>
															<span>{store.phone_number}</span>
														</div>
													)}
													{store.email && (
														<div className="flex">
															<span className="text-gray-500 w-32">
																이메일:
															</span>
															<span>{store.email}</span>
														</div>
													)}
													{store.website_url && (
														<div className="flex">
															<span className="text-gray-500 w-32">
																웹사이트:
															</span>
															<a
																href={store.website_url}
																target="_blank"
																rel="noopener noreferrer"
																className="text-primary hover:underline"
															>
																{store.website_url}
															</a>
														</div>
													)}
													{store.referrer_phone_number && (
														<div className="flex">
															<span className="text-gray-500 w-32">
																추천인 전화번호:
															</span>
															<span>{store.referrer_phone_number}</span>
														</div>
													)}
												</div>
											</div>

											{store.image_url && (
												<div className="col-span-1 md:col-span-2">
													<h4 className="font-semibold text-gray-700 mb-3">
														스토어 이미지
													</h4>
													<div className="w-full max-w-md h-48 rounded-lg overflow-hidden">
														<img
															src={store.image_url}
															alt={store.store_name}
															className="w-full h-full object-cover"
														/>
													</div>
												</div>
											)}
										</div>
									</td>
								</tr>
							)}
						</>
					))}
				</tbody>
			</table>
		</div>
	);
}
