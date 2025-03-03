import Link from "next/link";

export default function Hero() {
	return (
		<div className="relative bg-[#FFF5E4] overflow-hidden">
			<div className="max-w-7xl mx-auto">
				<div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
					<main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
						<div className="sm:text-center lg:text-left">
							<h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
								<span className="block">내 주변 상점 찾기</span>
								<span className="block text-[#FFA725]">SGT 토큰 적립하기</span>
							</h1>
							<p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
								지역 상점과 연결하고, 리워드를 받으며, SGT 토큰과 함께하는
								차세대 쇼핑 경험을 만나보세요.
							</p>
							<div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
								<div className="rounded-md shadow">
									<Link
										href="/stores/locations"
										className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#FFA725] hover:bg-[#FF9500] md:py-4 md:text-lg md:px-10"
									>
										상점 둘러보기
									</Link>
								</div>
								<div className="mt-3 sm:mt-0 sm:ml-3">
									<Link
										href="/stores/register"
										className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-[#6A9C89] bg-[#C1D8C3] hover:bg-[#A1C8A3] md:py-4 md:text-lg md:px-10"
									>
										상점 등록하기
									</Link>
								</div>
							</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	);
}
