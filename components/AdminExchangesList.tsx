import { createClient } from "@/utils/supabase/client";
import React, { useEffect, useState } from "react";
import { Exchange, LiquidSupplier, Policy } from "@/utils/type";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface ExtendedExchange extends Exchange {
	liquidSupplier?: {
		liquid_supplier_id: string;
		bank_name: string;
		bank_account_no: string;
	};
	policy?: {
		policy_id: string;
		title: string;
		rate: number;
	};
	transactionType?: number;
	receiver_wallet_address?: string;
}

export default function AdminExchangesList() {
	const [exchanges, setExchanges] = useState<ExtendedExchange[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedExchangeId, setExpandedExchangeId] = useState<string | null>(null);
	const [processingExchangeId, setProcessingExchangeId] = useState<string | null>(null);

	useEffect(() => {
		fetchExchanges();
	}, []);

	const fetchExchanges = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const supabase = createClient();
			// Fetch all exchanges with related information
			const { data, error } = await supabase
				.from("exchanges")
				.select(`
					exchange_id,
					transaction_id,
					liquid_supplier_id,
					policy_id,
					sgt_amount,
					won_amount,
					supplier_fee,
					content,
					status,
					created_at,
					receiver_wallet_address
				`)
				.order("created_at", { ascending: false });

			if (error) throw error;

			// Enhance data with related information
			const enhancedData = await enhanceExchangesWithRelatedData(data || []);
			setExchanges(enhancedData);
		} catch (err) {
			console.error("Error fetching exchanges:", err);
			setError("Failed to load exchanges");
		} finally {
			setIsLoading(false);
		}
	};

	// Enhance exchanges with related data
	const enhanceExchangesWithRelatedData = async (
		exchanges: Exchange[]
	): Promise<ExtendedExchange[]> => {
		const supabase = createClient();
		const enhancedExchanges: ExtendedExchange[] = [...exchanges];

		// Get all unique liquid supplier IDs and policy IDs
		const supplierIds = Array.from(
			new Set(exchanges.map((ex) => ex.liquid_supplier_id))
		);
		const policyIds = Array.from(
			new Set(exchanges.map((ex) => ex.policy_id))
		);
		const transactionIds = Array.from(
			new Set(exchanges.map((ex) => ex.transaction_id))
		).filter(Boolean);

		// Fetch all liquid suppliers
		if (supplierIds.length > 0) {
			const { data: suppliers, error } = await supabase
				.from("liquid_suppliers")
				.select("liquid_supplier_id, bank_name, bank_account_no")
				.in("liquid_supplier_id", supplierIds);

			if (!error && suppliers) {
				// Create a map for quick lookup
				const supplierMap = suppliers.reduce(
					(map, supplier) => {
						map[supplier.liquid_supplier_id] = supplier;
						return map;
					},
					{} as Record<string, any>
				);

				// Add supplier info to exchanges
				enhancedExchanges.forEach((exchange) => {
					if (supplierMap[exchange.liquid_supplier_id]) {
						exchange.liquidSupplier = supplierMap[exchange.liquid_supplier_id];
					}
				});
			}
		}

		// Fetch all policies
		if (policyIds.length > 0) {
			const { data: policies, error } = await supabase
				.from("policies")
				.select("policy_id, title, rate")
				.in("policy_id", policyIds);

			if (!error && policies) {
				// Create a map for quick lookup
				const policyMap = policies.reduce(
					(map, policy) => {
						map[policy.policy_id] = policy;
						return map;
					},
					{} as Record<string, any>
				);

				// Add policy info to exchanges
				enhancedExchanges.forEach((exchange) => {
					if (policyMap[exchange.policy_id]) {
						exchange.policy = policyMap[exchange.policy_id];
					}
				});
			}
		}

		// Fetch transaction types
		if (transactionIds.length > 0) {
			console.log("Transaction IDs to fetch:", transactionIds);
			const { data: transactions, error } = await supabase
				.from("transactions")
				.select("transaction_id, type, receiver_wallet_address")
				.in("transaction_id", transactionIds);

			console.log("Transactions fetched:", transactions);
			console.log("Transactions fetch error:", error);

			if (!error && transactions) {
				// Create maps for quick lookup
				const transactionMap = transactions.reduce(
					(map, transaction) => {
						map[transaction.transaction_id] = transaction.type;
						return map;
					},
					{} as Record<string, number>
				);

				console.log("Transaction map created:", transactionMap);

				const receiverMap = transactions.reduce(
					(map, transaction) => {
						if (transaction.receiver_wallet_address) {
							map[transaction.transaction_id] = transaction.receiver_wallet_address;
						}
						return map;
					},
					{} as Record<string, string>
				);

				// Add transaction type and receiver wallet address to exchanges
				enhancedExchanges.forEach((exchange) => {
					if (exchange.transaction_id) {
						console.log(`Exchange ${exchange.exchange_id} has transaction_id ${exchange.transaction_id}, type from map: ${transactionMap[exchange.transaction_id]}`);
						if (transactionMap[exchange.transaction_id] !== undefined) {
							exchange.transactionType = transactionMap[exchange.transaction_id];
						}
						if (receiverMap[exchange.transaction_id]) {
							exchange.receiver_wallet_address = receiverMap[exchange.transaction_id];
						}
					}
				});
			}
		}

		// Infer transaction types for exchanges without transaction_id based on status and buttons shown
		enhancedExchanges.forEach(exchange => {
			// If transactionType is still undefined, try to infer it
			if (exchange.transactionType === undefined) {
				// Better logic to determine exchange type based on the actual data
				// For KRW → SGT, the customer pays won, receives SGT
				// For SGT → KRW, the customer sends SGT, receives won
				
				// If exchange has content that includes KRW→SGT keywords
				if (exchange.content && 
					(exchange.content.includes('원화') || 
					 exchange.content.includes('KRW') || 
					 exchange.content.toLowerCase().includes('krw'))) {
					exchange.transactionType = 3; // KRW → SGT
				}
				// If the amount is significantly higher in won than SGT, it's likely KRW → SGT
				else if (exchange.won_amount > exchange.sgt_amount * 100) {
					exchange.transactionType = 3; // KRW → SGT
				}
				// If it's a pending exchange with no transaction yet, default to KRW → SGT
				else if (exchange.status === 0 && !exchange.transaction_id) {
					exchange.transactionType = 3; // KRW → SGT
				}
				// For exchanges with SGT sent status, assume SGT → KRW
				else if (exchange.status === 1) {
					exchange.transactionType = 2; // SGT → KRW
				}
				// Default case if none of the above apply
				else {
					console.log(`Could not infer type for exchange ${exchange.exchange_id}, defaulting to type 3`);
					exchange.transactionType = 3; // Default to KRW → SGT
				}
			}
		});

		return enhancedExchanges;
	};

	const toggleExpand = (exchangeId: string) => {
		if (expandedExchangeId === exchangeId) {
			setExpandedExchangeId(null);
		} else {
			setExpandedExchangeId(exchangeId);
		}
	};

	const getStatusBadge = (status: number) => {
		switch (status) {
			case 0:
				return (
					<span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
						대기중
					</span>
				);
			case 1:
				return (
					<span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
						SGT 전송됨
					</span>
				);
			case 2:
				return (
					<span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
						완료
					</span>
				);
			case 3:
				return (
					<span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
						취소됨
					</span>
				);
			default:
				return (
					<span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
						알 수 없음
					</span>
				);
		}
	};

	const getExchangeTypeBadge = (type?: number) => {
		switch (type) {
			case 2:
				return (
					<span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
						SGT → KRW
					</span>
				);
			case 3:
				return (
					<span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
						KRW → SGT
					</span>
				);
			case 4:
				return (
					<span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
						SGT TVL
					</span>
				);
			default:
				return (
					<span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
						알 수 없음
					</span>
				);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat("ko-KR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("ko-KR", {
			style: "currency",
			currency: "KRW",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const handleApproveWonToSgt = async (exchange: ExtendedExchange) => {
		if (processingExchangeId) return; // Prevent multiple simultaneous operations

		// Since pending exchanges don't have transactions yet, we need to get the receiver_wallet_address
		let receiverWalletAddress = exchange.receiver_wallet_address;
		
		// If we don't have a receiver wallet address, prompt the admin to enter it
		if (!receiverWalletAddress) {
			const promptResult = window.prompt("수신자 지갑 주소를 입력하세요 (Wallet Address)", "");
			if (!promptResult) {
				// User cancelled the prompt
				toast({
					title: "취소됨",
					description: "지갑 주소를 입력하지 않아 취소되었습니다.",
					variant: "destructive",
				});
				return;
			}
			receiverWalletAddress = promptResult.trim();
		}

		try {
			setProcessingExchangeId(exchange.exchange_id);
			
			// Call the backend API to approve the Won to SGT exchange
			const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/transactions/approve-won-to-sgt`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					exchange_id: exchange.exchange_id,
					receiver_wallet_address: receiverWalletAddress,
					sgt_amount: exchange.sgt_amount,
					content: exchange.content || `원화로 SGT 구매 - ${exchange.exchange_id.substring(0, 8)}`,
					created_at: exchange.created_at
				}),
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || 'Failed to approve exchange');
			}
			
			// Refresh the exchanges list
			await fetchExchanges();
			
			toast({
				title: "환전 승인 완료",
				description: `${exchange.sgt_amount} SGT가 지갑으로 전송되었습니다.`,
				variant: "default",
			});
			
		} catch (err) {
			console.error("Error approving Won to SGT exchange:", err);
			toast({
				title: "오류",
				description: `환전 승인에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
				variant: "destructive",
			});
		} finally {
			setProcessingExchangeId(null);
		}
	};

	const handleCompleteSgtToWon = async (exchange: ExtendedExchange) => {
		if (processingExchangeId) return; // Prevent multiple simultaneous operations

		try {
			setProcessingExchangeId(exchange.exchange_id);
			
			// Call the backend API to complete the SGT to Won exchange
			const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/transactions/complete-sgt-to-won`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					exchange_id: exchange.exchange_id
				}),
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || 'Failed to complete exchange');
			}
			
			// Refresh the exchanges list
			await fetchExchanges();
			
			toast({
				title: "환전 완료",
				description: "SGT → 원화 환전이 완료되었습니다.",
				variant: "default",
			});
			
		} catch (err) {
			console.error("Error completing SGT to Won exchange:", err);
			toast({
				title: "오류",
				description: `환전 완료에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
				variant: "destructive",
			});
		} finally {
			setProcessingExchangeId(null);
		}
	};

	const handleProcessSgtBurn = async (exchange: ExtendedExchange) => {
		if (processingExchangeId) return; // Prevent multiple simultaneous operations
		
		// Ensure we have a sender wallet address (which was the receiver in the original transaction)
		if (!exchange.receiver_wallet_address) {
			toast({
				title: "오류",
				description: "송신자 지갑 주소를 찾을 수 없습니다.",
				variant: "destructive",
			});
			return;
		}

		try {
			setProcessingExchangeId(exchange.exchange_id);
			
			// Call the backend API to process the SGT burn
			const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/transactions/process-sgt-burn`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					exchange_id: exchange.exchange_id,
					sender_wallet_address: exchange.receiver_wallet_address,
					sgt_amount: exchange.sgt_amount,
					content: `SGT 소각 처리 - ${exchange.exchange_id.substring(0, 8)}`,
					created_at: exchange.created_at
				}),
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.detail || 'Failed to process SGT burn');
			}
			
			// Refresh the exchanges list
			await fetchExchanges();
			
			toast({
				title: "SGT 소각 완료",
				description: `${exchange.sgt_amount} SGT가 성공적으로 소각되었습니다.`,
				variant: "default",
			});
			
		} catch (err) {
			console.error("Error processing SGT burn:", err);
			toast({
				title: "오류",
				description: `SGT 소각에 실패했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
				variant: "destructive",
			});
		} finally {
			setProcessingExchangeId(null);
		}
	};

	if (isLoading) {
		return (
			<div className="flex justify-center items-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="text-center py-4 text-red-500">
				<p>{error}</p>
				<Button
					onClick={() => fetchExchanges()}
					className="mt-2"
					variant="outline"
				>
					다시 시도
				</Button>
			</div>
		);
	}

	if (exchanges.length === 0) {
		return (
			<div className="text-center py-4 text-gray-500">
				교환 내역이 없습니다.
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
							거래 ID
						</th>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							타입
						</th>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							SGT 금액
						</th>
						<th
							scope="col"
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						>
							원화 금액
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
							생성일
						</th>
					</tr>
				</thead>
				<tbody className="bg-white divide-y divide-gray-200">
					{exchanges.map((exchange) => (
						<React.Fragment key={exchange.exchange_id}>
							<tr
								className={`hover:bg-gray-50 cursor-pointer ${
									expandedExchangeId === exchange.exchange_id ? "bg-gray-50" : ""
								}`}
								onClick={() => toggleExpand(exchange.exchange_id)}
							>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm font-medium text-gray-900 flex items-center">
										{exchange.exchange_id.substring(0, 8)}...
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											className={`ml-2 transition-transform ${
												expandedExchangeId === exchange.exchange_id
													? "rotate-180"
													: ""
											}`}
										>
											<polyline points="6 9 12 15 18 9"></polyline>
										</svg>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									{getExchangeTypeBadge(exchange.transactionType)}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-900">
										{exchange.sgt_amount} SGT
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-900">
										{formatCurrency(exchange.won_amount)}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									{getStatusBadge(exchange.status)}
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-500">
										{formatDate(exchange.created_at)}
									</div>
								</td>
							</tr>
							{expandedExchangeId === exchange.exchange_id && (
								<tr>
									<td colSpan={6} className="px-6 py-4 bg-gray-50">
										<div className="text-sm">
											<h4 className="font-semibold mb-2">상세 정보</h4>
											<dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
												<div>
													<dt className="text-gray-500">거래 ID</dt>
													<dd className="font-medium break-all">
														{exchange.exchange_id}
													</dd>
												</div>
												<div>
													<dt className="text-gray-500">트랜잭션 ID</dt>
													<dd className="font-medium break-all">
														{exchange.transaction_id || "N/A"}
													</dd>
												</div>
												<div>
													<dt className="text-gray-500">사용자 메모</dt>
													<dd className="font-medium">
														{exchange.content || "N/A"}
													</dd>
												</div>
												<div>
													<dt className="text-gray-500">환전소</dt>
													<dd className="font-medium">
														{exchange.liquidSupplier?.bank_name || "N/A"}
													</dd>
												</div>
												<div>
													<dt className="text-gray-500">계좌 번호</dt>
													<dd className="font-medium">
														{exchange.liquidSupplier?.bank_account_no || "N/A"}
													</dd>
												</div>
												<div>
													<dt className="text-gray-500">정책</dt>
													<dd className="font-medium">
														{exchange.policy?.title || "N/A"}
													</dd>
												</div>
												<div>
													<dt className="text-gray-500">수수료율</dt>
													<dd className="font-medium">
														{exchange.policy?.rate
															? `${exchange.policy.rate * 100}%`
															: "N/A"}
													</dd>
												</div>
												<div>
													<dt className="text-gray-500">수수료 금액</dt>
													<dd className="font-medium">
														{exchange.supplier_fee} SGT
													</dd>
												</div>
												{exchange.receiver_wallet_address && (
													<div>
														<dt className="text-gray-500">수신자 지갑 주소</dt>
														<dd className="font-medium break-all">
															{exchange.receiver_wallet_address}
														</dd>
													</div>
												)}
											</dl>
											
											{exchange.status === 0 && (
												<div className="mt-4 flex justify-end">
													<Button 
														onClick={(e) => {
															e.stopPropagation();
															handleApproveWonToSgt(exchange);
														}} 
														disabled={processingExchangeId === exchange.exchange_id}
														className="ml-2"
													>
														{processingExchangeId === exchange.exchange_id ? (
															<>
																<span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
																처리 중...
															</>
														) : "환전 승인 (원화→SGT)"}
													</Button>
												</div>
											)}

											{exchange.status === 1 && exchange.transaction_id && (
												<div className="mt-4 flex justify-end">
													{exchange.transactionType === 2 ? (
														// For SGT → KRW transactions, show the burn button
														<Button 
															onClick={(e) => {
																e.stopPropagation();
																handleProcessSgtBurn(exchange);
															}} 
															disabled={processingExchangeId === exchange.exchange_id}
															className="ml-2"
														>
															{processingExchangeId === exchange.exchange_id ? (
																<>
																	<span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
																	처리 중...
																</>
															) : "SGT 소각 처리"}
														</Button>
													) : (
														// For other transaction types, show the original completion button
														<Button 
															onClick={(e) => {
																e.stopPropagation();
																handleCompleteSgtToWon(exchange);
															}} 
															disabled={processingExchangeId === exchange.exchange_id}
															className="ml-2"
														>
															{processingExchangeId === exchange.exchange_id ? (
																<>
																	<span className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
																	처리 중...
																</>
															) : "환전 완료 (SGT→원화)"}
														</Button>
													)}
												</div>
											)}
										</div>
									</td>
								</tr>
							)}
						</React.Fragment>
					))}
				</tbody>
			</table>
		</div>
	);
} 