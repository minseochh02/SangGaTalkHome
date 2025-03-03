"use client";

import { useState } from "react";
import { Category, Store } from "@/utils/type";

// Mock data - replace with actual API calls
const categories: Category[] = [
	{ category_id: 1, category_name: "음식", description: "맛있는 음식점들" },
	{ category_id: 2, category_name: "생활", description: "생활용품 매장" },
	{ category_id: 3, category_name: "쇼핑", description: "패션 및 쇼핑" },
];

const stores: Store[] = [
	{
		store_id: 1,
		store_name: "맛있는 식당",
		category_id: 1,
		description: "전통 한식의 맛을 즐겨보세요",
		image_url: "/placeholder.jpg",
		address: "서울시 강남구",
		store_type: 1,
	},
	{
		store_id: 2,
		store_name: "생활마트",
		category_id: 2,
		description: "편리한 생활용품점",
		image_url: "/placeholder.jpg",
		address: "서울시 서초구",
		store_type: 1,
	},
];

export default function CategoriesStoresContent() {
	const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
	const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

	const filteredStores = selectedCategory
		? stores.filter((store) => store.category_id === selectedCategory)
		: stores;

	return (
		<div className="flex flex-col md:flex-row min-h-screen">
			{/* Mobile filter toggle */}
			<div className="md:hidden p-4 border-b">
				<button
					onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
					className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 rounded-lg"
				>
					<span>카테고리 필터</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={`transition-transform ${mobileFilterOpen ? "rotate-180" : ""}`}
					>
						<polyline points="6 9 12 15 18 9"></polyline>
					</svg>
				</button>
			</div>

			{/* Categories Sidebar */}
			<div
				className={`${mobileFilterOpen ? "block" : "hidden"} md:block w-full md:w-64 bg-gray-50 p-6 border-r shrink-0`}
			>
				<h2 className="text-lg font-bold mb-4">카테고리</h2>
				<div className="flex flex-col gap-2">
					<button
						onClick={() => {
							setSelectedCategory(null);
							setMobileFilterOpen(false);
						}}
						className={`px-4 py-3 rounded-lg text-left ${
							selectedCategory === null
								? "bg-primary text-white"
								: "hover:bg-primary/10"
						}`}
					>
						전체
					</button>
					{categories.map((category) => (
						<button
							key={category.category_id}
							onClick={() => {
								setSelectedCategory(category.category_id);
								setMobileFilterOpen(false);
							}}
							className={`px-4 py-3 rounded-lg text-left ${
								selectedCategory === category.category_id
									? "bg-primary text-white"
									: "hover:bg-primary/10"
							}`}
						>
							{category.category_name}
						</button>
					))}
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 p-4 md:p-8">
				{/* Stores Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
					{filteredStores.map((store) => (
						<div
							key={store.store_id}
							className="border border-primary/20 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-200 hover:border-primary/40"
						>
							<div className="aspect-[4/3] bg-gray-100 relative">
								{/* Replace with actual image */}
								<div className="absolute inset-0 flex items-center justify-center text-gray-400">
									Store Image
								</div>
							</div>
							<div className="p-4 md:p-6">
								<h3 className="font-bold text-lg mb-2 md:mb-3">
									{store.store_name}
								</h3>
								<p className="text-gray-600 text-sm mb-2 md:mb-3">
									{store.description}
								</p>
								<p className="text-gray-500 text-sm">{store.address}</p>
								<div className="mt-4 md:mt-6">
									<button className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors duration-200 text-base font-medium flex items-center gap-2">
										자세히 보기
										<span className="text-lg">→</span>
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
