"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
	content: string;
	className?: string;
}

export default function MarkdownContent({
	content,
	className = "",
}: MarkdownContentProps) {
	if (!content) return null;

	return (
		<div className={`markdown-content ${className}`}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					// Style headers
					h1: ({ node, ...props }) => (
						<h1 {...props} className="text-2xl font-bold my-4" />
					),
					h2: ({ node, ...props }) => (
						<h2 {...props} className="text-xl font-bold my-3" />
					),
					h3: ({ node, ...props }) => (
						<h3 {...props} className="text-lg font-bold my-2" />
					),

					// Style paragraphs
					p: ({ node, ...props }) => <p {...props} className="mb-4" />,

					// Style links
					a: ({ node, ...props }) => (
						<a
							{...props}
							className="text-primary hover:underline"
							target="_blank"
							rel="noopener noreferrer"
						/>
					),

					// Style lists
					ul: ({ node, ...props }) => (
						<ul {...props} className="list-disc pl-5 mb-4" />
					),
					ol: ({ node, ...props }) => (
						<ol {...props} className="list-decimal pl-5 mb-4" />
					),
					li: ({ node, ...props }) => <li {...props} className="mb-1" />,

					// Style blockquotes
					blockquote: ({ node, ...props }) => (
						<blockquote
							{...props}
							className="border-l-4 border-gray-300 pl-4 italic my-4"
						/>
					),

					// Style code blocks
					code: ({ node, className, ...props }: any) => {
						const match = /language-(\w+)/.exec(className || "");
						return !props.inline ? (
							<code
								{...props}
								className="block bg-gray-100 p-4 rounded overflow-auto"
							/>
						) : (
							<code
								{...props}
								className="bg-gray-100 px-1 py-0.5 rounded text-sm"
							/>
						);
					},

					// Style images
					img: ({ node, ...props }) => (
						<img {...props} className="max-w-full h-auto rounded-md my-4" />
					),

					// Style tables
					table: ({ node, ...props }) => (
						<div className="overflow-x-auto my-4">
							<table
								{...props}
								className="min-w-full divide-y divide-gray-200"
							/>
						</div>
					),
					thead: ({ node, ...props }) => (
						<thead {...props} className="bg-gray-50" />
					),
					tbody: ({ node, ...props }) => (
						<tbody {...props} className="bg-white divide-y divide-gray-200" />
					),
					tr: ({ node, ...props }) => (
						<tr {...props} className="hover:bg-gray-50" />
					),
					th: ({ node, ...props }) => (
						<th
							{...props}
							className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
						/>
					),
					td: ({ node, ...props }) => (
						<td {...props} className="px-6 py-4 whitespace-nowrap text-sm" />
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
