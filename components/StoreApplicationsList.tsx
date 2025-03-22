import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { StoreApplication } from "@/utils/type";
import Image from "next/image";

// Extend the StoreApplication type to include categories
interface StoreApplicationWithCategory extends StoreApplication {
	categories?: {
		category_id: string;
		category_name: string;
	};
	image_url?: string;
}

export default function StoreApplicationsList({ userId }: { userId: string }) {
	const [applications, setApplications] = useState<
		StoreApplicationWithCategory[]
	>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedApplicationId, setExpandedApplicationId] = useState<
		string | null
	>(null);

	useEffect(() => {
		if (userId) {
			fetchApplications();
		}
	}, [userId]);

	const fetchApplications = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const supabase = createClient();
			const { data, error } = await supabase
				.from("store_applications")
				.select(
					`
					application_id,
					user_id,
					business_name,
					owner_name,
					business_number,
					phone_number,
					email,
					address,
					category_id,
					description,
					operating_hours,
					website,
					status,
					created_at,
					updated_at,
					referrer_phone_number,
					image_url,
					categories:category_id(category_id, category_name)
					`
				)
				.eq("user_id", userId)
				.order("created_at", { ascending: false });

			if (error) throw error;
			setApplications(
				(data as unknown as StoreApplicationWithCategory[]) || []
			);
		} catch (err) {
			console.error("Error fetching store applications:", err);
			setError("Failed to load store applications");
		} finally {
			setIsLoading(false);
		}
	};

	const getStatusBadge = (status: number) => {
		switch (status) {
			case 0:
				return (
					<span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
						심사중
					</span>
				);
			case 1:
				return (
					<span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
						승인됨
					</span>
				);
			case 2:
				return (
					<span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
						거절됨
					</span>
				);
			default:
				return (
					<span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
						알 수 없음
					</span>
				);
		}
	};

	const toggleExpand = (applicationId: string) => {
		if (expandedApplicationId === applicationId) {
			setExpandedApplicationId(null);
		} else {
			setExpandedApplicationId(applicationId);
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

	if (applications.length === 0) {
		return (
			<div className="text-center py-4 text-gray-500">
				신청한 스토어가 없습니다.
			</div>
		);
	}

	return (
		<div>
			{/* Mobile card view */}
			<div className="md:hidden space-y-4">
				{applications.map((app) => (
					<div
						key={app.application_id}
						className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
					>
						<div
							className="p-4 cursor-pointer"
							onClick={() => toggleExpand(app.application_id)}
						>
							<div className="flex justify-between items-center">
								<h3 className="font-medium text-gray-900">
									{app.business_name}
								</h3>
								{getStatusBadge(app.status)}
							</div>
							<div className="text-sm text-gray-500 mt-1">{app.owner_name}</div>
							<div className="text-sm text-gray-500 mt-1">
								{app.categories?.category_name || "카테고리 없음"}
							</div>
							<div className="text-xs text-gray-400 mt-2">
								{formatDate(app.created_at)}
							</div>
							<div className="flex justify-end mt-2">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									className={`transition-transform ${expandedApplicationId === app.application_id ? "rotate-180" : ""}`}
								>
									<polyline points="6 9 12 15 18 9"></polyline>
								</svg>
							</div>
						</div>

						{expandedApplicationId === app.application_id && (
							<div className="p-4 bg-gray-50 border-t border-gray-100">
								<div className="space-y-3">
									<div>
										<span className="text-gray-500 text-sm">
											사업자 등록번호:
										</span>
										<div className="mt-1">{app.business_number}</div>
									</div>
									{app.description && (
										<div>
											<span className="text-gray-500 text-sm">설명:</span>
											<div className="mt-1">{app.description}</div>
										</div>
									)}
									{app.operating_hours && (
										<div>
											<span className="text-gray-500 text-sm">영업 시간:</span>
											<div className="mt-1">{app.operating_hours}</div>
										</div>
									)}
									<div>
										<span className="text-gray-500 text-sm">주소:</span>
										<div className="mt-1">{app.address}</div>
									</div>
									<div>
										<span className="text-gray-500 text-sm">연락처:</span>
										<div className="mt-1">{app.phone_number}</div>
									</div>
									<div>
										<span className="text-gray-500 text-sm">이메일:</span>
										<div className="mt-1">{app.email}</div>
									</div>
									{app.website && (
										<div>
											<span className="text-gray-500 text-sm">웹사이트:</span>
											<div className="mt-1">
												<a
													href={app.website}
													target="_blank"
													rel="noopener noreferrer"
													className="text-primary hover:underline"
												>
													{app.website}
												</a>
											</div>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				))}
			</div>

			{/* Desktop table view */}
			<div className="hidden md:block overflow-x-auto">
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
								상태
							</th>
							<th
								scope="col"
								className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								신청일
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{applications.map((app) => (
							<>
								<tr
									key={app.application_id}
									className={`hover:bg-gray-50 cursor-pointer ${expandedApplicationId === app.application_id ? "bg-gray-50" : ""}`}
									onClick={() => toggleExpand(app.application_id)}
								>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm font-medium text-gray-900 flex items-center">
											{app.business_name}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												className={`ml-2 transition-transform ${expandedApplicationId === app.application_id ? "rotate-180" : ""}`}
											>
												<polyline points="6 9 12 15 18 9"></polyline>
											</svg>
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm text-gray-500">
											{app.owner_name}
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm text-gray-500">
											{app.categories?.category_name || "카테고리 없음"}
										</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										{getStatusBadge(app.status)}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<div className="text-sm text-gray-500">
											{formatDate(app.created_at)}
										</div>
									</td>
								</tr>
								{expandedApplicationId === app.application_id && (
									<tr>
										<td
											colSpan={5}
											className="px-6 py-4 bg-gray-50 border-t border-gray-100"
										>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												<div>
													<h4 className="font-semibold text-gray-700 mb-3">
														신청 정보
													</h4>
													<div className="space-y-2">
														<div className="flex">
															<span className="text-gray-500 w-32">
																사업자 등록번호:
															</span>
															<span>{app.business_number}</span>
														</div>
														{app.description && (
															<div className="flex">
																<span className="text-gray-500 w-32">
																	설명:
																</span>
																<span>{app.description}</span>
															</div>
														)}
														{app.operating_hours && (
															<div className="flex">
																<span className="text-gray-500 w-32">
																	영업 시간:
																</span>
																<span>{app.operating_hours}</span>
															</div>
														)}
														<div className="flex">
															<span className="text-gray-500 w-32">상태:</span>
															<span>{getStatusBadge(app.status)}</span>
														</div>
														<div className="flex">
															<span className="text-gray-500 w-32">
																최종 업데이트:
															</span>
															<span>{formatDate(app.updated_at)}</span>
														</div>
													</div>
												</div>

												<div>
													<h4 className="font-semibold text-gray-700 mb-3">
														연락처 정보
													</h4>
													<div className="space-y-2">
														{app.address && (
															<div className="flex">
																<span className="text-gray-500 w-32">
																	주소:
																</span>
																<span>{app.address}</span>
															</div>
														)}
														{app.phone_number && (
															<div className="flex">
																<span className="text-gray-500 w-32">
																	전화번호:
																</span>
																<span>{app.phone_number}</span>
															</div>
														)}
														{app.email && (
															<div className="flex">
																<span className="text-gray-500 w-32">
																	이메일:
																</span>
																<span>{app.email}</span>
															</div>
														)}
														{app.website && (
															<div className="flex">
																<span className="text-gray-500 w-32">
																	웹사이트:
																</span>
																<a
																	href={app.website}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-primary hover:underline"
																>
																	{app.website}
																</a>
															</div>
														)}
														{app.referrer_phone_number && (
															<div className="flex">
																<span className="text-gray-500 w-32">
																	추천인 전화번호:
																</span>
																<span>{app.referrer_phone_number}</span>
															</div>
														)}
													</div>
												</div>

												{/* Add image section if image_url exists */}
												{app.image_url && (
													<div className="col-span-1 md:col-span-2 mt-4">
														<h4 className="font-semibold text-gray-700 mb-3">
															스토어 이미지
														</h4>
														<div className="relative w-full max-w-md h-48 border border-gray-200 rounded-lg overflow-hidden">
															<Image
																src={app.image_url}
																alt={app.business_name}
																fill
																style={{ objectFit: "contain" }}
																unoptimized
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
		</div>
	);
}
