import {
	MapIcon,
	ShoppingBagIcon,
	CurrencyDollarIcon,
	ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const features = [
	{
		name: "주변 상점 찾기",
		description:
			"카테고리나 위치를 기반으로 주변의 최고의 상점들을 찾아보세요.",
		icon: MapIcon,
	},
	{
		name: "SGT 토큰 리워드",
		description: "쇼핑하고 지역 상점과 소통하면서 SGT 토큰을 적립하세요.",
		icon: CurrencyDollarIcon,
	},
	{
		name: "상가톡 연동",
		description: "상가톡을 통해 상점 주인과 다른 쇼핑객들과 직접 소통하세요.",
		icon: ChatBubbleLeftRightIcon,
	},
	{
		name: "특별한 혜택",
		description: "참여 상점들의 특별한 프로모션과 할인 혜택을 만나보세요.",
		icon: ShoppingBagIcon,
	},
];

export default function Features() {
	return (
		<div className="py-8 sm:py-12 md:py-16 bg-white w-full">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h2 className="text-base text-[#FFA725] font-semibold tracking-wide uppercase">
						주요 기능
					</h2>
					<p className="mt-2 text-2xl sm:text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
						더 나은 지역 쇼핑의 시작
					</p>
					<p className="mt-4 max-w-2xl text-lg sm:text-xl text-gray-500 mx-auto">
						SGT와 함께 새로운 쇼핑 경험을 시작하고 지역 커뮤니티와 연결하세요.
					</p>
				</div>

				<div className="mt-8 sm:mt-10">
					<dl className="space-y-8 sm:space-y-10 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-x-6 md:gap-y-10 lg:gap-x-8">
						{features.map((feature) => (
							<div
								key={feature.name}
								className="relative bg-white p-4 rounded-lg hover:shadow-md transition-shadow duration-300"
							>
								<dt>
									<div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-[#C1D8C3] text-[#6A9C89]">
										<feature.icon className="h-6 w-6" aria-hidden="true" />
									</div>
									<p className="ml-16 text-lg leading-6 font-medium text-gray-900">
										{feature.name}
									</p>
								</dt>
								<dd className="mt-2 ml-16 text-base text-gray-500">
									{feature.description}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</div>
		</div>
	);
}
