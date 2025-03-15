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

interface Product {
	product_id: string;
	product_name: string;
	description: string;
	price: number;
	sgt_price: number | null;
	category: string;
	image_url: string;
	store_id: string;
	is_sgt_product: boolean;
	status: number;
	created_at: string;
	updated_at: string;
}

interface EditProductPageProps {
	storeId: string;
	productId: string;
}

function EditProductContent({ storeId, productId }: EditProductPageProps) {
	const router = useRouter();
	const { user, isLoading } = useAuth();
	const [store, setStore] = useState<Store | null>(null);
	const [product, setProduct] = useState<Product | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [formData, setFormData] = useState({
		product_name: "",
		description: "",
		price: "",
		sgt_price: "",
		category: "",
		status: "1",
	});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [displayPrice, setDisplayPrice] = useState("");
	const [displaySgtPrice, setDisplaySgtPrice] = useState("");

	useEffect(() => {
		const fetchData = async () => {
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

				// Fetch product data
				const { data: productData, error: productError } = await supabase
					.from("products")
					.select("*")
					.eq("product_id", productId)
					.eq("store_id", storeId)
					.single();

				if (productError || !productData) {
					toast({
						title: "상품을 찾을 수 없음",
						description: "요청한 상품을 찾을 수 없습니다.",
						variant: "destructive",
					});
					router.push(`/stores/${storeId}/products`);
					return;
				}

				setProduct(productData as Product);

				// Set form data with raw values
				setFormData({
					product_name: productData.product_name || "",
					description: productData.description || "",
					price: productData.price?.toString() || "",
					sgt_price: productData.sgt_price?.toString() || "",
					category: productData.category || "",
					status: productData.status?.toString() || "1",
				});

				// Set display values with formatted values
				if (productData.price) {
					// Use a safer approach to add commas without parsing to integer
					setDisplayPrice(
						productData.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
					);
				}

				if (productData.sgt_price) {
					// Format SGT price with proper decimal handling
					const sgtPriceStr = productData.sgt_price.toString();
					const parts = sgtPriceStr.split(".");

					// Use a safer approach to add commas without parsing to integer
					const formattedIntegerPart = parts[0].replace(
						/\B(?=(\d{3})+(?!\d))/g,
						","
					);

					const formattedValue =
						parts.length > 1
							? `${formattedIntegerPart}.${parts[1]}`
							: formattedIntegerPart;
					setDisplaySgtPrice(formattedValue);
				}

				if (productData.image_url) {
					setImagePreview(productData.image_url);
				}
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
	}, [user, storeId, productId, isLoading, router]);

	// Handle form input changes
	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;

		// Handle special cases for price fields
		if (name === "price" || name === "sgt_price") {
			// Skip processing if the field is being cleared
			if (!value) {
				if (name === "price") {
					setDisplayPrice("");
				} else {
					setDisplaySgtPrice("");
				}
				setFormData((prev) => ({ ...prev, [name]: "" }));
				return;
			}
		}

		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	// Format KRW price with commas
	const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;

		// Remove all non-digit characters
		const numericValue = value.replace(/[^\d]/g, "");

		// Limit to maximum allowed digits (10 digits for 9,999,999,999)
		if (numericValue.length > 10) return;

		// Format with commas - avoid parseInt for large numbers
		let formattedValue;
		if (!numericValue) {
			formattedValue = "";
		} else {
			// Use a safer approach to add commas without parsing to integer
			formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

		setDisplayPrice(formattedValue);

		// Store the numeric value in formData
		setFormData((prev) => ({ ...prev, price: numericValue }));
	};

	// Format SGT price with commas and decimal places
	const handleSgtPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;

		// Allow only digits, commas, and a single decimal point
		if (!/^[\d,]*\.?\d*$/.test(value) && value !== "") return;

		// Split by decimal point
		const parts = value.split(".");
		const integerPart = parts[0].replace(/[^\d]/g, "");
		let decimalPart = parts.length > 1 ? parts[1].replace(/[^\d]/g, "") : "";

		// Limit integer part to 10 digits and decimal part to 10 digits
		if (integerPart.length > 10) return;
		if (decimalPart.length > 10) {
			decimalPart = decimalPart.substring(0, 10);
		}

		// Format integer part with commas - avoid parseInt for large numbers
		let formattedIntegerPart;
		if (!integerPart) {
			formattedIntegerPart = "0";
		} else {
			// Use a safer approach to add commas without parsing to integer
			formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

		// Combine parts
		const formattedValue = decimalPart
			? `${formattedIntegerPart}.${decimalPart}`
			: value.includes(".")
				? `${formattedIntegerPart}.`
				: formattedIntegerPart;

		setDisplaySgtPrice(formattedValue);

		// Store the numeric value in formData
		const numericValue = decimalPart
			? `${integerPart}.${decimalPart}`
			: value.includes(".")
				? `${integerPart}.`
				: integerPart;

		setFormData((prev) => ({ ...prev, sgt_price: numericValue }));
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

		if (!user || !store || !product) {
			toast({
				title: "오류 발생",
				description: "로그인이 필요하거나 매장/상품 정보가 없습니다.",
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
			let updatedImageUrl = product.image_url;

			// Upload new image if selected
			if (imageFile) {
				const fileExt = imageFile.name.split(".").pop();
				// Create a path with user_id as the folder name
				const filePath = `${user.id}/${storeId}-${productId}-${Date.now()}.${fileExt}`;

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("product-images")
					.upload(filePath, imageFile);

				if (uploadError) throw uploadError;

				// Get public URL
				const { data: urlData } = supabase.storage
					.from("product-images")
					.getPublicUrl(filePath);

				updatedImageUrl = urlData.publicUrl;
			}

			// Process price values with exact precision
			const priceValue = formData.price ? parseFloat(formData.price) : 0;

			// For SGT price, use the exact string value to preserve all decimal places
			// This avoids JavaScript's floating point precision issues
			let sgtPriceValue = null;
			if (formData.sgt_price) {
				// Use the raw string value directly to avoid rounding
				sgtPriceValue = formData.sgt_price;
			}

			// Update product
			const { error: updateError } = await supabase
				.from("products")
				.update({
					product_name: formData.product_name,
					description: formData.description,
					price: priceValue,
					sgt_price: sgtPriceValue,
					category: formData.category,
					image_url: updatedImageUrl,
					status: parseInt(formData.status),
					updated_at: new Date().toISOString(),
				})
				.eq("product_id", productId)
				.eq("store_id", storeId);

			if (updateError) throw updateError;

			toast({
				title: "수정 완료",
				description: "상품이 성공적으로 수정되었습니다.",
			});

			// Redirect to products page
			router.push(`/stores/${storeId}/products`);
		} catch (error) {
			console.error("Error updating product:", error);
			toast({
				title: "수정 실패",
				description: "상품 수정 중 오류가 발생했습니다.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
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

	if (!store || !product) {
		return null; // Redirect handled in useEffect
	}

	return (
		<div className="container mx-auto py-10 px-4 md:px-6">
			<div className="max-w-3xl mx-auto">
				<h1 className="text-3xl font-bold mb-8">상품 수정</h1>
				<p className="text-muted-foreground mb-6">
					{store.store_name}의 상품 정보를 수정합니다.
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
							type="text"
							inputMode="numeric"
							value={displayPrice}
							onChange={handlePriceChange}
							placeholder="0"
							required
						/>
						<p className="text-sm text-muted-foreground">
							최대 9,999,999,999원까지 입력 가능합니다.
						</p>
					</div>

					{/* SGT Price */}
					<div className="space-y-2">
						<Label htmlFor="sgt_price">SGT 가격 (토큰)</Label>
						<Input
							id="sgt_price"
							name="sgt_price"
							type="text"
							inputMode="decimal"
							value={displaySgtPrice}
							onChange={handleSgtPriceChange}
							placeholder="0"
						/>
						<p className="text-sm text-muted-foreground">
							SGT 토큰으로 결제 가능한 경우 입력하세요. 최대
							9,999,999,999.9999999999까지 입력 가능합니다.
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
							<p className="text-sm text-muted-foreground">
								이미지를 변경하지 않으면 기존 이미지가 유지됩니다.
							</p>
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
							{isSubmitting ? "저장 중..." : "저장"}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}

// This is the actual page component that Next.js will use
export default async function EditProductPage({
	params,
}: {
	params: Promise<{ storeId: string; productId: string }>;
}) {
	const resolvedParams = await params;
	const { storeId, productId } = resolvedParams;
	return <EditProductContent storeId={storeId} productId={productId} />;
}
