import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ReviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	storeId: string;
	userId: string;
	onReviewSubmitted?: () => void;
}

export default function ReviewModal({
	isOpen,
	onClose,
	storeId,
	userId,
	onReviewSubmitted,
}: ReviewModalProps) {
	const [rating, setRating] = useState<number>(5);
	const [reviewText, setReviewText] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const handleSubmit = async () => {
		if (!reviewText.trim()) {
			toast.error("리뷰 내용을 입력해주세요.");
			return;
		}

		try {
			setIsSubmitting(true);
			const supabase = createClient();

			// Check if user already reviewed this store
			const { data: existingReview } = await supabase
				.from("reviews")
				.select("review_id")
				.eq("user_id", userId)
				.eq("target_id", storeId)
				.eq("review_type", "store")
				.single();

			if (existingReview) {
				// Update existing review
				const { error } = await supabase
					.from("reviews")
					.update({
						rating,
						review_text: reviewText,
					})
					.eq("review_id", existingReview.review_id);

				if (error) throw error;
				toast.success("리뷰가 업데이트되었습니다.");
			} else {
				// Create new review
				const { error } = await supabase.from("reviews").insert({
					user_id: userId,
					target_id: storeId,
					review_type: "store",
					rating,
					review_text: reviewText,
				});

				if (error) throw error;
				toast.success("리뷰가 등록되었습니다.");
			}

			// Reset form and close modal
			setRating(5);
			setReviewText("");
			onClose();

			// Notify parent component that a review was submitted
			if (onReviewSubmitted) {
				onReviewSubmitted();
			}
		} catch (error) {
			console.error("Error submitting review:", error);
			toast.error("리뷰 등록 중 오류가 발생했습니다.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="py-4">
			<div className="mb-6">
				<label className="block text-sm font-medium mb-2">평점</label>
				<div className="flex items-center space-x-1">
					{[1, 2, 3, 4, 5].map((star) => (
						<button
							key={star}
							type="button"
							onClick={() => setRating(star)}
							className="focus:outline-none"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill={star <= rating ? "currentColor" : "none"}
								stroke="currentColor"
								strokeWidth="2"
								className={`${
									star <= rating ? "text-yellow-400" : "text-gray-300"
								} transition-colors`}
							>
								<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
							</svg>
						</button>
					))}
					<span className="ml-2 text-sm text-gray-500">{rating}/5</span>
				</div>
			</div>

			<div className="mb-4">
				<label className="block text-sm font-medium mb-2">리뷰 내용</label>
				<Textarea
					value={reviewText}
					onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
						setReviewText(e.target.value)
					}
					placeholder="매장에 대한 솔직한 리뷰를 작성해주세요."
					rows={5}
					className="resize-none"
				/>
			</div>
		</div>
	);
}
