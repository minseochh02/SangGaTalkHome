"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EGDESK_PRO_LIST_MONTHLY_KRW,
  EGDESK_PRO_LIST_YEARLY_KRW,
  type EgdeskProPurchase,
} from "@/lib/egdesk-pro";

type Filter = "active" | "pending" | "expired" | "all";

function formatWhen(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function providerLabel(provider: string): string {
  if (provider === "portone") return "PortOne 카드";
  if (provider === "paypal") return "PayPal";
  if (provider === "comped") return "내부 제공";
  return provider;
}

function sourceLabel(source: string): string {
  if (source === "sgt") return "SGT";
  if (source === "paypal") return "PayPal";
  return "EGDesk 앱";
}

function statusLabel(row: EgdeskProPurchase): string {
  if (row.active) return "이용 중";
  if (row.status === "PENDING") return "결제 대기";
  if (row.status === "CANCELLED") return "해지";
  if (row.status === "EXPIRED") return "만료";
  return row.status;
}

export default function AdminEgdeskProList() {
  const [rows, setRows] = useState<EgdeskProPurchase[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/egdesk-pro", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "EGDesk Pro 구매 목록을 불러오지 못했습니다.");
      }
      setRows((payload.purchases || []) as EgdeskProPurchase[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "EGDesk Pro 구매 목록을 불러오지 못했습니다.",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === "active" && !row.active) return false;
      if (filter === "pending" && row.status !== "PENDING") return false;
      if (filter === "expired" && (row.active || row.status === "PENDING")) return false;
      if (!needle) return true;
      return [row.email, row.name, row.priceLabel, row.provider, row.source]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [filter, query, rows]);

  return (
    <div>
      <div className="mb-4 rounded-lg border bg-gray-50 px-4 py-3 text-sm text-gray-700">
        현재 표시가:{" "}
        <strong>
          {EGDESK_PRO_LIST_MONTHLY_KRW}/월 · {EGDESK_PRO_LIST_YEARLY_KRW}/년
        </strong>
        <span className="text-gray-500"> (실제 카드 청구는 연 ₩276,000)</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["active", "이용 중"],
            ["pending", "결제 대기"],
            ["expired", "만료/해지"],
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
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이메일, 이름, 금액 검색"
          className="ml-auto min-w-[220px] rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200"
        >
          새로고침
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500">해당 구매 건이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">구매자</th>
                <th className="px-4 py-3">경로</th>
                <th className="px-4 py-3">결제 금액</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">만료일</th>
                <th className="px-4 py-3">남은 기간</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.userId} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.name || row.email || row.userId}</div>
                    {row.email && row.name ? (
                      <div className="text-xs text-gray-500">{row.email}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div>{providerLabel(row.provider)}</div>
                    <div className="text-xs text-gray-500">{sourceLabel(row.source)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.priceLabel}</div>
                    {row.paidAt ? (
                      <div className="text-xs text-gray-500">결제 {formatWhen(row.paidAt)}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{statusLabel(row)}</td>
                  <td className="px-4 py-3">{formatWhen(row.periodEnd)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.remainingLabel}</div>
                    {row.remainingDays != null && row.remainingDays > 0 ? (
                      <div className="text-xs text-gray-500">{row.remainingDays}일</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
