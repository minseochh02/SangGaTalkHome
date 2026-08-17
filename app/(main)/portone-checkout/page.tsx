import type { Metadata } from "next";
import { Suspense } from "react";
import { EgdeskProCheckoutClient } from "@/components/egdesk/EgdeskProCheckoutClient";

export const metadata: Metadata = {
  title: "EGDesk Pro 결제",
  robots: { index: false, follow: false },
};

export default function PortoneCheckoutPage() {
  return (
    <Suspense fallback={null}>
      <EgdeskProCheckoutClient />
    </Suspense>
  );
}
