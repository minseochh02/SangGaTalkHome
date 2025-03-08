import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface StoreApplication {
	application_id: string;
	user_id: string;
	business_name: string;
	owner_name: string;
	business_number: string;
	phone_number: string;
	email: string;
	address: string;
	category: string;
	description: string;
	operating_hours: string;
	website: string;
	status: number;
	created_at: string;
	updated_at: string;
}

export default function AdminStoreApplicationsList() {
	const [applications, setApplications] = useState<StoreApplication[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [processingId, setProcessingId] = useState<string | null>(null);

	useEffect(() => {
		fetchApplications();
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
			const { error: insertError } = await supabase.from("stores").insert({
				user_id: application.user_id,
				store_name: application.business_name,
				store_type: 1, // Default to physical store
				category_id: null, // This would need to be mapped from the category string
				description: application.description,
				address: application.address,
				phone_number: application.phone_number,
				website_url: application.website || null,
				image_url: null, // No image in application
				business_number: application.business_number,
				owner_name: application.owner_name,
				email: application.email,
				operating_hours: application.operating_hours,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			});

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
							액션
						</th>
					</tr>
				</thead>
				<tbody className="bg-white divide-y divide-gray-200">
					{applications.map((app) => (
						<tr key={app.application_id} className="hover:bg-gray-50">
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="text-sm font-medium text-gray-900">
									{app.business_name}
								</div>
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="text-sm text-gray-500">{app.owner_name}</div>
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="text-sm text-gray-500">{app.category}</div>
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								{getStatusBadge(app.status)}
							</td>
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="text-sm text-gray-500">
									{formatDate(app.created_at)}
								</div>
							</td>
							<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								{app.status === 0 && (
									<div className="flex space-x-2">
										<Button
											variant="outline"
											size="sm"
											className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
											onClick={() => handleApprove(app)}
											disabled={processingId === app.application_id}
										>
											승인
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
											onClick={() => handleReject(app)}
											disabled={processingId === app.application_id}
										>
											거절
										</Button>
									</div>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
