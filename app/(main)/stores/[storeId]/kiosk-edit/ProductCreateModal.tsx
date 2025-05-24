"use client";

import { useState, useEffect, Fragment, FormEvent } from "react";
import { createClient } from "@/utils/supabase/client";
import { Store, Product } from "@/utils/type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline"; // For close button

interface ProductCreateModalProps {
	isOpen: boolean;
	onClose: () => void;
	storeId: string;
	userId: string; // Added userId prop
	onProductCreated: (newProduct: Product) => void;
	storeWalletAddress?: string | null; // To determine if delivery fee fields are needed
}

export default function ProductCreateModal({
	isOpen,
	onClose,
	storeId,
	userId,
	onProductCreated,
	storeWalletAddress,
}: ProductCreateModalProps) {
	const supabase = createClient();

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState({
		product_name: "",
		description: "",
		price: "",
		sgt_price: "",
		category: "",
		status: "1", // Default to active
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

	// Reset form when modal opens or closes
	useEffect(() => {
		if (isOpen) {
			// Reset form fields when modal opens
			setFormData({
				product_name: "",
				description: "",
				price: "",
				sgt_price: "",
				category: "",
				status: "1",
				won_delivery_fee: "",
				won_special_delivery_fee: "",
				sgt_delivery_fee: "",
				sgt_special_delivery_fee: "",
			});
			setImageFile(null);
			setImagePreview(null);
			setDisplayPrice("");
			setDisplaySgtPrice("");
			setDisplaySgtDeliveryFee("");
			setDisplaySgtSpecialDeliveryFee("");
			setDisplayWonDeliveryFee("");
			setDisplayWonSpecialDeliveryFee("");
			setIsSubmitting(false);
		}
	}, [isOpen]);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		const numericValue = value.replace(/[^\\d]/g, "");
		if (numericValue.length > 10) return;
		const formattedValue = numericValue
			? numericValue.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")
			: "";
		setDisplayPrice(formattedValue);
		setFormData((prev) => ({ ...prev, price: numericValue }));
	};

	const handleSgtPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		if (!/^[\\d,]*\\.?\\d*$/.test(value) && value !== "") return;
		const parts = value.split(".");
		const integerPart = parts[0].replace(/[^\\d]/g, "");
		let decimalPart = parts.length > 1 ? parts[1].replace(/[^\\d]/g, "") : "";
		if (integerPart.length > 10) return;
		if (decimalPart.length > 10) decimalPart = decimalPart.substring(0, 10);
		const formattedIntegerPart = integerPart
			? integerPart.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")
			: "0";
		const formattedValue = decimalPart
			? `${formattedIntegerPart}.${decimalPart}`
			: value.includes(".")
			  ? `${formattedIntegerPart}.`
			  : formattedIntegerPart;
		setDisplaySgtPrice(formattedValue);
		const numericValueForStorage = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
		setFormData((prev) => ({ ...prev, sgt_price: numericValueForStorage }));
	};
	
	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			setImageFile(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		} else {
      setImageFile(null);
      setImagePreview(null);
    }
	};

	const handleDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		const numericValue = value.replace(/[^\\d]/g, "");
		if (numericValue.length > 10) return;
		const formattedValue = numericValue ? numericValue.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",") : "";
		setDisplayWonDeliveryFee(formattedValue);
		setFormData((prev) => ({ ...prev, won_delivery_fee: numericValue }));
	};

	const handleSpecialDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		const numericValue = value.replace(/[^\\d]/g, "");
		if (numericValue.length > 10) return;
		const formattedValue = numericValue ? numericValue.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",") : "";
		setDisplayWonSpecialDeliveryFee(formattedValue);
		setFormData((prev) => ({ ...prev, won_special_delivery_fee: numericValue }));
	};
	
	const handleSgtDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		if (!/^[\\d,]*\\.?\\d*$/.test(value) && value !== "") return;
		const parts = value.split(".");
		const integerPart = parts[0].replace(/[^\\d]/g, "");
		let decimalPart = parts.length > 1 ? parts[1].replace(/[^\\d]/g, "") : "";
		if (integerPart.length > 10) return;
		if (decimalPart.length > 10) decimalPart = decimalPart.substring(0, 10);
		const formattedIntegerPart = integerPart ? integerPart.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",") : "0";
		const formattedValue = decimalPart ? `${formattedIntegerPart}.${decimalPart}` : (value.includes(".") ? `${formattedIntegerPart}.` : formattedIntegerPart);
		setDisplaySgtDeliveryFee(formattedValue);
		const numericValueForStorage = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
		setFormData((prev) => ({ ...prev, sgt_delivery_fee: numericValueForStorage }));
	};

	const handleSgtSpecialDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		if (!/^[\\d,]*\\.?\\d*$/.test(value) && value !== "") return;
		const parts = value.split(".");
		const integerPart = parts[0].replace(/[^\\d]/g, "");
		let decimalPart = parts.length > 1 ? parts[1].replace(/[^\\d]/g, "") : "";
		if (integerPart.length > 10) return;
		if (decimalPart.length > 10) decimalPart = decimalPart.substring(0, 10);
		const formattedIntegerPart = integerPart ? integerPart.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",") : "0";
		const formattedValue = decimalPart ? `${formattedIntegerPart}.${decimalPart}` : (value.includes(".") ? `${formattedIntegerPart}.` : formattedIntegerPart);
		setDisplaySgtSpecialDeliveryFee(formattedValue);
		const numericValueForStorage = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
		setFormData((prev) => ({ ...prev, sgt_special_delivery_fee: numericValueForStorage }));
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!userId) {
			toast({
				title: "오류 발생",
				description: "사용자 정보가 없습니다. 다시 로그인해주세요.",
				variant: "destructive",
			});
			return;
		}
		if (!formData.product_name || !formData.price) {
			toast({
				title: "입력 오류",
				description: "상품명과 가격은 필수 입력 항목입니다.",
				variant: "destructive",
			});
			return;
		}
		if (storeWalletAddress && !formData.won_delivery_fee && !formData.won_special_delivery_fee) {
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
			const newProductId = uuidv4(); // Generate product_id on the client

			if (imageFile) {
				const fileExt = imageFile.name.split(".").pop();
				const filePath = `${userId}/${storeId}-${newProductId}-${Date.now()}.${fileExt}`;
				const { data: uploadData, error: uploadError } =
					await supabase.storage
						.from("product-images")
						.upload(filePath, imageFile);
				if (uploadError) throw uploadError;
				const { data: urlData } = supabase.storage
					.from("product-images")
					.getPublicUrl(filePath);
				imageUrl = urlData.publicUrl;
			}
			
			const productToInsert = {
				product_id: newProductId, // Use client-generated UUID
				product_name: formData.product_name,
				description: formData.description,
				won_price: parseInt(formData.price),
				sgt_price: formData.sgt_price ? formData.sgt_price : null, // Store as numeric or text
				category: formData.category,
				image_url: imageUrl,
				store_id: storeId,
				status: parseInt(formData.status),
				is_sgt_product: false, // Default
				is_kiosk_enabled: false, // Default for new products, user can enable it later
				kiosk_order: null, // New products don't have an order by default
				is_sold_out: false, // Default
				won_delivery_fee: storeWalletAddress && formData.won_delivery_fee ? parseInt(formData.won_delivery_fee) : null,
				won_special_delivery_fee: storeWalletAddress && formData.won_special_delivery_fee ? parseInt(formData.won_special_delivery_fee) : null,
				sgt_delivery_fee: storeWalletAddress && formData.sgt_delivery_fee ? formData.sgt_delivery_fee : null,
				sgt_special_delivery_fee: storeWalletAddress && formData.sgt_special_delivery_fee ? formData.sgt_special_delivery_fee : null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};

			const { data: productData, error: productError } = await supabase
				.from("products")
				.insert(productToInsert)
				.select()
				.single();

			if (productError) throw productError;
			if (!productData) throw new Error("Failed to create product or retrieve data.");

			toast({
				title: "상품 등록 완료",
				description: `${productData.product_name} 상품이 성공적으로 등록되었습니다.`,
			});
			onProductCreated(productData as Product); // Pass the full product object
			onClose();
		} catch (err: any) {
			console.error("Error creating product:", err);
			toast({
				title: "상품 등록 실패",
				description: err.message || "상품 등록 중 오류가 발생했습니다.",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};
	
	return (
		<Transition.Root show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-50" onClose={() => !isSubmitting && onClose()}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
				</Transition.Child>

				<div className="fixed inset-0 z-10 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center sm:items-center sm:p-0">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
							enterTo="opacity-100 translate-y-0 sm:scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 translate-y-0 sm:scale-100"
							leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
						>
							<Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
								<div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
									<button
										type="button"
										className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
										onClick={() => !isSubmitting && onClose()}
									>
										<span className="sr-only">Close</span>
										<XMarkIcon className="h-6 w-6" aria-hidden="true" />
									</button>
								</div>
								<form onSubmit={handleSubmit} className="space-y-6">
									<Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-gray-900">
										새 상품 추가
									</Dialog.Title>
									
									{/* Product Name */}
									<div className="space-y-1">
										<Label htmlFor="product_name_modal">상품명 *</Label>
										<Input
											id="product_name_modal"
											name="product_name"
											value={formData.product_name}
											onChange={handleChange}
											required
											disabled={isSubmitting}
										/>
									</div>

									{/* Price */}
									<div className="space-y-1">
										<Label htmlFor="price_modal">가격 (원) *</Label>
										<Input
											id="price_modal"
											name="price"
											type="text"
											inputMode="numeric"
											value={displayPrice}
											onChange={handlePriceChange}
											placeholder="0"
											required
											disabled={isSubmitting}
										/>
									</div>

									{/* SGT Price */}
									<div className="space-y-1">
										<Label htmlFor="sgt_price_modal">SGT 가격 (포인트)</Label>
										<Input
											id="sgt_price_modal"
											name="sgt_price"
											type="text"
											inputMode="decimal"
											value={displaySgtPrice}
											onChange={handleSgtPriceChange}
											placeholder="0"
											disabled={isSubmitting}
										/>
									</div>

									{/* Category */}
									<div className="space-y-1">
										<Label htmlFor="category_modal">카테고리</Label>
										<Input
											id="category_modal"
											name="category"
											value={formData.category}
											onChange={handleChange}
											disabled={isSubmitting}
										/>
									</div>

									{/* Description */}
									<div className="space-y-1">
										<Label htmlFor="description_modal">상품 설명 (최대 200자)</Label>
										<Textarea
											id="description_modal"
											name="description"
											value={formData.description}
											onChange={handleChange}
											rows={3}
											maxLength={200}
											disabled={isSubmitting}
										/>
										<p className="text-xs text-gray-500">
											{formData.description.length}/200
										</p>
									</div>

									{/* Status */}
									<div className="space-y-1">
										<Label>상태</Label>
										<div className="flex items-center space-x-4">
											{[
												{ label: "활성화", value: "1" },
												{ label: "비활성화", value: "2" },
												{ label: "초안", value: "0" },
											].map((option) => (
												<label key={option.value} className="flex items-center space-x-2">
													<input
														type="radio"
														name="status"
														value={option.value}
														checked={formData.status === option.value}
														onChange={handleChange}
														className="h-4 w-4"
														disabled={isSubmitting}
													/>
													<span>{option.label}</span>
												</label>
											))}
										</div>
									</div>

									{/* Product Image */}
									<div className="space-y-1">
										<Label htmlFor="image_modal">상품 이미지</Label>
										<Input
											id="image_modal"
											type="file"
											accept="image/*"
											onChange={handleImageChange}
											className="cursor-pointer"
											disabled={isSubmitting}
										/>
										{imagePreview && (
											<div className="mt-2 relative w-full max-w-xs h-32 rounded overflow-hidden border">
												<img
													src={imagePreview}
													alt="Selected product preview"
													className="w-full h-full object-cover"
												/>
											</div>
										)}
									</div>
									
									{/* Delivery Fees - Conditionally rendered */}
									{storeWalletAddress && (
										<>
											<div className="space-y-1">
												<Label htmlFor="won_delivery_fee_modal">기본 배송비 (원) *</Label>
												<Input
													id="won_delivery_fee_modal"
													name="won_delivery_fee"
													type="text" inputMode="numeric"
													value={displayWonDeliveryFee}
													onChange={handleDeliveryFeeChange}
													placeholder="0" required
													disabled={isSubmitting}
												/>
											</div>
											<div className="space-y-1">
												<Label htmlFor="sgt_delivery_fee_modal">SGT 배송비 (포인트)</Label>
												<Input
													id="sgt_delivery_fee_modal"
													name="sgt_delivery_fee"
													type="text" inputMode="decimal"
													value={displaySgtDeliveryFee}
													onChange={handleSgtDeliveryFeeChange}
													placeholder="0"
													disabled={isSubmitting}
												/>
											</div>
											<div className="space-y-1">
												<Label htmlFor="won_special_delivery_fee_modal">도서산간 추가 배송비 (원)</Label>
												<Input
													id="won_special_delivery_fee_modal"
													name="won_special_delivery_fee"
													type="text" inputMode="numeric"
													value={displayWonSpecialDeliveryFee}
													onChange={handleSpecialDeliveryFeeChange}
													placeholder="0"
													disabled={isSubmitting}
												/>
											</div>
											<div className="space-y-1">
												<Label htmlFor="sgt_special_delivery_fee_modal">SGT 도서산간 추가 배송비 (포인트)</Label>
												<Input
													id="sgt_special_delivery_fee_modal"
													name="sgt_special_delivery_fee"
													type="text" inputMode="decimal"
													value={displaySgtSpecialDeliveryFee}
													onChange={handleSgtSpecialDeliveryFeeChange}
													placeholder="0"
													disabled={isSubmitting}
												/>
											</div>
										</>
									)}

									{/* Modal Actions */}
									<div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
										<Button
											type="submit"
											className="w-full justify-center sm:col-start-2"
											disabled={isSubmitting}
										>
											{isSubmitting ? "등록 중..." : "상품 등록"}
										</Button>
										<Button
											type="button"
											variant="outline"
											className="mt-3 w-full justify-center sm:col-start-1 sm:mt-0"
											onClick={() => !isSubmitting && onClose()}
											disabled={isSubmitting}
										>
											취소
										</Button>
									</div>
								</form>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition.Root>
	);
} 