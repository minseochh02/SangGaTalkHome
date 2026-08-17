"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EGDESK_FUNCTIONS_URL } from "@/lib/egdesk-pro";

type CheckoutConfig = {
  paymentId: string;
  storeId: string;
  channelKey: string;
  orderName: string;
  totalAmount: number;
  currency: string;
  customer: { fullName: string; email: string; phoneNumber: string };
  customData?: Record<string, string>;
  completeUrl: string;
};

async function loadPortOne() {
  const PortOneModule = await import("@portone/browser-sdk/v2");
  if (!PortOneModule.default?.requestPayment) {
    throw new Error("결제 모듈을 불러오는데 실패했습니다.");
  }
  return PortOneModule.default;
}

export function EgdeskProCheckoutClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? "";

  const [cfg, setCfg] = useState<CheckoutConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "paying" | "done" | "error"
  >("loading");
  const [message, setMessage] = useState("결제 정보를 불러오는 중…");
  const startedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setStatus("error");
        setLoadError(
          "결제 링크에 토큰이 없습니다. EGDesk 앱 또는 상품 페이지에서 다시 시도해주세요.",
        );
        return;
      }
      try {
        const res = await fetch(
          `${EGDESK_FUNCTIONS_URL}/portone-checkout?t=${encodeURIComponent(token)}`,
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            data?.error || `결제 정보를 불러오지 못했습니다 (${res.status})`,
          );
        }
        if (!cancelled) {
          setCfg(data as CheckoutConfig);
          setStatus("ready");
          setMessage("준비됨 — 결제를 시작합니다…");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setStatus("error");
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const startPay = useCallback(async () => {
    if (!cfg) return;
    setStatus("paying");
    setMessage("결제창을 여는 중…");
    try {
      const PortOne = await loadPortOne();
      const requestPayload = {
        storeId: cfg.storeId,
        channelKey: cfg.channelKey,
        paymentId: cfg.paymentId,
        orderName: cfg.orderName,
        totalAmount: cfg.totalAmount,
        currency: "KRW" as const,
        payMethod: "CARD" as const,
        customer: {
          fullName: cfg.customer.fullName,
          email: cfg.customer.email,
          phoneNumber: cfg.customer.phoneNumber,
        },
        ...(cfg.customData ? { customData: cfg.customData } : {}),
      } as Parameters<typeof PortOne.requestPayment>[0];
      const payment = await PortOne.requestPayment(requestPayload);

      if (payment && "code" in payment && payment.code !== undefined) {
        const failed = payment as {
          code?: string;
          message?: string;
          pgCode?: string;
          pgMessage?: string;
        };
        const detail: string[] = [];
        if (failed.pgCode) detail.push(`pgCode=${failed.pgCode}`);
        if (failed.pgMessage) detail.push(`pgMessage=${failed.pgMessage}`);
        const fullMsg = `${failed.message || `결제 실패: ${failed.code}`}${
          detail.length ? `\n[${detail.join(", ")}]` : ""
        }\n(code: ${failed.code})`;
        throw new Error(fullMsg);
      }

      setMessage("결제 확인 중…");
      const completeRes = await fetch(cfg.completeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: cfg.paymentId }),
      });
      const completeText = await completeRes.text();
      let completeData: { error?: string } = {};
      try {
        completeData = JSON.parse(completeText);
      } catch {
        completeData = { error: completeText };
      }
      if (!completeRes.ok) {
        throw new Error(
          completeData.error || `결제 확인 실패 (${completeRes.status})`,
        );
      }

      setStatus("done");
      setMessage("결제 완료! EGDesk 앱으로 돌아가 주세요.");
      window.location.href = `egdesk://subscription/callback?provider=portone&paymentId=${encodeURIComponent(
        cfg.paymentId,
      )}`;
    } catch (err: unknown) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, [cfg]);

  useEffect(() => {
    if (status === "ready" && cfg && !startedRef.current) {
      startedRef.current = true;
      void startPay();
    }
  }, [status, cfg, startPay]);

  const amountLabel = cfg
    ? new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
      }).format(cfg.totalAmount)
    : "";

  return (
    <div className="min-h-[70vh] bg-[#f5f6f8] text-gray-900 w-full">
      <div className="max-w-[420px] mx-auto my-12 p-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-xl font-bold mb-2">EGDesk Pro</h1>
        <p className="mb-4 leading-relaxed text-gray-600">
          카드로 연간 이용권을 결제합니다. (자동갱신 없음)
        </p>
        <div className="text-3xl font-bold mb-5">
          {amountLabel || "불러오는 중…"}
        </div>
        <button
          type="button"
          disabled={
            status === "paying" || status === "loading" || status === "done"
          }
          onClick={() => void startPay()}
          className="w-full rounded-lg py-3.5 px-4 text-base font-semibold bg-gray-900 text-white disabled:opacity-50"
        >
          카드 결제하기
        </button>
        <div
          className={`mt-4 text-sm whitespace-pre-wrap ${
            status === "error"
              ? "text-red-700"
              : status === "done"
                ? "text-emerald-700"
                : "text-gray-600"
          }`}
        >
          {loadError || message}
        </div>
      </div>
    </div>
  );
}
