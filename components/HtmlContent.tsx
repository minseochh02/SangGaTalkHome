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
		<div
			className={`html-content ${className}`}
			dangerouslySetInnerHTML={{ __html: content }}
		/>
	);
}
