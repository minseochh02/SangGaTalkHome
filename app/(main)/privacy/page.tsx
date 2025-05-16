import React from "react";
import { Metadata } from "next";
import PrivacyPolicyContent from "./PrivacyPolicyContent";

export const metadata: Metadata = {
  title: "개인정보처리방침 | SGT",
  description: "SGT 서비스의 개인정보처리방침입니다.",
};

export default function PrivacyPage() {
  return <PrivacyPolicyContent />;
} 