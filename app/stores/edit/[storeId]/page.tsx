"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { Store, Category } from "@/utils/type";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

export default function EditStorePage({
	params,
}: {
	params: { storeId: string };
}) {
	const { storeId } = params;
	const router = useRouter();
	const { user, userProfile, isLoading } = useAuth();
	const [categories, setCategories] = useState<Category[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingStore, setIsLoadingStore] = useState(true);
	const [storeData, setStoreData] = useState<Store | null>(null);
	const [formData, setFormData] = useState({
		store_name: "",
		store_type: "1", // Default to physical store
		category_id: "",
		description: "",
		address: "",
		phone_number: "",
		website_url: "",
		operating_hours: "",
		image_url: "",
	});
	const [imageFile, setImageFile] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);

	// Fetch store data and categories when component mounts
	useEffect(() => {
		const fetchData = async () => {
			if (!user) return;

			try {
				const supabase = createClient();

				// Fetch store data
				const { data: storeData, error: storeError } = await supabase
					.from("stores")
					.select(
						`
            store_id,
            store_name,
            store_type,
            category_id,
            description,
            address,
            phone_number,
            website_url,
            image_url,
            operating_hours
          `
					)
					.eq("store_id", storeId)
					.eq("user_id", user.id)
					.single();

				if (storeError) throw storeError;
				if (!storeData) {
					toast({
						title: "Error",
						description:
							"Store not found or you don't have permission to edit it",
						variant: "destructive",
					});
					router.push("/profile");
					return;
				}

				setStoreData(storeData as Store);
				setFormData({
					store_name: storeData.store_name || "",
					store_type: storeData.store_type.toString(),
					category_id: storeData.category_id || "",
					description: storeData.description || "",
					address: storeData.address || "",
					phone_number: storeData.phone_number || "",
					website_url: storeData.website_url || "",
					operating_hours: storeData.operating_hours || "",
					image_url: storeData.image_url || "",
				});

				if (storeData.image_url) {
					setImagePreview(storeData.image_url);
				}

				// Fetch categories
				const { data: categoriesData, error: categoriesError } = await supabase
					.from("categories")
					.select("*")
					.order("category_name");

				if (categoriesError) throw categoriesError;
				setCategories(categoriesData as Category[]);
			} catch (error) {
				console.error("Error fetching data:", error);
				toast({
					title: "Error",
					description: "Failed to load store data",
					variant: "destructive",
				});
			} finally {
				setIsLoadingStore(false);
			}
		};

		if (!isLoading) {
			fetchData();
		}
	}, [user, storeId, isLoading, router]);

	// Handle form input changes
	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	// Handle select changes
	const handleSelectChange = (name: string, value: string) => {
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

		if (!user) {
			toast({
				title: "Error",
				description: "You must be logged in to update a store",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);

		try {
			const supabase = createClient();
			let updatedImageUrl = formData.image_url;

			// Upload new image if selected
			if (imageFile) {
				const fileExt = imageFile.name.split(".").pop();
				const fileName = `${storeId}-${Date.now()}.${fileExt}`;

				const { data: uploadData, error: uploadError } = await supabase.storage
					.from("store-thumbnail")
					.upload(fileName, imageFile);

				if (uploadError) throw uploadError;

				// Get public URL
				const { data: urlData } = supabase.storage
					.from("store-thumbnail")
					.getPublicUrl(fileName);

				updatedImageUrl = urlData.publicUrl;
			}

			// Update store data
			const { error: updateError } = await supabase
				.from("stores")
				.update({
					store_name: formData.store_name,
					store_type: parseInt(formData.store_type),
					category_id: formData.category_id,
					description: formData.description,
					address: formData.address,
					phone_number: formData.phone_number,
					website_url: formData.website_url,
					operating_hours: formData.operating_hours,
					image_url: updatedImageUrl,
					updated_at: new Date().toISOString(),
				})
				.eq("store_id", storeId)
				.eq("user_id", user.id);

			if (updateError) throw updateError;

			toast({
				title: "Success",
				description: "Store updated successfully",
			});

			// Redirect to store page
			router.push(`/stores/${storeId}`);
		} catch (error) {
			console.error("Error updating store:", error);
			toast({
				title: "Error",
				description: "Failed to update store",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	// Show loading state
	if (isLoading || isLoadingStore) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<p className="text-xl font-semibold">Loading...</p>
				</div>
			</div>
		);
	}

	// Check if user is logged in
	if (!user || !userProfile) {
		router.push("/login");
		return null;
	}

	return (
		<div className="container mx-auto py-10 px-4 md:px-6">
			<div className="max-w-3xl mx-auto">
				<h1 className="text-3xl font-bold mb-8">매장 정보 수정</h1>

				<form onSubmit={handleSubmit} className="space-y-8">
					{/* Store Name */}
					<div className="space-y-2">
						<Label htmlFor="store_name">매장 이름 *</Label>
						<Input
							id="store_name"
							name="store_name"
							value={formData.store_name}
							onChange={handleChange}
							required
						/>
					</div>

					{/* Store Type */}
					<div className="space-y-2">
						<Label>매장 유형 *</Label>
						<RadioGroup
							value={formData.store_type}
							onValueChange={(value) => handleSelectChange("store_type", value)}
							className="flex flex-col space-y-2"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="0" id="online" />
								<Label htmlFor="online" className="cursor-pointer">
									온라인 전용
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="1" id="offline" />
								<Label htmlFor="offline" className="cursor-pointer">
									오프라인 전용
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="2" id="both" />
								<Label htmlFor="both" className="cursor-pointer">
									온라인 & 오프라인
								</Label>
							</div>
						</RadioGroup>
					</div>

					{/* Category */}
					<div className="space-y-2">
						<Label htmlFor="category">카테고리 *</Label>
						<Select
							value={formData.category_id}
							onValueChange={(value) =>
								handleSelectChange("category_id", value)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="카테고리 선택" />
							</SelectTrigger>
							<SelectContent>
								{categories.map((category) => (
									<SelectItem
										key={category.category_id}
										value={category.category_id}
									>
										{category.category_name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label htmlFor="description">매장 설명</Label>
						<Textarea
							id="description"
							name="description"
							value={formData.description}
							onChange={handleChange}
							rows={4}
						/>
					</div>

					{/* Address */}
					<div className="space-y-2">
						<Label htmlFor="address">주소</Label>
						<Input
							id="address"
							name="address"
							value={formData.address}
							onChange={handleChange}
						/>
					</div>

					{/* Phone Number */}
					<div className="space-y-2">
						<Label htmlFor="phone_number">전화번호</Label>
						<Input
							id="phone_number"
							name="phone_number"
							value={formData.phone_number}
							onChange={handleChange}
						/>
					</div>

					{/* Website URL */}
					<div className="space-y-2">
						<Label htmlFor="website_url">웹사이트 URL</Label>
						<Input
							id="website_url"
							name="website_url"
							value={formData.website_url}
							onChange={handleChange}
							type="url"
						/>
					</div>

					{/* Operating Hours */}
					<div className="space-y-2">
						<Label htmlFor="operating_hours">영업 시간</Label>
						<Input
							id="operating_hours"
							name="operating_hours"
							value={formData.operating_hours}
							onChange={handleChange}
						/>
					</div>

					{/* Store Image */}
					<div className="space-y-2">
						<Label htmlFor="image">매장 이미지</Label>
						<div className="flex flex-col space-y-4">
							{imagePreview && (
								<div className="relative w-full max-w-md h-48 rounded-lg overflow-hidden">
									<img
										src={imagePreview}
										alt="Store preview"
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
							<p className="text-sm text-gray-500">
								이미지를 변경하지 않으면 기존 이미지가 유지됩니다.
							</p>
						</div>
					</div>

					{/* Submit Button */}
					<div className="flex justify-end space-x-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => router.back()}
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
