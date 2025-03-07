import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ImagePlaceholder from "@/components/ImagePlaceholder";

interface Review {
	review_id: string;
	review_type: string;
	target_id: string;
	user_id: string;
	rating: number;
	review_text: string;
	created_at: string;
}

interface Store {
	store_id: string;
	store_name: string;
	image_url: string;
}

interface ReviewWithStore extends Review {
	store?: Store;
}

export default function UserReviewsList({ userId }: { userId: string }) {
	const [reviews, setReviews] = useState<ReviewWithStore[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchReviews = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const supabase = createClient();

				// Get all reviews by this user
				const { data: reviewsData, error: reviewsError } = await supabase
					.from("reviews")
					.select("*")
					.eq("user_id", userId)
					.order("created_at", { ascending: false });

				if (reviewsError) throw reviewsError;

				if (!reviewsData || reviewsData.length === 0) {
					setReviews([]);
					return;
				}

				// Get store details for store reviews
				const storeReviews = reviewsData.filter(
					(review) => review.review_type === "store"
				);

				if (storeReviews.length > 0) {
					const storeIds = storeReviews.map((review) => review.target_id);

					const { data: storesData, error: storesError } = await supabase
						.from("stores")
						.select("store_id, store_name, image_url")
						.in("store_id", storeIds);

					if (storesError) throw storesError;

					// Combine the reviews with store data
					const reviewsWithStores = reviewsData.map((review) => {
						if (review.review_type === "store") {
							const store = storesData.find(
								(store) => store.store_id === review.target_id
							);
							return {
								...review,
								store: store || undefined,
							};
						}
						return review;
					});

					setReviews(reviewsWithStores);
				} else {
					setReviews(reviewsData);
				}
			} catch (err) {
				console.error("Error fetching reviews:", err);
				setError("리뷰를 불러오는데 실패했습니다.");
			} finally {
				setIsLoading(false);
			}
		};

		if (userId) {
			fetchReviews();
		}
	}, [userId]);

	const deleteReview = async (reviewId: string) => {
		try {
			const supabase = createClient();
			const { error } = await supabase
				.from("reviews")
				.delete()
				.eq("review_id", reviewId);

			if (error) throw error;

			// Update the local state to remove the deleted review
			setReviews(reviews.filter((review) => review.review_id !== reviewId));
		} catch (err) {
			console.error("Error deleting review:", err);
			setError("리뷰 삭제에 실패했습니다.");
		}
	};

	// Function to render star ratings
	const renderStars = (rating: number) => {
		return (
			<div className="flex">
				{[...Array(5)].map((_, i) => (
					<svg
						key={i}
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill={i < rating ? "currentColor" : "none"}
						stroke="currentColor"
						strokeWidth="2"
						className={i < rating ? "text-yellow-400" : "text-gray-300"}
					>
						<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
					</svg>
				))}
			</div>
		);
	};

	if (isLoading) {
		return <div className="text-center py-4">로딩 중...</div>;
	}

	if (error) {
		return <div className="text-center py-4 text-red-500">{error}</div>;
	}

	if (reviews.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				작성한 리뷰가 없습니다.
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-6">
			{reviews.map((review) => (
				<div
					key={review.review_id}
					className="bg-white rounded-lg shadow-sm overflow-hidden p-6"
				>
					{review.review_type === "store" && review.store && (
						<div className="flex items-center mb-4">
							<div className="mr-3">
								<ImagePlaceholder
									src={review.store.image_url}
									alt={review.store.store_name}
									width={48}
									height={48}
									rounded="md"
								/>
							</div>
							<div>
								<Link
									href={`/stores/${review.target_id}`}
									className="font-medium hover:underline"
								>
									{review.store.store_name}
								</Link>
								<div className="text-sm text-gray-500">
									{new Date(review.created_at).toLocaleDateString()}
								</div>
							</div>
						</div>
					)}

					<div className="mb-3">{renderStars(review.rating)}</div>

					<p className="text-gray-700 mb-4 whitespace-pre-line">
						{review.review_text}
					</p>

					<div className="flex justify-end">
						<button
							onClick={() => deleteReview(review.review_id)}
							className="px-3 py-1 bg-red-50 text-red-600 rounded-md text-sm hover:bg-red-100 transition-colors flex items-center gap-1"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								className="shrink-0"
							>
								<path d="M3 6h18"></path>
								<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
								<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
							</svg>
							삭제
						</button>
					</div>
				</div>
			))}
		</div>
	);
}
