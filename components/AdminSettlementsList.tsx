"use client";

import { useEffect, useState } from "react";
import { StoreSettlement } from "@/utils/type";
import { Button } from "@/components/ui/button";

function formatWon(amount: number): string {
  return `₩${Number(amount || 0).toLocaleString("ko-KR")}`;
}

function formatWhen(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

export default function AdminSettlementsList() {
  const [rows, setRows] = useState<StoreSettlement[]>([]);
  const [filter, setFilter] = useState<"due" | "pending" | "paid" | "all">("due");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/settlements");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "정산 목록을 불러오지 못했습니다.");
      let next = (payload.settlements || []) as StoreSettlement[];
      if (filter === "paid") next = next.filter((row) => row.status === "paid");
      else if (filter === "pending") next = next.filter((row) => row.status === "pending");
      else if (filter === "due") {
        next = next.filter(
          (row) => row.status === "pending" && new Date(row.due_at).getTime() <= Date.now(),
        );
      }
      setRows(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "정산 목록을 불러오지 못했습니다.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const markPaid = async (settlementId: string) => {
    setBusyId(settlementId);
    setError(null);
    try {
      const response = await fetch("/api/admin/settlements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settlementId, status: "paid" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "정산 완료 처리에 실패했습니다.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "정산 완료 처리에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["due", "지급 대기"],
            ["pending", "전체 예정"],
            ["paid", "완료"],
            ["all", "전체"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-lg px-3 py-2 text-sm ${
              filter === id ? "bg-primary text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">해당 정산 건이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">스토어</th>
                <th className="px-4 py-3">계좌</th>
                <th className="px-4 py-3">정산액</th>
                <th className="px-4 py-3">지급 예정일</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const store = row.stores;
                const account =
                  row.payout_bank_name && row.payout_bank_account_no
                    ? `${row.payout_bank_holder || store?.owner_name} · ${row.payout_bank_name} ${row.payout_bank_account_no}`
                    : store?.bank_name && store?.bank_account_no
                      ? `${store.bank_holder || store.owner_name} · ${store.bank_name} ${store.bank_account_no}`
                      : "계좌 없음";
                return (
                  <tr key={row.settlement_id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{store?.store_name || row.store_id}</div>
                      <div className="font-mono text-xs text-gray-500">
                        {row.kiosk_order_id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{account}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatWon(row.net_amount_krw)}
                      {row.fee_amount_krw ? (
                        <div className="text-xs text-gray-500">
                          결제 {formatWon(row.gross_amount_krw)} / 수수료 {formatWon(row.fee_amount_krw)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{formatWhen(row.due_at)}</td>
                    <td className="px-4 py-3">
                      {row.status === "paid"
                        ? "완료"
                        : row.status === "cancelled"
                          ? "취소"
                          : new Date(row.due_at).getTime() <= Date.now()
                            ? "지급 대기"
                            : "예정"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.status === "pending" && (
                        <Button
                          size="sm"
                          disabled={busyId === row.settlement_id}
                          onClick={() => void markPaid(row.settlement_id)}
                        >
                          {busyId === row.settlement_id ? "처리 중…" : "정산 완료"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
