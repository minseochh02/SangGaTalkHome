import { Metadata } from "next";
import StoreDetailsContent from "./StoreDetailsContent";

export const generateMetadata = async ({
	params,
}: {
	params: { storeId: string };
}): Promise<Metadata> => {
	const { storeId } = params;

	return {
		title: `${storeId} 매장 상세 정보 | SangGaTalk`,
		description: "SangGaTalk 매장 상세 정보 페이지입니다.",
	};
};

type Props = {
	params: { storeId: string };
	searchParams: { [key: string]: string | string[] | undefined };
};

export default function StoreDetailsPage({ params, searchParams }: Props) {
	const { storeId } = params;

	return (
		<main className="flex-1">
			<StoreDetailsContent storeId={storeId} />
		</main>
	);
}
