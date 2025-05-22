"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Store, Product } from "@/utils/type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { formatSGTPrice } from "@/utils/formatters";

interface EditProductPageProps {
	storeId: string;
	productId: string;
}

function EditProductContent({ storeId, productId }: EditProductPageProps) {
	const router = useRouter();
	const supabase = createClient();

	const [user, setUser] = useState<any>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(true);

	const [store, setStore] = useState<Store | null>(null);
	const [product, setProduct] = useState<Product | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [formData, setFormData] = useState({
		product_name: "",
		description: "",
		won_price: "",
		sgt_price: "",
		category: "",
		status: "1",
		won_delivery_fee: "",
		won_special_delivery_fee: "",
		sgt_delivery_fee: "",
		sgt_special_delivery_fee: "",
	});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [displayPrice, setDisplayPrice] = useState("");
	const [displaySgtPrice, setDisplaySgtPrice] = useState("");
	const [displaySgtDeliveryFee, setDisplaySgtDeliveryFee] = useState("");
	const [displaySgtSpecialDeliveryFee, setDisplaySgtSpecialDeliveryFee] = useState("");
	const [displayWonDeliveryFee, setDisplayWonDeliveryFee] = useState("");
	const [displayWonSpecialDeliveryFee, setDisplayWonSpecialDeliveryFee] = useState("");

	// First check authentication status
	useEffect(() => {
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
		const fetchData = async () => {
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

				// Fetch product data
				const { data: productData, error: productError } = await supabase
					.from("products")
					.select(
						`
						*,
						sgt_price_text:sgt_price::text
					`
					)
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
					won_price: productData.won_price?.toString() || "",
					sgt_price:
						productData.sgt_price_text ||
						productData.sgt_price?.toString() ||
						"",
					category: productData.category || "",
					status: productData.status?.toString() || "1",
					won_delivery_fee: productData.won_delivery_fee?.toString() || "",
					won_special_delivery_fee: productData.won_special_delivery_fee?.toString() || "",
					sgt_delivery_fee: productData.sgt_delivery_fee?.toString() || "",
					sgt_special_delivery_fee: productData.sgt_special_delivery_fee?.toString() || "",
				});

				// Set display values with formatted values
				if (productData.won_price) {
					// Use a safer approach to add commas without parsing to integer
					setDisplayPrice(
						productData.won_price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
					);
				}

				if (productData.sgt_price_text || productData.sgt_price) {
					// Use the text representation if available, otherwise use the numeric value
					const sgtPriceStr =
						productData.sgt_price_text || productData.sgt_price.toString();
					setDisplaySgtPrice(formatSGTPrice(sgtPriceStr));
				}

				if (productData.image_url) {
					setImagePreview(productData.image_url);
				}

				// Set display values for SGT delivery fees
				if (productData.sgt_delivery_fee) {
					setDisplaySgtDeliveryFee(formatSGTPrice(productData.sgt_delivery_fee.toString()));
				}
				
				if (productData.sgt_special_delivery_fee) {
					setDisplaySgtSpecialDeliveryFee(formatSGTPrice(productData.sgt_special_delivery_fee.toString()));
				}

				// Set display values with formatted values for won delivery fees
				if (productData.won_delivery_fee) {
					// Format with commas
					setDisplayWonDeliveryFee(
						productData.won_delivery_fee.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
					);
				}
				
				if (productData.won_special_delivery_fee) {
					// Format with commas
					setDisplayWonSpecialDeliveryFee(
						productData.won_special_delivery_fee.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
					);
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
	}, [user, storeId, productId, isAuthLoading, router]);

	// Handle form input changes
	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;

		// Handle special cases for price fields
		if (name === "won_price" || name === "sgt_price") {
			// Skip processing if the field is being cleared
			if (!value) {
				if (name === "won_price") {
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
		setFormData((prev) => ({ ...prev, won_price: numericValue }));
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

		setDisplayWonDeliveryFee(formattedValue);

		// Store the numeric value in formData
		setFormData((prev) => ({ ...prev, won_delivery_fee: numericValue }));
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

		setDisplayWonSpecialDeliveryFee(formattedValue);

		// Store the numeric value in formData
		setFormData((prev) => ({ ...prev, won_special_delivery_fee: numericValue }));
	};

	// Format SGT delivery fee with commas and decimal places
	const handleSgtDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

		// Format integer part with commas
		let formattedIntegerPart;
		if (!integerPart) {
			formattedIntegerPart = "0";
		} else {
			// Use a safer approach to add commas without parsing to integer
			formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

		// Combine parts for display
		const formattedValue = decimalPart
			? `${formattedIntegerPart}.${decimalPart}`
			: value.includes(".")
				? `${formattedIntegerPart}.`
				: formattedIntegerPart;

		setDisplaySgtDeliveryFee(formattedValue);

		// Store the numeric value in formData
		const numericValue = decimalPart
			? `${integerPart}.${decimalPart}`
			: value.includes(".")
				? `${integerPart}.`
				: integerPart;

		setFormData((prev) => ({ ...prev, sgt_delivery_fee: numericValue }));
	};

	// Format SGT special delivery fee with commas and decimal places
	const handleSgtSpecialDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

		// Format integer part with commas
		let formattedIntegerPart;
		if (!integerPart) {
			formattedIntegerPart = "0";
		} else {
			// Use a safer approach to add commas without parsing to integer
			formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

		// Combine parts for display
		const formattedValue = decimalPart
			? `${formattedIntegerPart}.${decimalPart}`
			: value.includes(".")
				? `${formattedIntegerPart}.`
				: formattedIntegerPart;

		setDisplaySgtSpecialDeliveryFee(formattedValue);

		// Store the numeric value in formData
		const numericValue = decimalPart
			? `${integerPart}.${decimalPart}`
			: value.includes(".")
				? `${integerPart}.`
				: integerPart;

		setFormData((prev) => ({ ...prev, sgt_special_delivery_fee: numericValue }));
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
				description: "로그인이 필요하거나 스토어/상품 정보가 없습니다.",
				variant: "destructive",
			});
			return;
		}

		// Validate form
		if (!formData.product_name || !formData.won_price) {
			toast({
				title: "입력 오류",
				description: "상품명과 가격은 필수 입력 항목입니다.",
				variant: "destructive",
			});
			return;
		}

		// Validate delivery fees for products that already have is_sgt_product = true
		if (product.is_sgt_product && !formData.won_delivery_fee && !formData.won_special_delivery_fee) {
			toast({
				title: "입력 오류",
				description: "SGT 상품의 경우 배송비는 필수 입력 항목입니다.",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			let imageUrl = product.image_url;

			// Upload new image if selected
			if (imageFile) {
				// Delete old image if it exists
				if (product.image_url) {
					// Extract the path from the URL
					// The URL format is typically like: https://xxx.supabase.co/storage/v1/object/public/product-images/user_id/filename
					const urlParts = product.image_url.split("/");

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
						const { error: deleteError } = await supabase.storage
							.from("product-images")
							.remove([filePath]);

						if (deleteError) {
							console.error("Error deleting old image:", deleteError);
							// Continue with upload even if delete fails
						}
					}
				}

				// Upload new image
				const fileExt = imageFile.name.split(".").pop();
				// Create a path with user_id as the folder name
				const filePath = `${user.id}/${storeId}-${product.product_id}-${Date.now()}.${fileExt}`;

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
			const priceValue = formData.won_price ? parseFloat(formData.won_price) : 0;

			// For SGT price, use the exact string value to preserve all decimal places
			// This avoids JavaScript's floating point precision issues
			let sgtPriceValue = null;
			if (formData.sgt_price) {
				// Use the raw string value directly to avoid rounding
				sgtPriceValue = formData.sgt_price;
			}

			// Update product with sgt_price as text to preserve exact numeric representation
			const { data, error } = await supabase
				.from("products")
				.update({
					product_name: formData.product_name,
					description: formData.description,
					won_price: priceValue,
					sgt_price: sgtPriceValue,
					category: formData.category,
					image_url: imageUrl,
					status: parseInt(formData.status),
					won_delivery_fee: product.is_sgt_product && formData.won_delivery_fee ? parseInt(formData.won_delivery_fee) : null,
					won_special_delivery_fee: product.is_sgt_product && formData.won_special_delivery_fee ? parseInt(formData.won_special_delivery_fee) : null,
					sgt_delivery_fee: product.is_sgt_product && formData.sgt_delivery_fee ? formData.sgt_delivery_fee : null,
					sgt_special_delivery_fee: product.is_sgt_product && formData.sgt_special_delivery_fee ? formData.sgt_special_delivery_fee : null,
					updated_at: new Date().toISOString(),
				})
				.eq("product_id", productId)
				.select();

			if (error) throw error;

			toast({
				title: "상품 수정 완료",
				description: "상품이 성공적으로 수정되었습니다.",
			});

			// Redirect to product list
			router.push(`/stores/${storeId}/products`);
		} catch (err) {
			console.error("Error updating product:", err);
			toast({
				title: "상품 수정 실패",
				description: "상품 수정 중 오류가 발생했습니다.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isAuthLoading || isLoadingData) {
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
						<Label htmlFor="won_price">가격 (원) *</Label>
						<Input
							id="won_price"
							name="won_price"
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
						<Label htmlFor="sgt_price">SGT 가격 (포인트)</Label>
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
							SGT 포인트으로 결제 가능한 경우 입력하세요. 최대
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
						<Label htmlFor="status">상품 상태</Label>
						<select
							id="status"
							name="status"
							value={formData.status}
							onChange={handleChange}
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="0">활성화</option>
							<option value="1">비활성화</option>
						</select>
					</div>

					{/* Only show SGT price and delivery fee fields if the product already has is_sgt_product = true */}
					{product.is_sgt_product && (
						<>
							<div className="space-y-2">
								<Label htmlFor="sgt_price">SGT 가격 (포인트)</Label>
								<Input
									id="sgt_price"
									name="sgt_price"
									value={displaySgtPrice}
									onChange={handleSgtPriceChange}
									placeholder="SGT 가격을 입력하세요 (선택사항)"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="won_delivery_fee">
									기본 배송비 (원) <span className="text-red-500">*</span>
								</Label>
								<Input
									id="won_delivery_fee"
									name="won_delivery_fee"
									type="text"
									inputMode="numeric"
									value={displayWonDeliveryFee}
									onChange={handleDeliveryFeeChange}
									placeholder="기본 배송비를 입력하세요"
									required
								/>
								<p className="text-sm text-muted-foreground">
									일반 지역 배송에 적용되는 배송비입니다.
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="sgt_delivery_fee">
									SGT 배송비 (포인트)
								</Label>
								<Input
									id="sgt_delivery_fee"
									name="sgt_delivery_fee"
									type="text"
									inputMode="decimal"
									value={displaySgtDeliveryFee}
									onChange={handleSgtDeliveryFeeChange}
									placeholder="SGT 배송비를 입력하세요"
								/>
								<p className="text-sm text-muted-foreground">
									SGT 결제시 적용되는 배송비입니다.
								</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="won_special_delivery_fee">
									도서산간 추가 배송비 (원)
								</Label>
								<Input
									id="won_special_delivery_fee"
									name="won_special_delivery_fee"
									type="text"
									inputMode="numeric"
									value={displayWonSpecialDeliveryFee}
									onChange={handleSpecialDeliveryFeeChange}
									placeholder="도서산간 추가 배송비를 입력하세요"
								/>
								<p className="text-sm text-muted-foreground">
									제주도 및 도서산간 지역에 추가로 적용되는 배송비입니다.
								</p>
							</div>
							<div className="space-y-2">
								<Label htmlFor="sgt_special_delivery_fee">
									SGT 도서산간 추가 배송비 (포인트)
								</Label>
								<Input
									id="sgt_special_delivery_fee"
									name="sgt_special_delivery_fee"
									type="text"
									inputMode="decimal"
									value={displaySgtSpecialDeliveryFee}
									onChange={handleSgtSpecialDeliveryFeeChange}
									placeholder="SGT 도서산간 추가 배송비를 입력하세요"
								/>
								<p className="text-sm text-muted-foreground">
									SGT 결제시 적용되는 도서산간 추가 배송비입니다.
								</p>
							</div>
						</>
					)}

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
						<Button
							type="button"
							variant="secondary"
							onClick={() =>
								router.push(
									`/stores/${storeId}/products/markdown-edit/${productId}`
								)
							}
						>
							리치 텍스트 에디터
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
