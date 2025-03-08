import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";

interface Store {
	store_id: string;
	user_id: string;
	store_name: string;
	store_type: number;
	category_id: string | null;
	description: string | null;
	address: string | null;
	phone_number: string | null;
	website_url: string | null;
	image_url: string | null;
	business_number: string;
	owner_name: string;
	email: string | null;
	operating_hours: string | null;
	created_at: string;
	updated_at: string;
	categories?: {
		category_id: string;
		category_name: string;
	};
}

export default function AdminApprovedStoresList() {
	const [stores, setStores] = useState<Store[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [processingId, setProcessingId] = useState<string | null>(null);
	const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

	useEffect(() => {
		fetchStores();
	}, []);

	const fetchStores = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const supabase = createClient();
			// Fetch all stores with category information
			const { data, error } = await supabase
				.from("stores")
				.select(
					`
          store_id,
          user_id,
          store_name, 
          store_type, 
          description, 
          address, 
          phone_number,
          website_url,
          image_url, 
          business_number,
          owner_name,
          email,
          operating_hours,
          created_at,
          updated_at,
          categories:category_id(category_id, category_name)
        `
				)
				.order("created_at", { ascending: false });

			if (error) throw error;
			setStores((data as unknown as Store[]) || []);
		} catch (err) {
			console.error("Error fetching approved stores:", err);
			setError("Failed to load approved stores");
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveStore = async (store: Store) => {
		if (processingId) return; // Prevent multiple simultaneous operations
		setProcessingId(store.store_id);

		if (
			!confirm(
				`정말로 "${store.store_name}" 매장을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
			)
		) {
			setProcessingId(null);
			return;
		}

		try {
			const supabase = createClient();

			// Delete the store
			const { error } = await supabase
				.from("stores")
				.delete()
				.eq("store_id", store.store_id);

			if (error) throw error;

			// Refresh the stores list
			await fetchStores();
			toast({
				title: "매장 삭제 완료",
				description: `${store.store_name} 매장이 성공적으로 삭제되었습니다.`,
				variant: "default",
			});
		} catch (err) {
			console.error("Error removing store:", err);
			toast({
				title: "오류 발생",
				description: "매장 삭제 중 오류가 발생했습니다. 다시 시도해주세요.",
				variant: "destructive",
			});
		} finally {
			setProcessingId(null);
		}
	};

	const toggleExpand = (storeId: string) => {
		if (expandedStoreId === storeId) {
			setExpandedStoreId(null);
		} else {
			setExpandedStoreId(storeId);
		}
	};

	const getStoreTypeText = (type: number) => {
		switch (type) {
			case 0:
				return "온라인 전용";
			case 1:
				return "오프라인 전용";
			case 2:
				return "온라인 & 오프라인";
			default:
				return "정보 없음";
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

	if (stores.length === 0) {
		return (
			<div className="text-center py-4 text-gray-500">
				등록된 매장이 없습니다.
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
							매장 유형
						</th>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							등록일
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
					{stores.map((store) => (
						<>
							<tr
								key={store.store_id}
								className={`hover:bg-gray-50 cursor-pointer ${expandedStoreId === store.store_id ? "bg-gray-50" : ""}`}
								onClick={() => toggleExpand(store.store_id)}
							>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm font-medium text-gray-900 flex items-center">
										{store.store_name}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											className={`ml-2 transition-transform ${expandedStoreId === store.store_id ? "rotate-180" : ""}`}
										>
											<polyline points="6 9 12 15 18 9"></polyline>
										</svg>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{store.owner_name}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{store.categories?.category_name || "카테고리 없음"}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{getStoreTypeText(store.store_type)}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{formatDate(store.created_at)}
									</div>
								</td>
								<td
									className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
									onClick={(e) => e.stopPropagation()}
								>
									<div className="flex space-x-2">
										<Button
											variant="outline"
											size="sm"
											className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
											asChild
										>
											<Link href={`/stores/${store.store_id}`}>보기</Link>
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
											onClick={() => handleRemoveStore(store)}
											disabled={processingId === store.store_id}
										>
											삭제
										</Button>
									</div>
								</td>
							</tr>
							{expandedStoreId === store.store_id && (
								<tr>
									<td
										colSpan={6}
										className="px-6 py-4 bg-gray-50 border-t border-gray-100"
									>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
											<div>
												<h4 className="font-semibold text-gray-700 mb-3">
													매장 정보
												</h4>
												<div className="space-y-2">
													<div className="flex">
														<span className="text-gray-500 w-32">
															사업자 등록번호:
														</span>
														<span>{store.business_number}</span>
													</div>
													<div className="flex">
														<span className="text-gray-500 w-32">
															매장 유형:
														</span>
														<span>{getStoreTypeText(store.store_type)}</span>
													</div>
													{store.description && (
														<div className="flex">
															<span className="text-gray-500 w-32">설명:</span>
															<span>{store.description}</span>
														</div>
													)}
													{store.operating_hours && (
														<div className="flex">
															<span className="text-gray-500 w-32">
																영업 시간:
															</span>
															<span>{store.operating_hours}</span>
														</div>
													)}
												</div>
											</div>

											<div>
												<h4 className="font-semibold text-gray-700 mb-3">
													연락처 정보
												</h4>
												<div className="space-y-2">
													{store.address && (
														<div className="flex">
															<span className="text-gray-500 w-32">주소:</span>
															<span>{store.address}</span>
														</div>
													)}
													{store.phone_number && (
														<div className="flex">
															<span className="text-gray-500 w-32">
																전화번호:
															</span>
															<span>{store.phone_number}</span>
														</div>
													)}
													{store.email && (
														<div className="flex">
															<span className="text-gray-500 w-32">
																이메일:
															</span>
															<span>{store.email}</span>
														</div>
													)}
													{store.website_url && (
														<div className="flex">
															<span className="text-gray-500 w-32">
																웹사이트:
															</span>
															<a
																href={store.website_url}
																target="_blank"
																rel="noopener noreferrer"
																className="text-primary hover:underline"
															>
																{store.website_url}
															</a>
														</div>
													)}
												</div>
											</div>

											{store.image_url && (
												<div className="col-span-1 md:col-span-2">
													<h4 className="font-semibold text-gray-700 mb-3">
														매장 이미지
													</h4>
													<div className="w-full max-w-md h-48 rounded-lg overflow-hidden">
														<img
															src={store.image_url}
															alt={store.store_name}
															className="w-full h-full object-cover"
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
	);
}
