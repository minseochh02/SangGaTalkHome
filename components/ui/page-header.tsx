"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
}

export function PageHeader({ title, showBackButton = false }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center h-16 px-4 border-b border-gray-800 bg-black sticky top-0 z-10">
      {showBackButton && (
        <button 
          onClick={() => router.back()}
          className="p-2 mr-2 rounded-full hover:bg-gray-800 transition-colors"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      )}
      <h1 className="text-xl font-bold text-white">{title}</h1>
    </div>
  );
} 