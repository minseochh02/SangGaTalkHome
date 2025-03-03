"use client";

import { useState } from "react";
import Image from "next/image";

interface Product {
	id: number;
	name: string;
	description: string;
	price: number;
	sgtPrice: number;
	imageUrl: string;
	category: string;
}

const dummyProducts: Product[] = [
	{
		id: 1,
		name: "프리미엄 식사권",
		description: "지역 맛집에서 사용 가능한 프리미엄 식사권",
		price: 50000,
		sgtPrice: 45,
		imageUrl: "/images/products/meal-voucher.jpg",
		category: "식사권",
	},
	{
		id: 2,
		name: "뷰티 패키지",
		description: "헤어&메이크업 토탈 뷰티 케어 패키지",
		price: 100000,
		sgtPrice: 90,
		imageUrl: "/images/products/beauty-package.jpg",
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
			<div className="relative w-full h-[300px] rounded-2xl overflow-hidden mb-12 bg-gradient-to-r from-[#FFF5E4] to-[#C1D8C3]">
				<div className="absolute inset-0 flex items-center justify-start p-12">
					<div className="max-w-lg">
						<h1 className="text-4xl font-bold mb-4">SGT 상품 특별 프로모션</h1>
						<p className="text-lg mb-6">
							SGT 토큰으로 더 저렴하게 구매하세요! 지금 구매하시면 추가 10% SGT
							적립
						</p>
						<button className="px-6 py-3 bg-[#FFA725] text-white rounded-lg hover:bg-[#FF9500] transition-colors">
							프로모션 더보기
						</button>
					</div>
				</div>
			</div>

			{/* Category Filter */}
			<div className="flex gap-4 mb-8">
				{categories.map((category) => (
					<button
						key={category}
						onClick={() => setSelectedCategory(category)}
						className={`px-4 py-2 rounded-lg transition-colors ${
							selectedCategory === category
								? "bg-[#6A9C89] text-white"
								: "bg-gray-100 hover:bg-gray-200"
						}`}
					>
						{category}
					</button>
				))}
			</div>

			{/* Products Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{filteredProducts.map((product) => (
					<div
						key={product.id}
						className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
					>
						<div className="relative h-48 w-full bg-gray-200">
							<Image
								src={product.imageUrl}
								alt={product.name}
								fill
								className="object-cover"
							/>
						</div>
						<div className="p-6">
							<div className="flex justify-between items-start mb-4">
								<div>
									<h3 className="text-xl font-semibold mb-2">{product.name}</h3>
									<p className="text-gray-600">{product.description}</p>
								</div>
								<span className="px-3 py-1 bg-[#FFF5E4] text-[#FFA725] rounded-full text-sm">
									{product.category}
								</span>
							</div>
							<div className="flex justify-between items-center">
								<div>
									<p className="text-gray-500 line-through">
										{product.price.toLocaleString()}원
									</p>
									<p className="text-lg font-bold text-[#FFA725]">
										{product.sgtPrice} SGT
									</p>
								</div>
								<button className="px-4 py-2 bg-[#6A9C89] text-white rounded-lg hover:bg-[#5B8B78] transition-colors">
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
