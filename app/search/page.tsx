import { Suspense } from "react";
import { SearchPageContent } from "./SearchContent";

function SearchLoading() {
	return (
		<div className="w-full max-w-7xl mx-auto px-4 py-8 text-center">
			<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFA725] mx-auto"></div>
			<p className="mt-4 text-gray-600">검색 페이지 로딩 중...</p>
		</div>
	);
}

export default function SearchPage() {
	return (
		<Suspense fallback={<SearchLoading />}>
			<SearchPageContent />
		</Suspense>
	);
}
