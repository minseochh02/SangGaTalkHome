"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Category } from "@/utils/type";
import { toast } from "sonner";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import AddressPopup from "@/components/AddressPopup";

interface FormData {
	business_name: string;
	owner_name: string;
	business_number?: string;
	phone_number: string;
	email: string;
	address: string;
	latitude?: string;
	longitude?: string;
	category_id: string;
	description: string;
	operating_hours: string;
	website?: string;
	referrer_phone_number?: string;
}

export default function StoreRegistration() {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAddressPopup, setShowAddressPopup] = useState(false);

	// Image upload states
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Check if user is logged in
	useEffect(() => {
		const checkAuth = async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				toast.error("로그인이 필요합니다.");
				router.push("/signup");
			}
		};

		checkAuth();
	}, [router]);

	const [formData, setFormData] = useState<FormData>({
		business_name: "",
		owner_name: "",
		business_number: "",
		phone_number: "",
		email: "",
		address: "",
		latitude: "",
		longitude: "",
		category_id: "",
		description: "",
		operating_hours: "",
		website: "",
		referrer_phone_number: "",
	});

	// Clean up the preview URL when component unmounts or when a new image is selected
	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				setLoading(true);
				const supabase = createClient();
				const { data, error } = await supabase
					.from("categories")
					.select("category_id, category_name, description, created_at, updated_at")
					.order("category_name");

				if (error) {
					throw error;
				}

				setCategories(data || []);
			} catch (err) {
				console.error("Error fetching categories:", err);
				setError("카테고리를 불러오는 중 오류가 발생했습니다.");
			} finally {
				setLoading(false);
			}
		};

		fetchCategories();
	}, []);

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			// Clean up previous preview URL
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}

			const file = e.target.files[0];
			setSelectedImage(file);
			setPreviewUrl(URL.createObjectURL(file));
		}
	};

	const handleResetImage = () => {
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		setSelectedImage(null);
		setPreviewUrl(null);
	};

	const uploadImage = async (userId: string) => {
		if (!selectedImage) {
			throw new Error("이미지를 선택해주세요.");
		}

		const supabase = createClient();

		// Generate a unique filename
		const fileExt = selectedImage.name.split(".").pop();
		const fileName = `${uuidv4()}.${fileExt}`;
		const filePath = `${userId}/${fileName}`;

		// Upload the image to the store-thumbnail bucket
		const { data, error } = await supabase.storage
			.from("store-thumbnail")
			.upload(filePath, selectedImage, {
				cacheControl: "3600",
				upsert: false,
			});

		if (error) {
			throw error;
		}

		// Get the public URL for the uploaded image
		const {
			data: { publicUrl },
		} = supabase.storage.from("store-thumbnail").getPublicUrl(filePath);

		return publicUrl;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const supabase = createClient();

			// Get the current user
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				alert("로그인이 필요합니다.");
				router.push("/login");
				return;
			}

			// Check if image is selected
			if (!selectedImage) {
				toast.error("스토어 이미지를 선택해주세요.");
				setIsSubmitting(false);
				return;
			}

			// Upload the image first
			let imageUrl;
			try {
				toast.info("이미지 업로드 중...");
				imageUrl = await uploadImage(user.id);
				toast.success("이미지가 성공적으로 업로드되었습니다.");
			} catch (error) {
				console.error("Error uploading image:", error);
				toast.error("이미지 업로드 중 오류가 발생했습니다.");
				setIsSubmitting(false);
				return;
			}

			// Convert latitude and longitude to PostGIS point
			const location = formData.latitude && formData.longitude
				? `POINT(${formData.longitude} ${formData.latitude})`
				: null;

			// Insert the store application
			const { data: applicationData, error: applicationError } = await supabase
				.from("store_applications")
				.insert([
					{
						user_id: user.id,
						business_name: formData.business_name,
						owner_name: formData.owner_name,
						business_number: formData.business_number,
						phone_number: formData.phone_number,
						email: formData.email,
						address: formData.address,
						category_id: formData.category_id,
						description: formData.description,
						operating_hours: formData.operating_hours,
						website: formData.website,
						referrer_phone_number: formData.referrer_phone_number,
						image_url: imageUrl,
						location: location,
						status: 0, // Pending status
					},
				])
				.select()
				.single();

			if (applicationError) {
				throw applicationError;
			}

			alert(
				"스토어 등록 신청이 접수되었습니다. 신청 내용은 검토 후 승인 또는 거절될 수 있으며, 검토 기간은 영업일 기준 2~3일 정도 소요될 수 있습니다. 검토 결과는 등록하신 연락처(e메일 또는 휴대폰)로 안내드리겠습니다."
			);
			router.push("/profile");
		} catch (error) {
			console.error("Error submitting application:", error);
			alert("스토어 등록 중 오류가 발생했습니다. 다시 시도해주세요.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	return (
		<div className="w-full max-w-7xl mx-auto px-4 py-8">
			{/* Header Section */}
			<div className="text-center mb-8 md:mb-12">
				<h1 className="text-3xl md:text-4xl font-bold mb-4">스토어 등록</h1>
				<p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
					SGT과 함께 성장할 파트너를 찾습니다. 아래 양식을 작성하시면 검토 후
					연락드리겠습니다.
				</p>
			</div>

			{/* Registration Form */}
			<div className="max-w-3xl mx-auto">
				<div className="bg-white rounded-2xl p-4 md:p-8 shadow-lg">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Business Information Section */}
						<div className="space-y-6">
							<h2 className="text-xl md:text-2xl font-semibold text-[#6A9C89] mb-4">
								사업자 정보
							</h2>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										상호명 <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										name="business_name"
										required
										value={formData.business_name}
										onChange={handleChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										대표자명 <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										name="owner_name"
										required
										value={formData.owner_name}
										onChange={handleChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									/>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										사업자등록번호 (선택사항)
									</label>
									<input
										type="text"
										name="business_number"
										placeholder="000-00-00000"
										value={formData.business_number}
										onChange={handleChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										연락처 <span className="text-red-500">*</span>
									</label>
									<input
										type="tel"
										name="phone_number"
										required
										placeholder="010-0000-0000"
										value={formData.phone_number}
										onChange={handleChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									/>
								</div>
							</div>
						</div>

						{/* Store Information Section */}
						<div className="space-y-6 pt-6 border-t">
							<h2 className="text-xl md:text-2xl font-semibold text-[#6A9C89] mb-4">
								스토어 정보
							</h2>

							{/* Store Image Upload Section */}
							<div className="space-y-4">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									스토어 이미지 <span className="text-red-500">*</span>
								</label>
								<input
									type="file"
									accept="image/*"
									onChange={handleImageChange}
									ref={fileInputRef}
									required
									className="block w-full text-sm text-gray-500
									file:mr-4 file:py-2 file:px-4
									file:rounded-md file:border-0
									file:text-sm file:font-semibold
									file:bg-[#FFA725] file:text-white
									hover:file:bg-[#FF9500]
									cursor-pointer"
								/>

								{previewUrl && (
									<div className="mt-4">
										<p className="text-sm font-medium text-gray-700 mb-2">
											미리보기
										</p>
										<div className="relative w-full h-48 border border-gray-200 rounded-lg overflow-hidden">
											<Image
												src={previewUrl}
												alt="Preview"
												fill
												style={{ objectFit: "contain" }}
												unoptimized
											/>
										</div>
										<div className="flex justify-end mt-2">
											<button
												type="button"
												onClick={handleResetImage}
												className="text-sm text-[#6A9C89] hover:text-[#5A8C79]"
											>
												이미지 초기화
											</button>
										</div>
									</div>
								)}
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									이메일 <span className="text-red-500">*</span>
								</label>
								<input
									type="email"
									name="email"
									required
									value={formData.email}
									onChange={handleChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									스토어 주소 <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-2">
									<input
										type="text"
										name="address"
										required
										value={formData.address}
										onChange={handleChange}
										readOnly
										className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									/>
									<button
										type="button"
										onClick={() => setShowAddressPopup(true)}
										className="px-4 py-2 bg-[#FFA725] text-white rounded-lg hover:bg-[#FF9500] focus:outline-none focus:ring-2 focus:ring-[#FFA725] focus:ring-opacity-50"
									>
										주소 검색
									</button>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										업종 카테고리 <span className="text-red-500">*</span>
									</label>
									<select
										name="category_id"
										required
										value={formData.category_id}
										onChange={handleChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									>
										<option value="">카테고리 선택</option>
										{categories.map((category) => (
											<option
												key={category.category_id}
												value={category.category_id}
											>
												{category.category_name}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										운영 시간 <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										name="operating_hours"
										required
										placeholder="예: 09:00-18:00"
										value={formData.operating_hours}
										onChange={handleChange}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									/>
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									스토어 소개 <span className="text-red-500">*</span>
								</label>
								<textarea
									name="description"
									required
									rows={4}
									value={formData.description}
									onChange={handleChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									placeholder="스토어 소개와 주요 상품/서비스에 대해 설명해주세요."
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									웹사이트 (선택사항)
								</label>
								<input
									type="url"
									name="website"
									value={formData.website}
									onChange={handleChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									placeholder="https://"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									추천인 전화번호 (선택사항)
								</label>
								<input
									type="tel"
									name="referrer_phone_number"
									value={formData.referrer_phone_number}
									onChange={handleChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									placeholder="010-0000-0000"
								/>
							</div>
						</div>

						{/* Terms and Submit */}
						<div className="pt-6 border-t">
							<div className="flex items-start mb-6">
								<div className="flex items-center h-5">
									<input
										id="terms"
										type="checkbox"
										required
										className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-[#FFA725]"
									/>
								</div>
								<label
									htmlFor="terms"
									className="ml-2 text-sm font-medium text-gray-700"
								>
									<span className="text-red-500">*</span> 개인정보 수집 및
									이용에 동의합니다.{" "}
									<a href="#" className="text-[#FFA725] hover:underline">
										약관 보기
									</a>
								</label>
							</div>

							<button
								type="submit"
								disabled={isSubmitting || !selectedImage}
								className={`w-full px-6 py-3 text-white bg-[#FFA725] rounded-lg hover:bg-[#FF9500] focus:outline-none focus:ring-2 focus:ring-[#FFA725] focus:ring-opacity-50 ${
									isSubmitting || !selectedImage
										? "opacity-70 cursor-not-allowed"
										: ""
								}`}
							>
								{isSubmitting ? "제출 중..." : "스토어 등록하기"}
							</button>
							{!selectedImage && (
								<p className="mt-2 text-sm text-red-500 text-center">
									스토어 이미지를 선택해야 신청할 수 있습니다.
								</p>
							)}
						</div>
					</form>
				</div>

				{/* Additional Information */}
				<div className="mt-8 p-6 bg-[#FFF5E4] rounded-xl">
					<h3 className="text-lg font-semibold mb-4">스토어 등록 절차</h3>
					<ol className="list-decimal list-inside space-y-2 text-gray-700">
						<li>스토어 등록 신청 </li>
						<li>등록 내용 담당자 확인(영업일 기준 2~3일 소요)</li>
						<li>등록 완료</li>
					</ol>
				</div>
			</div>

			{showAddressPopup && (
				<AddressPopup
					onClose={() => setShowAddressPopup(false)}
					onSelect={(address, latitude, longitude) => {
						console.log(address, latitude, longitude);
						setFormData((prev) => ({ 
							...prev, 
							address,
							latitude: latitude || "",
							longitude: longitude || "" 
						}));
						setShowAddressPopup(false);
					}}
				/>
			)}
		</div>
	);
}
