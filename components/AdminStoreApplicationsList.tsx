import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { StoreApplication, Category } from "@/utils/type";

export default function AdminStoreApplicationsList() {
	const [applications, setApplications] = useState<StoreApplication[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [processingId, setProcessingId] = useState<string | null>(null);
	const [expandedApplicationId, setExpandedApplicationId] = useState<
		string | null
	>(null);
	const [categories, setCategories] = useState<Category[]>([]);

	useEffect(() => {
		fetchApplications();
		fetchCategories();
	}, []);

	const fetchApplications = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const supabase = createClient();
			const { data, error } = await supabase
				.from("store_applications")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;
			setApplications(data || []);
		} catch (err) {
			console.error("Error fetching store applications:", err);
			setError("Failed to load store applications");
		} finally {
			setIsLoading(false);
		}
	};

	const fetchCategories = async () => {
		try {
			const supabase = createClient();
			const { data, error } = await supabase
				.from("categories")
				.select("category_id, category_name");

			if (error) throw error;
			setCategories(data || []);
		} catch (err) {
			console.error("Error fetching categories:", err);
		}
	};

	// Function to get category name from category_id
	const getCategoryName = (categoryId: string) => {
		const category = categories.find((c) => c.category_id === categoryId);
		return category ? category.category_name : "Unknown Category";
	};

	const handleApprove = async (application: StoreApplication) => {
		if (processingId) return; // Prevent multiple simultaneous operations
		setProcessingId(application.application_id);

		try {
			const supabase = createClient();

			// 1. Update application status to approved (1)
			const { error: updateError } = await supabase
				.from("store_applications")
				.update({ status: 1, updated_at: new Date().toISOString() })
				.eq("application_id", application.application_id);

			if (updateError) throw updateError;

			// 2. Create a new store entry in the stores table
			const { data: storeData, error: insertError } = await supabase
				.from("stores")
				.insert({
					user_id: application.user_id,
					store_name: application.business_name,
					store_type: 1, // Default to physical store
					category_id: application.category_id, // This is the UUID of the category
					description: application.description,
					address: application.address,
					phone_number: application.phone_number,
					website_url: application.website || null,
					image_url: application.image_url, // Pass the image URL from the application
					business_number: application.business_number,
					owner_name: application.owner_name,
					email: application.email,
					operating_hours: application.operating_hours,
					referrer_phone_number: application.referrer_phone_number || null,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.select();

			if (insertError) throw insertError;

			// Refresh the applications list
			await fetchApplications();
			toast({
				title: "Application Approved",
				description: `${application.business_name} has been approved and added to stores.`,
				variant: "default",
			});
		} catch (err) {
			console.error("Error approving application:", err);
			toast({
				title: "Error",
				description: "Failed to approve the application. Please try again.",
				variant: "destructive",
			});
		} finally {
			setProcessingId(null);
		}
	};

	const handleReject = async (application: StoreApplication) => {
		if (processingId) return; // Prevent multiple simultaneous operations
		setProcessingId(application.application_id);

		try {
			const supabase = createClient();

			// Update application status to rejected (2)
			const { error } = await supabase
				.from("store_applications")
				.update({ status: 2, updated_at: new Date().toISOString() })
				.eq("application_id", application.application_id);

			if (error) throw error;

			// Refresh the applications list
			await fetchApplications();
			toast({
				title: "Application Rejected",
				description: `${application.business_name} has been rejected.`,
				variant: "default",
			});
		} catch (err) {
			console.error("Error rejecting application:", err);
			toast({
				title: "Error",
				description: "Failed to reject the application. Please try again.",
				variant: "destructive",
			});
		} finally {
			setProcessingId(null);
		}
	};

	const toggleExpand = (applicationId: string) => {
		if (expandedApplicationId === applicationId) {
			setExpandedApplicationId(null);
		} else {
			setExpandedApplicationId(applicationId);
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
				신청된 매장이 없습니다.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
					<tr>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							매장명
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
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							이미지
						</th>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							액션
						</th>
					</tr>
				</thead>
				<tbody className="bg-white divide-y divide-gray-200">
					{applications.map((application) => (
						<>
							<tr
								key={application.application_id}
								className={`hover:bg-gray-50 cursor-pointer ${expandedApplicationId === application.application_id ? "bg-gray-50" : ""}`}
								onClick={() => toggleExpand(application.application_id)}
							>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm font-medium text-gray-900 flex items-center">
										{application.business_name}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											className={`ml-2 transition-transform ${expandedApplicationId === application.application_id ? "rotate-180" : ""}`}
										>
											<polyline points="6 9 12 15 18 9"></polyline>
										</svg>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{application.owner_name}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-900">
										{getCategoryName(application.category_id)}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									{getStatusBadge(application.status)}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{formatDate(application.created_at)}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{application.image_url ? (
										<div className="h-10 w-10 rounded-full overflow-hidden">
											<img
												src={application.image_url}
												alt={application.business_name}
												className="h-full w-full object-cover"
											/>
										</div>
									) : (
										<span className="text-gray-400">없음</span>
									)}
								</td>
								<td
									className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
									onClick={(e) => e.stopPropagation()}
								>
									{application.status === 0 && (
										<div className="flex space-x-2">
											<Button
												variant="outline"
												size="sm"
												className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
												onClick={() => handleApprove(application)}
												disabled={processingId === application.application_id}
											>
												승인
											</Button>
											<Button
												variant="outline"
												size="sm"
												className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
												onClick={() => handleReject(application)}
												disabled={processingId === application.application_id}
											>
												거절
											</Button>
										</div>
									)}
								</td>
							</tr>
							{expandedApplicationId === application.application_id && (
								<tr>
									<td
										colSpan={7}
										className="px-6 py-4 bg-gray-50 border-t border-gray-100"
									>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<h3 className="text-lg font-medium mb-2">매장 정보</h3>
												<dl className="space-y-2">
													<div>
														<dt className="text-sm font-medium text-gray-500">
															사업자등록번호
														</dt>
														<dd>{application.business_number}</dd>
													</div>
													<div>
														<dt className="text-sm font-medium text-gray-500">
															연락처
														</dt>
														<dd>{application.phone_number}</dd>
													</div>
													<div>
														<dt className="text-sm font-medium text-gray-500">
															이메일
														</dt>
														<dd>{application.email}</dd>
													</div>
													<div>
														<dt className="text-sm font-medium text-gray-500">
															주소
														</dt>
														<dd>{application.address}</dd>
													</div>
													<div>
														<dt className="text-sm font-medium text-gray-500">
															운영시간
														</dt>
														<dd>{application.operating_hours}</dd>
													</div>
													{application.website && (
														<div>
															<dt className="text-sm font-medium text-gray-500">
																웹사이트
															</dt>
															<dd>
																<a
																	href={application.website}
																	target="_blank"
																	rel="noopener noreferrer"
																	className="text-blue-500 hover:underline"
																>
																	{application.website}
																</a>
															</dd>
														</div>
													)}
													{application.referrer_phone_number && (
														<div>
															<dt className="text-sm font-medium text-gray-500">
																추천인 연락처
															</dt>
															<dd>{application.referrer_phone_number}</dd>
														</div>
													)}
												</dl>
											</div>
											<div>
												<h3 className="text-lg font-medium mb-2">매장 설명</h3>
												<p className="text-sm text-gray-700 whitespace-pre-wrap">
													{application.description}
												</p>

												{application.image_url && (
													<div className="mt-4">
														<h3 className="text-lg font-medium mb-2">
															매장 이미지
														</h3>
														<div className="w-full h-48 rounded-lg overflow-hidden">
															<img
																src={application.image_url}
																alt={application.business_name}
																className="w-full h-full object-cover"
															/>
														</div>
													</div>
												)}
											</div>
										</div>
									</td>
								</tr>
							)}
						</>
					))}
				</tbody>
			</table>
		</div>
	);
}
