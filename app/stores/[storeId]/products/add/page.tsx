"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { Store } from "@/utils/type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";

interface AddProductPageProps {
	storeId: string;
}

function AddProductContent({ storeId }: AddProductPageProps) {
	const router = useRouter();
	const { user, isLoading } = useAuth();
	const [store, setStore] = useState<Store | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingStore, setIsLoadingStore] = useState(true);
	const [formData, setFormData] = useState({
		product_name: "",
		description: "",
		price: "",
		sgt_price: "",
		category: "",
		status: "1", // Default to active
	});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);

	useEffect(() => {
		const fetchStoreData = async () => {
			if (isLoading) return;
			if (!user) {
				router.push("/login");
				return;
			}

			try {
				const supabase = createClient();

				// Verify store ownership
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
			} catch (error) {
				console.error("Error fetching store data:", error);
				toast({
					title: "오류 발생",
					description: "매장 정보를 불러오는 중 오류가 발생했습니다.",
					variant: "destructive",
				});
			} finally {
				setIsLoadingStore(false);
			}
		};

		fetchStoreData();
	}, [user, storeId, isLoading, router]);

	// Handle form input changes
	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	// Handle image upload
	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setImageFile(file);

			// Create preview
			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!user || !store) {
			toast({
				title: "오류 발생",
				description: "로그인이 필요하거나 매장 정보가 없습니다.",
				variant: "destructive",
			});
			return;
		}

		// Validate form
		if (!formData.product_name || !formData.price) {
			toast({
				title: "입력 오류",
				description: "상품명과 가격은 필수 입력 항목입니다.",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			const supabase = createClient();
			let imageUrl = "";

			// Upload image if selected
			if (imageFile) {
				const productId = uuidv4();
				const fileExt = imageFile.name.split(".").pop();
				const fileName = `${storeId}-${productId}-${Date.now()}.${fileExt}`;

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("product-images")
					.upload(fileName, imageFile);

				if (uploadError) throw uploadError;

				// Get public URL
				const { data: urlData } = supabase.storage
					.from("product-images")
					.getPublicUrl(fileName);

				imageUrl = urlData.publicUrl;
			}

			// Create product
			const { data: productData, error: productError } = await supabase
				.from("products")
				.insert({
					product_id: uuidv4(),
					product_name: formData.product_name,
					description: formData.description,
					price: parseFloat(formData.price) || 0,
					sgt_price: formData.sgt_price ? parseFloat(formData.sgt_price) : null,
					category: formData.category,
					image_url: imageUrl,
					store_id: storeId,
					is_sgt_product: false,
					status: parseInt(formData.status),
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.select();

			if (productError) throw productError;

			toast({
				title: "등록 완료",
				description: "상품이 성공적으로 등록되었습니다.",
			});

			// Redirect to products page
			router.push(`/stores/${storeId}/products`);
		} catch (error) {
			console.error("Error creating product:", error);
			toast({
				title: "등록 실패",
				description: "상품 등록 중 오류가 발생했습니다.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading || isLoadingStore) {
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
			<div className="max-w-3xl mx-auto">
				<h1 className="text-3xl font-bold mb-8">상품 등록</h1>
				<p className="text-muted-foreground mb-6">
					{store.store_name}에 새로운 상품을 등록합니다.
				</p>

				<form onSubmit={handleSubmit} className="space-y-8">
					{/* Product Name */}
					<div className="space-y-2">
						<Label htmlFor="product_name">상품명 *</Label>
						<Input
							id="product_name"
							name="product_name"
							value={formData.product_name}
							onChange={handleChange}
							required
						/>
					</div>

					{/* Price */}
					<div className="space-y-2">
						<Label htmlFor="price">가격 (원) *</Label>
						<Input
							id="price"
							name="price"
							type="number"
							min="0"
							step="100"
							value={formData.price}
							onChange={handleChange}
							required
						/>
					</div>

					{/* SGT Price */}
					<div className="space-y-2">
						<Label htmlFor="sgt_price">SGT 가격 (토큰)</Label>
						<Input
							id="sgt_price"
							name="sgt_price"
							type="number"
							min="0"
							step="1"
							value={formData.sgt_price}
							onChange={handleChange}
						/>
						<p className="text-sm text-muted-foreground">
							SGT 토큰으로 결제 가능한 경우 입력하세요.
						</p>
					</div>

					{/* Category */}
					<div className="space-y-2">
						<Label htmlFor="category">카테고리</Label>
						<Input
							id="category"
							name="category"
							value={formData.category}
							onChange={handleChange}
						/>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">상품 설명</Label>
						<Textarea
							id="description"
							name="description"
							value={formData.description}
							onChange={handleChange}
							rows={4}
						/>
					</div>

					{/* Status */}
					<div className="space-y-2">
						<Label htmlFor="status">상태</Label>
						<div className="flex items-center space-x-4">
							<label className="flex items-center space-x-2">
								<input
									type="radio"
									name="status"
									value="1"
									checked={formData.status === "1"}
									onChange={handleChange}
									className="h-4 w-4"
								/>
								<span>활성화</span>
							</label>
							<label className="flex items-center space-x-2">
								<input
									type="radio"
									name="status"
									value="2"
									checked={formData.status === "2"}
									onChange={handleChange}
									className="h-4 w-4"
								/>
								<span>비활성화</span>
							</label>
							<label className="flex items-center space-x-2">
								<input
									type="radio"
									name="status"
									value="0"
									checked={formData.status === "0"}
									onChange={handleChange}
									className="h-4 w-4"
								/>
								<span>초안</span>
							</label>
						</div>
					</div>

					{/* Product Image */}
					<div className="space-y-2">
						<Label htmlFor="image">상품 이미지</Label>
						<div className="flex flex-col space-y-4">
							{imagePreview && (
								<div className="relative w-full max-w-md h-48 rounded-lg overflow-hidden">
									<img
										src={imagePreview}
										alt="Product preview"
										className="w-full h-full object-cover"
									/>
								</div>
							)}
							<Input
								id="image"
								type="file"
								accept="image/*"
								onChange={handleImageChange}
								className="cursor-pointer"
							/>
						</div>
					</div>

					{/* Submit Button */}
					<div className="flex justify-end space-x-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => router.push(`/stores/${storeId}/products`)}
						>
							취소
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "등록 중..." : "등록"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

// This is the actual page component that Next.js will use
export default async function AddProductPage({
	params,
}: {
	params: Promise<{ storeId: string }>;
}) {
	const resolvedParams = await params;
	const { storeId } = resolvedParams;
	return <AddProductContent storeId={storeId} />;
}
