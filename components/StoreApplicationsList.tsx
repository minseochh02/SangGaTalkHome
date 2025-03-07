import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

interface StoreApplication {
	application_id: string;
	business_name: string;
	category: string;
	status: number;
	created_at: string;
	updated_at: string;
}

export default function StoreApplicationsList({ userId }: { userId: string }) {
	const [applications, setApplications] = useState<StoreApplication[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchApplications = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const supabase = createClient();
				const { data, error } = await supabase
					.from("store_applications")
					.select(
						"application_id, business_name, category, status, created_at, updated_at"
					)
					.eq("user_id", userId)
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

		if (userId) {
			fetchApplications();
		}
	}, [userId]);

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
				신청한 매장이 없습니다.
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
							최종 업데이트
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
							<td className="px-6 py-4 whitespace-nowrap">
								<div className="text-sm text-gray-500">
									{formatDate(app.updated_at)}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
