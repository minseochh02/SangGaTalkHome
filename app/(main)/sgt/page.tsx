"use client";

import Image from "next/image";
import Link from "next/link";

export default function SGTPage() {
	return (
		<div className="w-full max-w-7xl mx-auto px-4 py-8">
			{/* Hero Section */}
			<div className="text-center mb-16">
				<h1 className="text-5xl font-bold mb-6">SGT 포인트 이코노미</h1>
				<p className="text-xl text-gray-600 max-w-2xl mx-auto">
					QUUS의 자체 포인트 SGT로 더 스마트한 지역 상권 생태계를 만나보세요
				</p>
			</div>

			{/* Value Proposition Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
				<div className="bg-[#FFF5E4] rounded-2xl p-8 text-center">
					<div className="w-16 h-16 bg-[#FFA725] rounded-full flex items-center justify-center mx-auto mb-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h3 className="text-xl font-semibold mb-3">가치 저장</h3>
					<p className="text-gray-600">
						SGT 포인트으로 자산을 안전하게 보관하고 가치를 저장하세요
					</p>
				</div>

				<div className="bg-[#C1D8C3] rounded-2xl p-8 text-center">
					<div className="w-16 h-16 bg-[#6A9C89] rounded-full flex items-center justify-center mx-auto mb-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
							/>
						</svg>
					</div>
					<h3 className="text-xl font-semibold mb-3">거래 수단</h3>
					<p className="text-gray-600">
						지역 상권에서 상품과 서비스를 구매할 수 있는 결제 수단
					</p>
				</div>

				<div className="bg-[#FFF5E4] rounded-2xl p-8 text-center">
					<div className="w-16 h-16 bg-[#FFA725] rounded-full flex items-center justify-center mx-auto mb-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8 text-white"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
							/>
						</svg>
					</div>
					<h3 className="text-xl font-semibold mb-3">리워드</h3>
					<p className="text-gray-600">
						SGT 활동과 거래를 통해 SGT 포인트을 보상으로 받으세요
					</p>
				</div>
			</div>

			{/* How It Works */}
			<div className="mb-16">
				<h2 className="text-3xl font-bold mb-8 text-center">
					SGT 포인트 사용 방법
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-12">
					<div className="space-y-6">
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-[#6A9C89] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
								<span className="text-white font-semibold">1</span>
							</div>
							<div>
								<h3 className="text-xl font-semibold mb-2">포인트 획득</h3>
								<p className="text-gray-600">
									SGT 앱에서 리뷰 작성, 스토어 방문 인증, 친구 초대 등 다양한
									활동을 통해 SGT 포인트을 획득하세요.
								</p>
							</div>
						</div>
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-[#6A9C89] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
								<span className="text-white font-semibold">2</span>
							</div>
							<div>
								<h3 className="text-xl font-semibold mb-2">포인트 사용</h3>
								<p className="text-gray-600">
									획득한 SGT 포인트으로 제휴 스토어에서 상품과 서비스를 구매하거나
									특별 할인을 받을 수 있습니다.
								</p>
							</div>
						</div>
						<div className="flex items-start gap-4">
							<div className="w-8 h-8 bg-[#6A9C89] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
								<span className="text-white font-semibold">3</span>
							</div>
							<div>
								<h3 className="text-xl font-semibold mb-2">포인트 적립</h3>
								<p className="text-gray-600">
									SGT 포인트으로 결제 시 추가 포인트을 적립 받아 더 많은 혜택을 누릴
									수 있습니다.
								</p>
							</div>
						</div>
					</div>
					<div className="bg-[#FFF5E4] rounded-2xl p-8">
						<h3 className="text-2xl font-bold mb-6">SGT 포인트 혜택</h3>
						<ul className="space-y-4">
							<li className="flex items-center gap-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-[#FFA725]"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span>제휴 스토어에서 최대 30% 할인</span>
							</li>
							<li className="flex items-center gap-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-[#FFA725]"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span>결제 금액의 5~10% SGT 포인트 적립</span>
							</li>
							<li className="flex items-center gap-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-[#FFA725]"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span>특별 프로모션 상품 구매 가능</span>
							</li>
							<li className="flex items-center gap-3">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6 text-[#FFA725]"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
								<span>VIP 회원 전용 혜택 제공</span>
							</li>
						</ul>
					</div>
				</div>
			</div>

			{/* CTA Section */}
			<div className="bg-gradient-to-r from-[#6A9C89] to-[#C1D8C3] rounded-2xl p-12 text-center text-white">
				<h2 className="text-3xl font-bold mb-6">
					지금 바로 SGT 포인트을 경험해보세요
				</h2>
				<p className="text-lg mb-8 max-w-2xl mx-auto">
					SGT 앱을 다운로드하고 SGT 포인트으로 더 스마트한 소비 생활을 시작하세요.
					새로운 회원에게 웰컴 보너스 10 SGT 증정!
				</p>
				<div className="flex gap-4 justify-center">
					<Link
						href="/sgt/products"
						className="px-6 py-3 bg-[#FFA725] rounded-lg hover:bg-[#FF9500] transition-colors"
					>
						SGT 상품 보기
					</Link>
					<Link
						href="/stores/register"
						className="px-6 py-3 bg-white text-[#6A9C89] rounded-lg hover:bg-gray-100 transition-colors"
					>
						스토어 등록하기
					</Link>
				</div>
			</div>
		</div>
	);
}
