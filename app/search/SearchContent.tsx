"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

interface SearchResult {
	id: number;
	type: "store" | "product";
	name: string;
	description: string;
	category: string;
	imageUrl: string;
	location?: string;
	price?: number;
	sgtPrice?: number;
}

const dummyResults: SearchResult[] = [
	{
		id: 1,
		type: "store",
		name: "카페 상가",
		description: "분위기 좋은 로스터리 카페",
		category: "카페",
		imageUrl: "/images/stores/cafe.jpg",
		location: "서울 강남구",
	},
	{
		id: 2,
		type: "product",
		name: "프리미엄 식사권",
		description: "고급 레스토랑 식사권",
		category: "식사권",
		imageUrl: "/images/products/meal-voucher.jpg",
		price: 50000,
		sgtPrice: 45,
	},
	// Add more dummy results as needed
];

const categories = [
	"전체",
	"음식점",
	"카페",
	"쇼핑",
	"뷰티/미용",
	"문화/예술",
	"교육",
	"생활/서비스",
];
const sortOptions = [
	"관련도순",
	"거리순",
	"가격낮은순",
	"가격높은순",
	"평점높은순",
];

// Create a separate SearchResults component
function SearchResults({
	isLoading,
	filteredResults,
	searchTerm,
}: {
	isLoading: boolean;
	filteredResults: SearchResult[];
	searchTerm: string;
}) {
	if (isLoading) {
		return (
			<div className="text-center py-12">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFA725] mx-auto"></div>
				<p className="mt-4 text-gray-600">검색 중...</p>
			</div>
		);
	}

	if (filteredResults.length > 0) {
		return (
			<>
				<h2 className="text-xl font-semibold mb-4">
					검색 결과 ({filteredResults.length}건)
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredResults.map((result) => (
						<Link
							key={`${result.type}-${result.id}`}
							href={
								result.type === "store"
									? `/stores/${result.id}`
									: `/sgt/products/${result.id}`
							}
							className="block bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
						>
							<div className="relative h-48 w-full bg-gray-200">
								<Image
									src={result.imageUrl}
									alt={result.name}
									fill
									className="object-cover"
								/>
								<div className="absolute top-4 right-4 px-3 py-1 bg-white/90 rounded-full text-sm">
									{result.type === "store" ? "매장" : "상품"}
								</div>
							</div>
							<div className="p-6">
								<div className="flex justify-between items-start mb-2">
									<h3 className="text-xl font-semibold">{result.name}</h3>
									<span className="px-3 py-1 bg-[#FFF5E4] text-[#FFA725] rounded-full text-sm">
										{result.category}
									</span>
								</div>
								<p className="text-gray-600 mb-4">{result.description}</p>
								{result.type === "store" ? (
									<p className="text-gray-500">{result.location}</p>
								) : (
									<div>
										<p className="text-gray-500 line-through">
											{result.price?.toLocaleString()}원
										</p>
										<p className="text-lg font-bold text-[#FFA725]">
											{result.sgtPrice} SGT
										</p>
									</div>
								)}
							</div>
						</Link>
					))}
				</div>
			</>
		);
	}

	if (searchTerm) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-600">검색 결과가 없습니다.</p>
				<p className="text-gray-500 mt-2">다른 검색어로 시도해보세요.</p>
			</div>
		);
	}

	return null;
}

export function SearchPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [searchTerm, setSearchTerm] = useState(searchParams?.get("q") || "");
	const [selectedCategory, setSelectedCategory] = useState("전체");
	const [selectedSort, setSelectedSort] = useState("관련도순");
	const [searchType, setSearchType] = useState<"all" | "store" | "product">(
		"all"
	);
	const [isLoading, setIsLoading] = useState(false);
	const [results, setResults] = useState<SearchResult[]>([]);

	useEffect(() => {
		const query = searchParams?.get("q");
		if (query) {
			setSearchTerm(query);
			performSearch(query);
		}
	}, [searchParams]);

	const performSearch = async (query: string) => {
		setIsLoading(true);
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 1000));
		setResults(dummyResults);
		setIsLoading(false);
	};

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		if (searchTerm.trim()) {
			router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
		}
	};

	const filteredResults = results.filter((result) => {
		if (searchType !== "all" && result.type !== searchType) return false;
		if (selectedCategory !== "전체" && result.category !== selectedCategory)
			return false;
		return true;
	});

	return (
		<div className="w-full max-w-7xl mx-auto px-4 py-8">
			{/* Search Header */}
			<div className="mb-8">
				<form onSubmit={handleSearch} className="max-w-2xl mx-auto">
					<div className="relative">
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="매장명, 상품명, 지역명으로 검색"
							className="w-full px-4 py-3 pl-12 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
						/>
						<svg
							className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						<button
							type="submit"
							className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-[#FFA725] text-white rounded-lg hover:bg-[#FF9500] transition-colors"
						>
							검색
						</button>
					</div>
				</form>
			</div>

			{/* Filters */}
			<div className="mb-8 space-y-4">
				<div className="flex items-center gap-4 pb-4 border-b">
					<span className="text-gray-600">검색 유형:</span>
					<div className="flex gap-2">
						{[
							{ value: "all", label: "전체" },
							{ value: "store", label: "매장" },
							{ value: "product", label: "상품" },
						].map((type) => (
							<button
								key={type.value}
								onClick={() => setSearchType(type.value as any)}
								className={`px-4 py-2 rounded-lg transition-colors ${
									searchType === type.value
										? "bg-[#6A9C89] text-white"
										: "bg-gray-100 hover:bg-gray-200"
								}`}
							>
								{type.label}
							</button>
						))}
					</div>
				</div>

				<div className="flex flex-wrap gap-4">
					<div className="flex items-center gap-4">
						<span className="text-gray-600">카테고리:</span>
						<select
							value={selectedCategory}
							onChange={(e) => setSelectedCategory(e.target.value)}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
						>
							{categories.map((category) => (
								<option key={category} value={category}>
									{category}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center gap-4">
						<span className="text-gray-600">정렬:</span>
						<select
							value={selectedSort}
							onChange={(e) => setSelectedSort(e.target.value)}
							className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FFA725] focus:border-transparent"
						>
							{sortOptions.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Search Results */}
			<div className="space-y-6">
				<Suspense
					fallback={
						<div className="text-center py-12">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFA725] mx-auto"></div>
							<p className="mt-4 text-gray-600">검색 결과 로딩 중...</p>
						</div>
					}
				>
					<SearchResults
						isLoading={isLoading}
						filteredResults={filteredResults}
						searchTerm={searchTerm}
					/>
				</Suspense>
			</div>
		</div>
	);
}
