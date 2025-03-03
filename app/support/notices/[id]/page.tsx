import { NoticeDetailContent } from "./NoticeDetailContent";

type Props = {
	params: {
		id: string;
	};
	searchParams: { [key: string]: string | string[] | undefined };
};

export const metadata = {
	title: "공지사항 상세 - SanggaTalk",
	description: "SanggaTalk의 공지사항을 확인하세요.",
};

export default function NoticeDetailPage({ params }: Props) {
	return <NoticeDetailContent noticeId={parseInt(params.id)} />;
}
