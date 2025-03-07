import StoreDetailsContent from "./StoreDetailsContent";

export default async function StoreDetailsPage({
	params,
}: {
	params: Promise<{ storeId: string }>;
}) {
	const resolvedParams = await params;
	const { storeId } = resolvedParams;
	// Use storeId as needed
	return (
		<main className="flex-1">
			<StoreDetailsContent storeId={storeId} />
		</main>
	);
}
