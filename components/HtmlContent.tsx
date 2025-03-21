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
		<>
			<div
				className={`html-content ql-editor ${className}`}
				dangerouslySetInnerHTML={{ __html: content }}
			/>
			<style jsx global>{`
				.ql-align-center {
					text-align: center !important;
				}
				.ql-align-right {
					text-align: right !important;
				}
				.ql-align-left {
					text-align: left !important;
				}
				.ql-align-justify {
					text-align: justify !important;
				}
			`}</style>
		</>
	);
}
