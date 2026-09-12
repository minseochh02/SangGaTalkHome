"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { User } from "@/utils/type";
import { Button } from "@/components/ui/button";
import AdminEgdeskProList from "@/components/AdminEgdeskProList";

export default function AdminEgdeskProPage() {
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
      if (!profile || !["admin", "super_admin"].includes((profile as User).role)) {
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
          <h1 className="text-2xl font-bold">EGDesk Pro 구매</h1>
          <p className="mt-1 text-sm text-gray-600">
            누가 얼마에 결제했는지, 이용 기간이 얼마나 남았는지 확인하고, 필요하면
            사용자를 Comp합니다.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/profile">프로필로</Link>
        </Button>
      </div>
      <AdminEgdeskProList />
    </div>
  );
}
