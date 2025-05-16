"use client";

import { useState } from "react";
import Link from "next/link";

type Notice = {
	id: number;
	title: string;
	date: string;
	views: number;
	category: string;
	isImportant?: boolean;
};

// Sample data - replace with actual data from your backend
const SAMPLE_NOTICES: Notice[] = [
	{
		id: 1,
		title: "[공지] SGT 서비스 업데이트 안내",
		date: "2024-03-01",
		views: 1250,
		category: "서비스 공지",
		isImportant: true,
	},
	{
		id: 2,
		title: "[이벤트] SGT 토큰 보상 이벤트 안내",
		date: "2024-02-28",
		views: 980,
		category: "이벤트",
	},
	{
		id: 3,
		title: "[안내] 2024년 설 연휴 고객센터 운영 안내",
		date: "2024-02-15",
		views: 756,
		category: "운영 공지",
	},
];

export function NoticesContent() {
	const [searchTerm, setSearchTerm] = useState("");
	const [sortBy, setSortBy] = useState<"date" | "views">("date");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	// Filter notices based on search term
	const filteredNotices = SAMPLE_NOTICES.filter(
		(notice) =>
			notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			notice.category.toLowerCase().includes(searchTerm.toLowerCase())
	);

	// Sort notices
	const sortedNotices = [...filteredNotices].sort((a, b) => {
		if (sortBy === "date") {
			return new Date(b.date).getTime() - new Date(a.date).getTime();
		}
		return b.views - a.views;
	});

	// Calculate pagination
	const totalPages = Math.ceil(sortedNotices.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedNotices = sortedNotices.slice(
		startIndex,
		startIndex + itemsPerPage
	);

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="max-w-4xl mx-auto">
				<h1 className="text-3xl font-bold mb-8">공지사항</h1>

				{/* Search and Sort Controls */}
				<div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
					<div className="relative flex-1">
						<input
							type="text"
							placeholder="검색어를 입력하세요"
							className="w-full px-4 py-2 rounded-md border border-input"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
					<select
						className="px-4 py-2 rounded-md border border-input bg-background"
						value={sortBy}
						onChange={(e) => setSortBy(e.target.value as "date" | "views")}
					>
						<option value="date">최신순</option>
						<option value="views">조회순</option>
					</select>
				</div>

				{/* Notices List */}
				<div className="space-y-4">
					{paginatedNotices.map((notice) => (
						<Link
							href={`/support/notices/${notice.id}`}
							key={notice.id}
							className="block p-4 rounded-lg border border-border hover:border-primary transition-colors"
						>
							<div className="flex items-start justify-between">
								<div>
									<div className="flex items-center gap-2 mb-2">
										<span className="text-sm px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
											{notice.category}
										</span>
										{notice.isImportant && (
											<span className="text-sm px-2 py-1 rounded-full bg-destructive text-destructive-foreground">
												중요
											</span>
										)}
									</div>
									<h2 className="text-lg font-semibold mb-2">{notice.title}</h2>
									<div className="text-sm text-muted-foreground">
										{notice.date} · 조회 {notice.views.toLocaleString()}
									</div>
								</div>
							</div>
						</Link>
					))}
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex justify-center items-center gap-2 mt-8">
						<button
							onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
							disabled={currentPage === 1}
							className="px-3 py-1 rounded-md border border-input disabled:opacity-50"
						>
							이전
						</button>
						<span className="mx-4">
							{currentPage} / {totalPages}
						</span>
						<button
							onClick={() =>
								setCurrentPage((prev) => Math.min(prev + 1, totalPages))
							}
							disabled={currentPage === totalPages}
							className="px-3 py-1 rounded-md border border-input disabled:opacity-50"
						>
							다음
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
