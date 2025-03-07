import React from "react";
import Image from "next/image";

interface ImagePlaceholderProps {
	src?: string | null;
	alt: string;
	className?: string;
	width?: number;
	height?: number;
	fill?: boolean;
	rounded?: "none" | "sm" | "md" | "lg" | "full";
	objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

export default function ImagePlaceholder({
	src,
	alt,
	className = "",
	width,
	height,
	fill = false,
	rounded = "none",
	objectFit = "cover",
}: ImagePlaceholderProps) {
	// Determine rounded corner classes
	const roundedClasses = {
		none: "",
		sm: "rounded",
		md: "rounded-md",
		lg: "rounded-lg",
		full: "rounded-full",
	};

	// Determine object fit classes
	const objectFitClasses = {
		contain: "object-contain",
		cover: "object-cover",
		fill: "object-fill",
		none: "object-none",
		"scale-down": "object-scale-down",
	};

	// Base container classes
	const containerClasses = `overflow-hidden bg-gray-200 ${roundedClasses[rounded]} ${className}`;

	// If no image source is provided, show placeholder
	if (!src) {
		return (
			<div
				className={`${containerClasses} flex items-center justify-center text-gray-400`}
				style={
					width && height ? { width: `${width}px`, height: `${height}px` } : {}
				}
			>
				<div className="text-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width={width ? width / 4 : 48}
						height={height ? height / 4 : 48}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						className="mx-auto mb-1"
					>
						<rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
						<circle cx="9" cy="9" r="2"></circle>
						<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
					</svg>
					{width && width > 80 && <p className="text-xs">이미지 없음</p>}
				</div>
			</div>
		);
	}

	// If image source is provided, show the image
	return (
		<div
			className={containerClasses}
			style={
				!fill && width && height
					? { width: `${width}px`, height: `${height}px` }
					: {}
			}
		>
			<div
				className={`relative ${fill ? "w-full h-full" : ""}`}
				style={
					!fill && width && height
						? { width: `${width}px`, height: `${height}px` }
						: {}
				}
			>
				<Image
					src={src}
					alt={alt}
					className={objectFitClasses[objectFit]}
					fill={fill}
					width={!fill ? width : undefined}
					height={!fill ? height : undefined}
				/>
			</div>
		</div>
	);
}
