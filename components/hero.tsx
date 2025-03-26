import Link from "next/link";
import { FaDownload } from "react-icons/fa";

export default function Hero() {
	return (
		<div className="relative bg-[#FFF5E4] overflow-hidden w-full">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="relative z-10 py-8 sm:py-12 md:py-16 lg:py-20 xl:py-24">
					<main className="mx-auto max-w-7xl">
						<div className="text-center lg:text-left">
							<h1 className="text-3xl tracking-tight font-extrabold text-gray-900 sm:text-4xl md:text-5xl lg:text-6xl">
								<span className="block">내 주변 스토어 찾기</span>
								<span className="block text-[#FFA725]">SGT 토큰 적립하기</span>
							</h1>
							<p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
								지역 스토어과 연결하고, 리워드를 받으며, SGT 토큰과 함께하는
								차세대 쇼핑 경험을 만나보세요.
							</p>
							<div className="mt-5 sm:mt-8 flex flex-col sm:flex-row sm:justify-center lg:justify-start gap-3 sm:gap-3">
								<div className="rounded-md shadow w-full sm:w-auto">
									<Link
										href="/stores/categories"
										className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#FFA725] hover:bg-[#FF9500] md:py-4 md:text-lg md:px-8"
									>
										스토어 둘러보기
									</Link>
								</div>
								<div className="sm:mt-0 w-full sm:w-auto">
									<Link
										href="/stores/register"
										className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-[#6A9C89] bg-[#C1D8C3] hover:bg-[#A1C8A3] md:py-4 md:text-lg md:px-8"
									>
										스토어 등록하기
									</Link>
								</div>
								<div className="sm:mt-0 w-full sm:w-auto">
									<Link
										href="/download"
										className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#4A90E2] hover:bg-[#357ABD] md:py-4 md:text-lg md:px-8"
									>
										<FaDownload className="mr-2" />앱 다운로드
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
