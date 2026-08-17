"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { StoreSettlement } from "@/utils/type";
import { Button } from "@/components/ui/button";

function formatWon(amount: number): string {
  return `₩${Number(amount || 0).toLocaleString("ko-KR")}`;
}

function formatWhen(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function displayStatus(row: StoreSettlement): string {
  if (row.status === "paid") return "정산 완료";
  if (row.status === "cancelled") return "취소";
  if (new Date(row.due_at).getTime() <= Date.now()) return "정산 대기";
  return "정산 예정";
}

export default function StoreSettlementsContent({ storeId }: { storeId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<StoreSettlement[]>([]);
  const [storeName, setStoreName] = useState("");
  const [bankLabel, setBankLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: store, error: storeError } = await supabase
          .from("stores")
          .select("store_id, store_name, user_id, bank_name, bank_account_no, bank_holder")
          .eq("store_id", storeId)
          .single();
        if (storeError || !store) {
          setError("스토어를 찾을 수 없습니다.");
          return;
        }
        if (store.user_id !== user.id) {
          setError("이 스토어의 정산 내역을 볼 권한이 없습니다.");
          return;
        }

        setStoreName(store.store_name);
        setBankLabel(
          store.bank_name && store.bank_account_no
            ? `${store.bank_holder || store.store_name} · ${store.bank_name} ${store.bank_account_no}`
            : "",
        );

        const { data, error: listError } = await supabase
          .from("store_settlements")
          .select("*")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false });
        if (listError) throw listError;
        setRows((data || []) as StoreSettlement[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "정산 내역을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [router, storeId, supabase]);

  const totals = useMemo(() => {
    const pending = rows.filter((row) => row.status === "pending");
    const due = pending.filter((row) => new Date(row.due_at).getTime() <= Date.now());
    const paid = rows.filter((row) => row.status === "paid");
    const sum = (list: StoreSettlement[]) =>
      list.reduce((acc, row) => acc + Number(row.net_amount_krw || 0), 0);
    return {
      pending: sum(pending),
      due: sum(due),
      paid: sum(paid),
    };
  }, [rows]);

  if (loading) {
    return <div className="p-8 text-gray-500">정산 내역을 불러오는 중…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">정산</h1>
          <p className="mt-1 text-sm text-gray-600">
            {storeName} · 카드 결제 후 영업일 7일 이내 재정산 (약관 제5조의2)
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/stores/${storeId}/kiosk-edit`}>키오스크 관리</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/stores/edit/${storeId}`}>정산 계좌 수정</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!bankLabel && !error && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          정산 받을 계좌가 없습니다. 스토어 수정에서 은행, 계좌번호, 예금주를 저장하세요.
        </div>
      )}
      {bankLabel && (
        <p className="mb-4 text-sm text-gray-600">입금 계좌: {bankLabel}</p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">정산 예정</p>
          <p className="mt-1 text-xl font-semibold">{formatWon(totals.pending)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">지급 대기 (기한 도래)</p>
          <p className="mt-1 text-xl font-semibold">{formatWon(totals.due)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">정산 완료</p>
          <p className="mt-1 text-xl font-semibold">{formatWon(totals.paid)}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">아직 정산 대상 카드 결제가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">주문</th>
                <th className="px-4 py-3">결제액</th>
                <th className="px-4 py-3">수수료</th>
                <th className="px-4 py-3">정산액</th>
                <th className="px-4 py-3">지급 예정일</th>
                <th className="px-4 py-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.settlement_id} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.kiosk_order_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">{formatWon(row.gross_amount_krw)}</td>
                  <td className="px-4 py-3">{formatWon(row.fee_amount_krw)}</td>
                  <td className="px-4 py-3 font-medium">{formatWon(row.net_amount_krw)}</td>
                  <td className="px-4 py-3">{formatWhen(row.due_at)}</td>
                  <td className="px-4 py-3">{displayStatus(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
