"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

// Dynamically import Quill to avoid SSR issues
const ReactQuill = dynamic(() => import("react-quill"), {
	ssr: false,
	loading: () => (
		<div className="h-[300px] flex items-center justify-center bg-gray-100 rounded-lg">
			<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
		</div>
	),
});

interface RichTextEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
}

export default function RichTextEditor({
	value,
	onChange,
	placeholder,
}: RichTextEditorProps) {
	// Quill modules (toolbar options)
	const modules = useMemo(
		() => ({
			toolbar: [
				[{ header: [1, 2, 3, false] }],
				["bold", "italic", "underline", "strike"],
				[{ color: [] }, { background: [] }],
				[{ list: "ordered" }, { list: "bullet" }],
				[{ align: [] }],
				["link", "image"],
				["clean"],
			],
		}),
		[]
	);

	// Quill formats (allowed formatting options)
	const formats = [
		"header",
		"bold",
		"italic",
		"underline",
		"strike",
		"color",
		"background",
		"list",
		"bullet",
		"align",
		"link",
		"image",
	];

	return (
		<div className="rich-text-editor">
			<ReactQuill
				theme="snow"
				value={value}
				onChange={onChange}
				modules={modules}
				formats={formats}
				placeholder={placeholder || "내용을 입력하세요..."}
				className="h-[60vh]"
			/>
			<style jsx global>{`
				.ql-container {
					min-height: calc(60vh - 42px);
					font-size: 16px;
					font-family: inherit;
				}
				.ql-editor {
					padding: 1rem;
					overflow-y: auto;
				}
				.ql-toolbar {
					border-top-left-radius: 0.375rem;
					border-top-right-radius: 0.375rem;
					background-color: #f9fafb;
					border-color: #e5e7eb;
				}
				.ql-container {
					border-bottom-left-radius: 0.375rem;
					border-bottom-right-radius: 0.375rem;
					border-color: #e5e7eb;
				}
			`}</style>
		</div>
	);
}
