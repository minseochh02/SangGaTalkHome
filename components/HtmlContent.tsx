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

// Add styles to ensure Quill content displays correctly
const QuillStylesGlobal = () => (
	<style jsx global>{`
		.html-content {
			line-height: 1.5;
		}
		.html-content h1 {
			font-size: 2em;
			margin-bottom: 0.5em;
			font-weight: bold;
		}
		.html-content h2 {
			font-size: 1.5em;
			margin-bottom: 0.5em;
			font-weight: bold;
		}
		.html-content h3 {
			font-size: 1.17em;
			margin-bottom: 0.5em;
			font-weight: bold;
		}
		.html-content p {
			margin-bottom: 1em;
		}
		.html-content ul,
		.html-content ol {
			padding-left: 2em;
			margin-bottom: 1em;
		}
		.html-content ul {
			list-style-type: disc;
		}
		.html-content ol {
			list-style-type: decimal;
		}
		.html-content a {
			color: #0000ee;
			text-decoration: underline;
		}
		.html-content img {
			max-width: 100%;
		}
		.html-content blockquote {
			border-left: 4px solid #ccc;
			margin-bottom: 1em;
			padding-left: 16px;
		}
		.html-content pre {
			background-color: #f0f0f0;
			border-radius: 3px;
			padding: 0.5em;
			white-space: pre-wrap;
		}
		.html-content code {
			background-color: #f0f0f0;
			border-radius: 3px;
			padding: 0.2em 0.4em;
			font-family: monospace;
		}
	`}</style>
);

export { QuillStylesGlobal };
