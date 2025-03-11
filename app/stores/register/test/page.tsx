"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";

export default function ImageUploadTest() {
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Clean up the preview URL when component unmounts or when a new image is selected
	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
		};
	}, [previewUrl]);

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			// Clean up previous preview URL
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}

			const file = e.target.files[0];
			setSelectedImage(file);
			setPreviewUrl(URL.createObjectURL(file));
			setUploadedUrl(null); // Reset uploaded URL when new image is selected
		}
	};

	const handleUpload = async () => {
		if (!selectedImage) {
			toast.error("이미지를 선택해주세요.");
			return;
		}

		setUploading(true);

		try {
			const supabase = createClient();

			// Get the current user
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!user) {
				toast.error("로그인이 필요합니다.");
				return;
			}

			// Generate a unique filename
			const fileExt = selectedImage.name.split(".").pop();
			const fileName = `${uuidv4()}.${fileExt}`;
			const filePath = `${user.id}/${fileName}`;

			// Upload the image to the store-thumbnail bucket
			const { data, error } = await supabase.storage
				.from("store-thumbnail")
				.upload(filePath, selectedImage, {
					cacheControl: "3600",
					upsert: false,
				});

			if (error) {
				throw error;
			}

			// Get the public URL for the uploaded image
			const {
				data: { publicUrl },
			} = supabase.storage.from("store-thumbnail").getPublicUrl(filePath);

			setUploadedUrl(publicUrl);
			toast.success("이미지가 성공적으로 업로드되었습니다.");
		} catch (error) {
			console.error("Error uploading image:", error);
			toast.error("이미지 업로드 중 오류가 발생했습니다.");
		} finally {
			setUploading(false);
		}
	};

	const handleReset = () => {
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
		}
		setSelectedImage(null);
		setPreviewUrl(null);
		setUploadedUrl(null);
	};

	return (
		<div className="w-full max-w-3xl mx-auto px-4 py-8">
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold mb-4">이미지 업로드 테스트</h1>
				<p className="text-lg text-gray-600">
					스토어 썸네일 이미지를 선택하고 업로드해보세요.
				</p>
			</div>

			<div className="bg-white rounded-2xl p-6 shadow-lg">
				<div className="mb-6">
					<label className="block text-sm font-medium text-gray-700 mb-2">
						이미지 선택
					</label>
					<input
						type="file"
						accept="image/*"
						onChange={handleImageChange}
						ref={fileInputRef}
						className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-[#FFA725] file:text-white
              hover:file:bg-[#FF9500]
              cursor-pointer"
					/>
				</div>

				{previewUrl && (
					<div className="mb-6">
						<p className="text-sm font-medium text-gray-700 mb-2">미리보기</p>
						<div className="relative w-full h-64 border border-gray-200 rounded-lg overflow-hidden">
							<Image
								src={previewUrl}
								alt="Preview"
								fill
								style={{ objectFit: "contain" }}
							/>
						</div>
					</div>
				)}

				{uploadedUrl && (
					<div className="mb-6">
						<p className="text-sm font-medium text-gray-700 mb-2">
							업로드된 이미지
						</p>
						<div className="relative w-full h-64 border border-gray-200 rounded-lg overflow-hidden">
							<Image
								src={uploadedUrl}
								alt="Uploaded"
								fill
								style={{ objectFit: "contain" }}
							/>
						</div>
						<p className="mt-2 text-sm text-gray-500 break-all">
							URL: {uploadedUrl}
						</p>
					</div>
				)}

				<div className="flex flex-wrap gap-4">
					<Button
						onClick={handleUpload}
						disabled={!selectedImage || uploading}
						className="bg-[#6A9C89] hover:bg-[#5A8C79] text-white"
					>
						{uploading ? "업로드 중..." : "이미지 업로드"}
					</Button>
					<Button
						onClick={handleReset}
						variant="outline"
						className="border-[#6A9C89] text-[#6A9C89] hover:bg-[#6A9C89] hover:text-white"
					>
						초기화
					</Button>
				</div>
			</div>
		</div>
	);
}
