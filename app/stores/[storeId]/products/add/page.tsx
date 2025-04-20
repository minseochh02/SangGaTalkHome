"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Store } from "@/utils/type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";
import { formatSGTPrice } from "@/utils/formatters";
import { Category, Product } from "@/utils/type";
interface AddProductPageProps {
	storeId: string;
}

function AddProductContent({ storeId }: AddProductPageProps) {
	const router = useRouter();
	const supabase = createClient();

	const [user, setUser] = useState<any>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);

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
		delivery_fee: "",
		special_delivery_fee: "",
	});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [displayPrice, setDisplayPrice] = useState("");
	const [displaySgtPrice, setDisplaySgtPrice] = useState("");

	useEffect(() => {
		// First check authentication status
		const checkAuth = async () => {
			try {
				const {
					data: { user },
					error,
				} = await supabase.auth.getUser();

				if (error || !user) {
					router.push("/login");
					return;
				}

				setUser(user);
			} catch (error) {
				console.error("Auth error:", error);
				router.push("/login");
			} finally {
				setIsAuthLoading(false);
			}
		};

		checkAuth();
	}, [router, supabase]);

	useEffect(() => {
		const fetchStoreData = async () => {
			if (isAuthLoading) return;
			if (!user) {
				router.push("/login");
				return;
			}

			try {
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
						description: "해당 스토어의 관리 권한이 없습니다.",
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
					description: "스토어 정보를 불러오는 중 오류가 발생했습니다.",
					variant: "destructive",
				});
			} finally {
				setIsLoadingStore(false);
			}
		};

		fetchStoreData();
	}, [user, storeId, isAuthLoading, router, supabase]);

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

	// Format delivery fee with commas
	const handleDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

		// Store the numeric value in formData
		setFormData((prev) => ({ ...prev, delivery_fee: numericValue }));
	};

	// Format special delivery fee with commas
	const handleSpecialDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

		// Store the numeric value in formData
		setFormData((prev) => ({ ...prev, special_delivery_fee: numericValue }));
	};

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!user || !store) {
			toast({
				title: "오류 발생",
				description: "로그인이 필요하거나 스토어 정보가 없습니다.",
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

		// Validate delivery fees if store allows SGT products
		if (store.store_wallet_address && !formData.delivery_fee) {
			toast({
				title: "입력 오류",
				description: "SGT 상품의 경우 배송비는 필수 입력 항목입니다.",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			let imageUrl = "";

			// Upload image if selected
			if (imageFile) {
				const productId = uuidv4();
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

				imageUrl = urlData.publicUrl;
			}

			// Process price values with exact precision
			const priceValue = formData.price ? parseFloat(formData.price) : 0;

			// For SGT price, use the exact string value to preserve all decimal places
			// This avoids JavaScript's floating point precision issues
			let sgtPriceValue = null;
			if (formData.sgt_price) {
				// Convert to numeric value for Supabase - using parseFloat
				sgtPriceValue = parseFloat(formData.sgt_price);
				
				// Check if it's a valid number
				if (isNaN(sgtPriceValue)) {
					sgtPriceValue = null;
				}
			}

			// Create product in database
			const { data: productData, error: productError } = await supabase
				.from("products")
				.insert({
					product_name: formData.product_name,
					description: formData.description,
					won_price: parseInt(formData.price),
					sgt_price: formData.sgt_price ? formData.sgt_price : null,
					category: formData.category,
					image_url: imageUrl,
					store_id: storeId,
					status: parseInt(formData.status),
					is_sgt_product: false, // Default to false, only admin can change this
					delivery_fee: store.store_wallet_address && formData.delivery_fee ? parseInt(formData.delivery_fee) : null,
					special_delivery_fee: store.store_wallet_address && formData.special_delivery_fee ? parseInt(formData.special_delivery_fee) : null,
				})
				.select();

			if (productError) throw productError;

			toast({
				title: "상품 등록 완료",
				description: "상품이 성공적으로 등록되었습니다.",
			});

			// Redirect to product list
			router.push(`/stores/${storeId}/products`);
		} catch (err) {
			console.error("Error creating product:", err);
			toast({
				title: "상품 등록 실패",
				description: "상품 등록 중 오류가 발생했습니다.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isAuthLoading || isLoadingStore) {
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
						</div>
					</div>

					{/* Delivery Fees - Only show if store has wallet address */}
					{store.store_wallet_address && (
						<>
							<div className="space-y-2">
								<Label htmlFor="delivery_fee">
									기본 배송비 (원) <span className="text-red-500">*</span>
								</Label>
								<Input
									id="delivery_fee"
									name="delivery_fee"
									type="text"
									inputMode="numeric"
									value={formData.delivery_fee}
									onChange={handleDeliveryFeeChange}
									placeholder="기본 배송비를 입력하세요"
									required
								/>
								<p className="text-sm text-muted-foreground">
									일반 지역 배송에 적용되는 배송비입니다.
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="special_delivery_fee">
									도서산간 추가 배송비 (원)
								</Label>
								<Input
									id="special_delivery_fee"
									name="special_delivery_fee"
									type="text"
									inputMode="numeric"
									value={formData.special_delivery_fee}
									onChange={handleSpecialDeliveryFeeChange}
									placeholder="도서산간 추가 배송비를 입력하세요"
								/>
								<p className="text-sm text-muted-foreground">
									제주도 및 도서산간 지역에 추가로 적용되는 배송비입니다.
								</p>
							</div>
						</>
					)}

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
