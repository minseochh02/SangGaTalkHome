"use client";

import { useState } from "react";
import Image from "next/image";

interface Product {
	id: number;
	name: string;
	description: string;
	won_price: number;
	sgt_price: number;
	image_url: string;	
	category: string;
}

const dummyProducts: Product[] = [
	{
		id: 1,
		name: "프리미엄 식사권",
		description: "지역 맛집에서 사용 가능한 프리미엄 식사권",
		won_price: 50000,
		sgt_price: 45,
		image_url: "/images/products/meal-voucher.jpg",
		category: "식사권",
	},
	{
		id: 2,
		name: "뷰티 패키지",
		description: "헤어&메이크업 토탈 뷰티 케어 패키지",
		won_price: 100000,
		sgt_price: 90,
		image_url: "/images/products/beauty-package.jpg",
		category: "뷰티",
	},
	// Add more dummy products as needed
];

const categories = ["전체", "식사권", "뷰티", "쇼핑", "문화"];

export default function SGTProducts() {
	const [selectedCategory, setSelectedCategory] = useState("전체");

	const filteredProducts =
		selectedCategory === "전체"
			? dummyProducts
			: dummyProducts.filter(
					(product) => product.category === selectedCategory
				);

	return (
		<div className="w-full max-w-7xl mx-auto px-4 py-8">
			{/* Hero Banner */}
			<div className="relative w-full h-[200px] sm:h-[250px] md:h-[300px] rounded-2xl overflow-hidden mb-8 md:mb-12 bg-gradient-to-r from-[#FFF5E4] to-[#C1D8C3]">
				<div className="absolute inset-0 flex items-center justify-start p-6 md:p-12">
					<div className="max-w-lg">
						<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4">
							SGT 상품 특별 프로모션
						</h1>
						<p className="text-sm md:text-lg mb-4 md:mb-6">
							SGT 포인트으로 더 저렴하게 구매하세요! 지금 구매하시면 추가 10% SGT
							적립
						</p>
						<button className="px-4 py-2 md:px-6 md:py-3 bg-[#FFA725] text-white text-sm md:text-base rounded-lg hover:bg-[#FF9500] transition-colors">
							프로모션 더보기
						</button>
					</div>
				</div>
			</div>

			{/* Category Filter - Scrollable on mobile */}
			<div className="flex overflow-x-auto pb-2 mb-6 md:mb-8 no-scrollbar">
				<div className="flex gap-2 md:gap-4">
					{categories.map((category) => (
						<button
							key={category}
							onClick={() => setSelectedCategory(category)}
							className={`px-3 py-1 md:px-4 md:py-2 rounded-lg whitespace-nowrap transition-colors ${
								selectedCategory === category
									? "bg-[#6A9C89] text-white"
									: "bg-gray-100 hover:bg-gray-200"
							}`}
						>
							{category}
						</button>
					))}
				</div>
			</div>

			{/* Products Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
				{filteredProducts.map((product) => (
					<div
						key={product.id}
						className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
					>
						<div className="relative h-40 sm:h-48 w-full bg-gray-200">
							<Image
								src={product.image_url}
								alt={product.name}
								fill
								className="object-cover"
							/>
						</div>
						<div className="p-4 md:p-6">
							<div className="flex justify-between items-start mb-3 md:mb-4">
								<div>
									<h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">
										{product.name}
									</h3>
									<p className="text-sm text-gray-600">{product.description}</p>
								</div>
								<span className="px-2 py-1 md:px-3 md:py-1 bg-[#FFF5E4] text-[#FFA725] rounded-full text-xs md:text-sm">
									{product.category}
								</span>
							</div>
							<div className="flex justify-between items-center">
								<div>
									<p className="text-gray-500 line-through text-sm">
										{product.won_price.toLocaleString()}원
									</p>
									<p className="text-base md:text-lg font-bold text-[#FFA725]">
										{product.sgt_price} SGT
									</p>
								</div>
								<button className="px-3 py-1 md:px-4 md:py-2 bg-[#6A9C89] text-white text-sm rounded-lg hover:bg-[#5B8B78] transition-colors">
									구매하기
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
