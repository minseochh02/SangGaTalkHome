"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MarkdownContent from "@/components/MarkdownContent";

export default function MarkdownEditor({
	params,
}: {
	params: { storeId: string };
}) {
	const supabase = createClient();
	const router = useRouter();
	const { storeId } = params;

	const [markdown, setMarkdown] = useState("");
	const [isPreviewMode, setIsPreviewMode] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isOwner, setIsOwner] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load store data and check ownership
	useEffect(() => {
		const checkOwnershipAndLoadData = async () => {
			try {
				setIsLoading(true);

				// Get current user
				const {
					data: { user },
				} = await supabase.auth.getUser();

				if (!user) {
					setError("로그인이 필요합니다.");
					return;
				}

				// Check if user owns this store
				const { data: store, error: storeError } = await supabase
					.from("stores")
					.select("user_id, markdown_content")
					.eq("store_id", storeId)
					.single();

				if (storeError) {
					throw storeError;
				}

				if (store.user_id !== user.id) {
					setError(
						"해당 매장의 소유자만 마크다운 컨텐츠를 수정할 수 있습니다."
					);
					return;
				}

				// User is owner
				setIsOwner(true);

				// Load existing markdown content if available
				if (store.markdown_content) {
					setMarkdown(store.markdown_content);
				}
			} catch (err) {
				console.error("Error loading store data:", err);
				setError("매장 정보를 불러오는 중 오류가 발생했습니다.");
			} finally {
				setIsLoading(false);
			}
		};

		checkOwnershipAndLoadData();
	}, [storeId, supabase]);

	// Save markdown content
	const saveMarkdown = async () => {
		try {
			setIsSaving(true);

			const { error } = await supabase
				.from("stores")
				.update({ markdown_content: markdown })
				.eq("store_id", storeId);

			if (error) throw error;

			// Navigate back to store page
			router.push(`/stores/${storeId}`);
		} catch (err) {
			console.error("Error saving markdown:", err);
			setError("마크다운 저장 중 오류가 발생했습니다.");
			setIsSaving(false);
		}
	};

	// Handle loading state
	if (isLoading) {
		return (
			<div className="container mx-auto py-16 px-4">
				<div className="flex justify-center items-center min-h-[50vh]">
					<div className="text-center">
						<div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p className="text-lg">매장 정보를 불러오는 중...</p>
					</div>
				</div>
			</div>
		);
	}

	// Handle error state
	if (error || !isOwner) {
		return (
			<div className="container mx-auto py-16 px-4">
				<div className="flex justify-center items-center min-h-[50vh]">
					<div className="text-center">
						<div className="text-5xl mb-4">⚠️</div>
						<h2 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h2>
						<p className="text-gray-600 mb-6">
							{error || "이 페이지에 접근할 권한이 없습니다."}
						</p>
						<Link
							href={`/stores/${storeId}`}
							className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
						>
							매장 페이지로 돌아가기
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="mb-6 flex items-center justify-between">
				<Link
					href={`/stores/${storeId}`}
					className="inline-flex items-center text-primary hover:underline"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						className="mr-2"
					>
						<path d="M19 12H5M12 19l-7-7 7-7" />
					</svg>
					매장 페이지로 돌아가기
				</Link>

				<div className="flex gap-3">
					<button
						onClick={() => setIsPreviewMode(!isPreviewMode)}
						className={`px-4 py-2 rounded-lg transition-colors ${
							isPreviewMode
								? "bg-gray-200 text-gray-800"
								: "bg-primary/10 text-primary"
						}`}
					>
						{isPreviewMode ? "편집 모드" : "미리보기"}
					</button>

					<button
						onClick={saveMarkdown}
						disabled={isSaving}
						className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
					>
						{isSaving ? "저장 중..." : "변경사항 저장"}
					</button>
				</div>
			</div>

			<div className="bg-white rounded-xl shadow-lg overflow-hidden">
				<div className="p-4 bg-gray-50 border-b">
					<h1 className="text-xl font-bold">매장 소개 마크다운 편집</h1>
					<p className="text-sm text-gray-500 mt-1">
						마크다운을 사용하여 매장에 대한 풍부한 설명을 추가하세요. 이미지,
						링크, 표 등을 지원합니다.
					</p>
				</div>

				{isPreviewMode ? (
					<div className="p-6">
						<div className="bg-gray-50 p-4 mb-4 rounded-lg">
							<h3 className="font-medium text-gray-700 mb-2">미리보기</h3>
						</div>

						{markdown ? (
							<MarkdownContent content={markdown} className="p-2" />
						) : (
							<div className="text-center py-12 text-gray-500">
								<p>미리볼 내용이 없습니다. 마크다운을 입력해주세요.</p>
							</div>
						)}
					</div>
				) : (
					<div className="p-6">
						<textarea
							value={markdown}
							onChange={(e) => setMarkdown(e.target.value)}
							placeholder="# 매장 소개
              
## 우리 매장에 대해서

마크다운 문법을 활용하여 매장 소개를 작성해보세요!

- 글머리 기호를 사용한 목록
- 다양한 **텍스트 스타일**
- [링크](https://example.com)
- 이미지 등을 추가할 수 있습니다

표도 사용 가능합니다:

| 상품 | 가격 |
|------|------|
| 상품1 | 10,000원 |
| 상품2 | 20,000원 |"
							className="w-full h-[60vh] p-4 border rounded-lg font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
						/>

						<div className="mt-4 text-sm text-gray-500">
							<p>마크다운 도움말:</p>
							<ul className="list-disc pl-5 mt-2 space-y-1">
								<li>
									<code className="bg-gray-100 px-1 rounded"># 제목</code> - 큰
									제목
								</li>
								<li>
									<code className="bg-gray-100 px-1 rounded">## 부제목</code> -
									중간 제목
								</li>
								<li>
									<code className="bg-gray-100 px-1 rounded">**굵게**</code> -{" "}
									<strong>굵게</strong>
								</li>
								<li>
									<code className="bg-gray-100 px-1 rounded">*기울임*</code> -{" "}
									<em>기울임</em>
								</li>
								<li>
									<code className="bg-gray-100 px-1 rounded">
										[링크텍스트](URL)
									</code>{" "}
									- 링크
								</li>
								<li>
									<code className="bg-gray-100 px-1 rounded">
										![대체텍스트](이미지URL)
									</code>{" "}
									- 이미지
								</li>
								<li>
									<code className="bg-gray-100 px-1 rounded">- 항목</code> -
									글머리 기호 목록
								</li>
							</ul>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
