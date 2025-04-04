"use client";

import CouponCreateContent from "./CouponCreateContent";

export default function CouponCreatePage({
  params,
}: {
  params: { storeId: string };
}) {
  return <CouponCreateContent storeId={params.storeId} />;
} 