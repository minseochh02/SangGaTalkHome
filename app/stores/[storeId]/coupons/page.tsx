"use client";

import CouponListContent from "./CouponListContent";

export default function CouponListPage({
  params,
}: {
  params: { storeId: string };
}) {
  return <CouponListContent storeId={params.storeId} />;
} 