import { NoticeDetailContent } from "./NoticeDetailContent";

export const metadata = {
	title: "공지사항 상세 - SanggaTalk",
	description: "SanggaTalk의 공지사항을 확인하세요.",
};

type Params = Promise<{ id: string }>;

export default async function NoticeDetailPage(props: { params: Params }) {
	const params = await props.params;
	return <NoticeDetailContent noticeId={parseInt(params.id)} />;
}
