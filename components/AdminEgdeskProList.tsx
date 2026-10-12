"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  EGDESK_PRO_LIST_PRICE_KRW,
  EGDESK_PRO_LIST_TERM,
  type EgdeskProPurchase,
  type EgdeskUser,
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
  if (source === "sgt-admin") return "관리자 Comp";
  if (source === "paypal") return "PayPal";
  return "EGDesk 앱";
}

const COMP_MONTHS_MIN = 1;
const COMP_MONTHS_MAX = 240;

function durationLabel(months: number, unlimited: boolean): string {
  if (unlimited) return "무기한";
  return `${months}개월`;
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
  const [users, setUsers] = useState<EgdeskUser[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compEmail, setCompEmail] = useState("");
  const [compMonths, setCompMonths] = useState("6");
  const [compUnlimited, setCompUnlimited] = useState(false);
  const [compSubmitting, setCompSubmitting] = useState(false);
  const [compMessage, setCompMessage] = useState<string | null>(null);
  const [compError, setCompError] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const emailBoxRef = useRef<HTMLLabelElement>(null);

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
      setUsers((payload.users || []) as EgdeskUser[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "EGDesk Pro 구매 목록을 불러오지 못했습니다.",
      );
      setRows([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!emailBoxRef.current?.contains(event.target as Node)) {
        setEmailOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const emailMatches = useMemo(() => {
    const needle = compEmail.trim().toLowerCase();
    return users
      .filter((user) => {
        if (!needle) return true;
        return (
          user.email.toLowerCase().includes(needle) ||
          (user.name || "").toLowerCase().includes(needle)
        );
      })
      .slice(0, 40);
  }, [compEmail, users]);

  const pickUser = (user: EgdeskUser) => {
    setCompEmail(user.email);
    setEmailOpen(false);
    setCompError(null);
  };

  const compUser = async (event: FormEvent) => {
    event.preventDefault();
    const email = compEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setCompError("EGDesk에 가입한 이메일을 입력해주세요.");
      setCompMessage(null);
      return;
    }
    const months = Number(compMonths);
    if (
      !compUnlimited &&
      (!Number.isInteger(months) || months < COMP_MONTHS_MIN || months > COMP_MONTHS_MAX)
    ) {
      setCompError(`기간은 ${COMP_MONTHS_MIN}~${COMP_MONTHS_MAX}개월 사이 숫자로 입력해주세요.`);
      setCompMessage(null);
      return;
    }
    const label = durationLabel(months, compUnlimited);
    if (
      !window.confirm(
        `${email} 에게 EGDesk Pro를 ${label} 내부 제공하시겠습니까?`,
      )
    ) {
      return;
    }

    setCompSubmitting(true);
    setCompError(null);
    setCompMessage(null);
    try {
      const response = await fetch("/api/admin/egdesk-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          months: compUnlimited ? undefined : months,
          unlimited: compUnlimited,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (payload.code === "NO_EGDESK_USER") {
          throw new Error(
            "이 이메일로 된 EGDesk 계정이 없습니다. 앱에서 같은 계정으로 먼저 로그인했는지 확인하세요.",
          );
        }
        throw new Error(payload.error || "내부 제공에 실패했습니다.");
      }
      setCompMessage(
        payload.alreadyActive
          ? `${email} 기존 이용권을 ${label} 내부 제공으로 전환/연장했습니다.`
          : `${email} 에게 ${label} 내부 제공을 부여했습니다.`,
      );
      setCompEmail("");
      await load();
    } catch (err) {
      setCompError(err instanceof Error ? err.message : "내부 제공에 실패했습니다.");
    } finally {
      setCompSubmitting(false);
    }
  };

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
          {EGDESK_PRO_LIST_PRICE_KRW} / {EGDESK_PRO_LIST_TERM}
        </strong>
        <span className="text-gray-500"> (연간 결제 없음 · 월 이용권)</span>
      </div>

      <form
        onSubmit={(event) => void compUser(event)}
        className="mb-6 rounded-lg border bg-white px-4 py-4"
      >
        <div className="mb-3">
          <h2 className="text-base font-semibold">사용자 Comp</h2>
          <p className="mt-1 text-sm text-gray-600">
            EGDesk에 가입된 이메일로 Pro를 내부 제공(무료)합니다. 개월 수를 직접
            입력하거나 무기한을 선택하세요. 이용 중인 기간이 있으면 그 만료일부터
            연장됩니다.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label ref={emailBoxRef} className="relative min-w-[240px] flex-1 text-sm">
            <span className="mb-1 block text-gray-600">EGDesk 가입 이메일</span>
            <input
              type="text"
              value={compEmail}
              onChange={(event) => {
                setCompEmail(event.target.value);
                setEmailOpen(true);
              }}
              onFocus={() => setEmailOpen(true)}
              placeholder={users.length ? "이름 또는 이메일 검색" : "user@example.com"}
              autoComplete="off"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              required
            />
            {emailOpen && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-white shadow-lg">
                {emailMatches.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">
                    {users.length === 0
                      ? "EGDesk 사용자 목록을 불러오지 못했습니다."
                      : "일치하는 사용자가 없습니다."}
                  </div>
                ) : (
                  emailMatches.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => pickUser(user)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <span className="text-sm font-medium">
                        {user.name || user.email}
                      </span>
                      {user.name ? (
                        <span className="text-xs text-gray-500">{user.email}</span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            )}
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-gray-600">기간 (개월)</span>
            <input
              type="number"
              min={COMP_MONTHS_MIN}
              max={COMP_MONTHS_MAX}
              step={1}
              value={compMonths}
              onChange={(event) => setCompMonths(event.target.value)}
              disabled={compUnlimited}
              className="w-24 rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100"
              required={!compUnlimited}
            />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={compUnlimited}
              onChange={(event) => setCompUnlimited(event.target.checked)}
            />
            무기한
          </label>
          <button
            type="submit"
            disabled={compSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {compSubmitting ? "처리 중…" : "Comp 부여"}
          </button>
        </div>
        {compError && (
          <p className="mt-3 text-sm text-red-700">{compError}</p>
        )}
        {compMessage && (
          <p className="mt-3 text-sm text-green-700">{compMessage}</p>
        )}
      </form>

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
                <tr
                  key={row.userId}
                  className="border-t cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    if (row.email) {
                      setCompEmail(row.email);
                      setEmailOpen(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                >
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
