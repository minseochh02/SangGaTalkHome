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
  const [bankForm, setBankForm] = useState({
    bankHolder: "",
    bankName: "",
    bankAccountNo: "",
  });
  const [savingBank, setSavingBank] = useState(false);
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
        setBankForm({
          bankHolder: store.bank_holder || "",
          bankName: store.bank_name || "",
          bankAccountNo: store.bank_account_no || "",
        });
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

  const saveBank = async () => {
    setSavingBank(true);
    setError(null);
    try {
      const response = await fetch(`/api/stores/${storeId}/settlement-account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "계좌 저장에 실패했습니다.");
      setBankLabel(
        `${payload.bank_holder} · ${payload.bank_name} ${payload.bank_account_no}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "계좌 저장에 실패했습니다.");
    } finally {
      setSavingBank(false);
    }
  };

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
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">정산 계좌</h2>
        <p className="mt-1 text-sm text-gray-600">
          이 스토어의 카드 매출을 입금받을 계좌입니다. 저장하면 미지급 정산 건에도 반영됩니다.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="예금주"
            value={bankForm.bankHolder}
            onChange={(e) => setBankForm((prev) => ({ ...prev, bankHolder: e.target.value }))}
          />
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="은행"
            value={bankForm.bankName}
            onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
          />
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="계좌번호"
            value={bankForm.bankAccountNo}
            onChange={(e) => setBankForm((prev) => ({ ...prev, bankAccountNo: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="button" disabled={savingBank} onClick={() => void saveBank()}>
            {savingBank ? "저장 중…" : "계좌 저장"}
          </Button>
          {bankLabel ? (
            <span className="text-sm text-gray-600">현재: {bankLabel}</span>
          ) : (
            <span className="text-sm text-amber-700">아직 등록된 정산 계좌가 없습니다.</span>
          )}
        </div>
      </div>

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
