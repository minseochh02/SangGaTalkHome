"use client";

import React from "react";

interface HtmlContentProps {
	content: string;
	className?: string;
}

export default function HtmlContent({
	content,
	className = "",
}: HtmlContentProps) {
	if (!content) return null;

	return (
		<div className={`ql-editor ${className}`}>
			<div
				dangerouslySetInnerHTML={{ __html: content }}
				className="custom-quill-content"
			/>
			<style jsx>{`
				.custom-quill-content :global(img) {
					display: block;
					margin-left: auto;
					margin-right: auto;
				}
			`}</style>
		</div>
	);
}
