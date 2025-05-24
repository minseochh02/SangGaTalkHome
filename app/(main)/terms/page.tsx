import React from "react";
import { Metadata } from "next";
import TermsOfServiceContent from "./TermsOfServiceContent";

export const metadata: Metadata = {
  title: "이용약관 | SGT",
  description: "SGT 서비스의 이용약관입니다.",
};

export default function TermsPage() {
  return <TermsOfServiceContent />;
} 