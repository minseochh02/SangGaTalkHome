"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { Store, Product } from "@/utils/type";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { PlusCircle, Edit, Trash2 } from "lucide-react";

interface StoreProductsPageProps {
	storeId: string;
}

function StoreProductsContent({ storeId }: StoreProductsPageProps) {
	const router = useRouter();
	const { user, isLoading } = useAuth();
	const [store, setStore] = useState<Store | null>(null);
	const [products, setProducts] = useState<Product[]>([]);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			if (isLoading) return;
			if (!user) {
				router.push("/login");
				return;
			}

			try {
				const supabase = createClient();

				// Fetch store data to verify ownership
				const { data: storeData, error: storeError } = await supabase
					.from("stores")
					.select("*")
					.eq("store_id", storeId)
					.eq("user_id", user.id)
					.single();

				if (storeError || !storeData) {
					toast({
						title: "접근 권한 없음",
						description: "해당 매장의 관리 권한이 없습니다.",
						variant: "destructive",
					});
					router.push("/profile");
					return;
				}

				setStore(storeData as Store);

				// Fetch products for this store
				const { data: productsData, error: productsError } = await supabase
					.from("products")
					.select("*")
					.eq("store_id", storeId)
					.order("created_at", { ascending: false });

				if (productsError) throw productsError;
				setProducts(productsData as Product[]);
			} catch (error) {
				console.error("Error fetching data:", error);
				toast({
					title: "오류 발생",
					description: "데이터를 불러오는 중 오류가 발생했습니다.",
					variant: "destructive",
				});
			} finally {
				setIsLoadingData(false);
			}
		};

		fetchData();
	}, [user, storeId, isLoading, router]);

	const handleDeleteProduct = async (productId: string) => {
		if (!confirm("정말로 이 상품을 삭제하시겠습니까?")) {
			return;
		}

		setIsDeleting(true);
		try {
			const supabase = createClient();

			// Find the product to get its image URL
			const productToDelete = products.find((p) => p.product_id === productId);

			// Delete the image from storage if it exists
			if (productToDelete?.image_url) {
				// Extract the path from the URL
				// The URL format is typically like: https://xxx.supabase.co/storage/v1/object/public/product-images/user_id/filename
				const urlParts = productToDelete.image_url.split("/");

				// Get the last two parts which should be user_id/filename
				// This handles both old format (just filename) and new format (user_id/filename)
				const pathParts = urlParts.slice(-2);
				let filePath;

				if (pathParts.length === 2 && pathParts[0].length > 0) {
					// New format with user_id folder
					filePath = `${pathParts[0]}/${pathParts[1]}`;
				} else {
					// Old format without user_id folder
					filePath = pathParts[pathParts.length - 1];
				}

				if (filePath) {
					const { error: storageError } = await supabase.storage
						.from("product-images")
						.remove([filePath]);

					if (storageError) {
						console.error("Error deleting image from storage:", storageError);
						// Continue with product deletion even if image deletion fails
					}
				}
			}

			// Delete the product from the database
			const { error } = await supabase
				.from("products")
				.delete()
				.eq("product_id", productId);

			if (error) throw error;

			// Update local state
			setProducts(
				products.filter((product) => product.product_id !== productId)
			);

			toast({
				title: "삭제 완료",
				description: "상품이 성공적으로 삭제되었습니다.",
			});
		} catch (error) {
			console.error("Error deleting product:", error);
			toast({
				title: "삭제 실패",
				description: "상품 삭제 중 오류가 발생했습니다.",
				variant: "destructive",
			});
		} finally {
			setIsDeleting(false);
		}
	};

	if (isLoading || isLoadingData) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<p className="text-xl font-semibold">로딩 중...</p>
				</div>
			</div>
		);
	}

	if (!store) {
		return null; // Redirect handled in useEffect
	}

	return (
		<div className="container mx-auto py-10 px-4 md:px-6">
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold">{store.store_name} 상품 관리</h1>
					<p className="text-muted-foreground mt-2">
						매장의 상품을 추가, 수정, 삭제할 수 있습니다.
					</p>
				</div>
				<Link href={`/stores/${storeId}/products/add`}>
					<Button>
						<PlusCircle className="mr-2 h-4 w-4" />
						상품 추가
					</Button>
				</Link>
			</div>

			{products.length === 0 ? (
				<div className="text-center py-12 border rounded-lg">
					<p className="text-xl text-muted-foreground mb-4">
						등록된 상품이 없습니다.
					</p>
					<Link href={`/stores/${storeId}/products/add`}>
						<Button>
							<PlusCircle className="mr-2 h-4 w-4" />첫 상품 등록하기
						</Button>
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{products.map((product) => (
						<Card key={product.product_id} className="overflow-hidden">
							<div className="aspect-video w-full overflow-hidden">
								{product.image_url ? (
									<img
										src={product.image_url}
										alt={product.product_name}
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full bg-muted flex items-center justify-center">
										<p className="text-muted-foreground">이미지 없음</p>
									</div>
								)}
							</div>
							<CardHeader>
								<CardTitle className="line-clamp-1">
									{product.product_name}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-lg font-semibold">
									{product.price.toLocaleString()}원
								</p>
								{product.sgt_price && (
									<p className="text-sm text-muted-foreground">
										SGT: {product.sgt_price.toString()} 토큰
									</p>
								)}
								<p className="line-clamp-2 text-sm text-muted-foreground mt-2">
									{product.description}
								</p>
							</CardContent>
							<CardFooter className="flex justify-between">
								<Link
									href={`/stores/${storeId}/products/edit/${product.product_id}`}
								>
									<Button variant="outline" size="sm">
										<Edit className="mr-2 h-4 w-4" />
										수정
									</Button>
								</Link>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => handleDeleteProduct(product.product_id)}
									disabled={isDeleting}
								>
									<Trash2 className="mr-2 h-4 w-4" />
									삭제
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			)}

			<div className="mt-8">
				<Link href={`/stores/${storeId}`}>
					<Button variant="outline">매장 정보로 돌아가기</Button>
				</Link>
			</div>
		</div>
	);
}

// This is the actual page component that Next.js will use
export default async function StoreProductsPage({
	params,
}: {
	params: Promise<{ storeId: string }>;
}) {
	const resolvedParams = await params;
	const { storeId } = resolvedParams;
	return <StoreProductsContent storeId={storeId} />;
}
