"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Notice = {
	id: number;
	title: string;
	content: string;
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
		content: `안녕하세요, SGT 운영팀입니다.

서비스 품질 향상을 위한 업데이트를 진행할 예정입니다.

1. 업데이트 일시
   - 2024년 3월 15일 (금) 02:00 ~ 06:00 (4시간)

2. 업데이트 내용
   - 스토어 검색 기능 개선
   - SGT 토큰 리워드 시스템 업데이트
   - UI/UX 개선

3. 유의사항
   - 업데이트 기간 동안 서비스 이용이 제한됩니다.
   - 업데이트 완료 시간은 상황에 따라 변동될 수 있습니다.

이용에 불편을 드려 죄송합니다.
더 나은 서비스를 제공하기 위해 최선을 다하겠습니다.

감사합니다.`,
		date: "2024-03-01",
		views: 1250,
		category: "서비스 공지",
		isImportant: true,
	},
	{
		id: 2,
		title: "[이벤트] SGT 토큰 보상 이벤트 안내",
		content: "이벤트 내용...",
		date: "2024-02-28",
		views: 980,
		category: "이벤트",
	},
	{
		id: 3,
		title: "[안내] 2024년 설 연휴 고객센터 운영 안내",
		content: "운영 안내 내용...",
		date: "2024-02-15",
		views: 756,
		category: "운영 공지",
	},
];

type Props = {
	noticeId: number;
};

export function NoticeDetailContent({ noticeId }: Props) {
	const [notice, setNotice] = useState<Notice | null>(null);

	useEffect(() => {
		// Replace with actual API call
		const foundNotice = SAMPLE_NOTICES.find((n) => n.id === noticeId);
		setNotice(foundNotice || null);
	}, [noticeId]);

	if (!notice) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto text-center">
					<h1 className="text-2xl font-bold mb-4">
						존재하지 않는 공지사항입니다.
					</h1>
					<Link
						href="/support/notices"
						className="text-primary hover:text-primary/80"
					>
						공지사항 목록으로 돌아가기
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="max-w-4xl mx-auto">
				<div className="mb-8">
					<Link
						href="/support/notices"
						className="text-primary hover:text-primary/80 flex items-center gap-2"
					>
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
						>
							<path d="m15 18-6-6 6-6" />
						</svg>
						목록으로 돌아가기
					</Link>
				</div>

				<article className="bg-card rounded-lg p-6 shadow-sm">
					<header className="mb-8">
						<div className="flex items-center gap-2 mb-4">
							<span className="text-sm px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
								{notice.category}
							</span>
							{notice.isImportant && (
								<span className="text-sm px-2 py-1 rounded-full bg-destructive text-destructive-foreground">
									중요
								</span>
							)}
						</div>
						<h1 className="text-2xl font-bold mb-4">{notice.title}</h1>
						<div className="text-sm text-muted-foreground">
							{notice.date} · 조회 {notice.views.toLocaleString()}
						</div>
					</header>

					<div className="prose prose-sm max-w-none">
						{notice.content.split("\n").map((paragraph, index) => (
							<p key={index} className="mb-4">
								{paragraph}
							</p>
						))}
					</div>
				</article>
			</div>
		</div>
	);
}
