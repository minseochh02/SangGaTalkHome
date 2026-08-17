"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { User } from "@/utils/type";
import { Button } from "@/components/ui/button";
import AdminSettlementsList from "@/components/AdminSettlementsList";

export default function AdminSettlementsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .single();
      if (!profile || (profile as User).role !== "admin") {
        router.push("/");
        return;
      }
      setReady(true);
    };
    void check();
  }, [router, supabase]);

  if (!ready) {
    return <div className="p-8 text-gray-500">권한을 확인하는 중…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">스토어 정산</h1>
          <p className="mt-1 text-sm text-gray-600">
            카드 매출은 QUUS MID로 입금됩니다. 기한이 된 건을 계좌이체한 뒤 정산 완료로 표시하세요.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/profile">프로필로</Link>
        </Button>
      </div>
      <AdminSettlementsList />
    </div>
  );
}
