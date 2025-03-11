"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Category } from "@/utils/type";

interface FormData {
	business_name: string;
	owner_name: string;
	business_number: string;
	phone_number: string;
	email: string;
	address: string;
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
	const [formData, setFormData] = useState<FormData>({
		business_name: "",
		owner_name: "",
		business_number: "",
		phone_number: "",
		email: "",
		address: "",
		category_id: "",
		description: "",
		operating_hours: "",
		website: "",
		referrer_phone_number: "",
	});

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				setLoading(true);
				const supabase = createClient();
				const { data, error } = await supabase
					.from("categories")
					.select("category_id, category_name, description")
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

			// Submit the application to the store_applications table
			const { data, error } = await supabase.from("store_applications").insert({
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
				website: formData.website || null,
				referrer_phone_number: formData.referrer_phone_number || null,
				status: 0, // 0: pending
			});

			if (error) {
				throw error;
			}

			alert("입점 신청이 성공적으로 접수되었습니다. 검토 후 연락드리겠습니다.");
			router.push("/profile");
		} catch (error) {
			console.error("Error submitting application:", error);
			alert("입점 신청 중 오류가 발생했습니다. 다시 시도해주세요.");
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
				<h1 className="text-3xl md:text-4xl font-bold mb-4">입점 신청</h1>
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
										사업자등록번호 <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										name="business_number"
										required
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
								매장 정보
							</h2>

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
									매장 주소 <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									name="address"
									required
									value={formData.address}
									onChange={handleChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
								/>
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
									매장 소개 <span className="text-red-500">*</span>
								</label>
								<textarea
									name="description"
									required
									rows={4}
									value={formData.description}
									onChange={handleChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
									placeholder="매장 소개와 주요 상품/서비스에 대해 설명해주세요."
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
								disabled={isSubmitting}
								className={`w-full px-6 py-3 text-white bg-[#FFA725] rounded-lg hover:bg-[#FF9500] focus:outline-none focus:ring-2 focus:ring-[#FFA725] focus:ring-opacity-50 ${
									isSubmitting ? "opacity-70 cursor-not-allowed" : ""
								}`}
							>
								{isSubmitting ? "제출 중..." : "입점 신청하기"}
							</button>
						</div>
					</form>
				</div>

				{/* Additional Information */}
				<div className="mt-8 p-6 bg-[#FFF5E4] rounded-xl">
					<h3 className="text-lg font-semibold mb-4">입점 신청 절차</h3>
					<ol className="list-decimal list-inside space-y-2 text-gray-700">
						<li>입점 신청서 작성 및 제출</li>
						<li>서류 검토 (영업일 기준 3-5일 소요)</li>
						<li>담당자 전화 상담</li>
						<li>계약서 작성 및 입점 완료</li>
					</ol>
				</div>
			</div>
		</div>
	);
}
