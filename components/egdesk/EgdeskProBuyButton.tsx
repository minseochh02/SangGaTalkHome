"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export function EgdeskProBuyButton() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, [supabase]);

  const startCheckout = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/egdesk-pro/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        checkoutUrl?: string;
        alreadyActive?: boolean;
      };
      if (!res.ok) {
        if (data.code === "NO_EGDESK_USER") {
          throw new Error(
            "이 이메일로 된 EGDesk 계정이 없습니다. EGDesk 앱에서 같은 구글 계정으로 먼저 로그인한 뒤 다시 시도하세요.",
          );
        }
        throw new Error(data.error || `결제 준비 실패 (${res.status})`);
      }
      if (data.alreadyActive) {
        setMessage("이미 EGDesk Pro가 활성화되어 있습니다. 앱에서 확인하세요.");
        return;
      }
      if (!data.checkoutUrl) {
        throw new Error("결제 주소를 받지 못했습니다.");
      }
      const url = new URL(data.checkoutUrl, window.location.origin);
      router.push(`${url.pathname}${url.search}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm text-gray-600">
        EGDesk 가입 이메일
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@gmail.com"
          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-base"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => void startCheckout()}
        className="w-full px-4 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors duration-200 text-base font-medium disabled:opacity-60"
      >
        {busy ? "결제 준비 중…" : "카드로 구매하기"}
      </button>
      <p className="text-xs text-gray-500 leading-relaxed">
        결제는 sgt-wallet.com에서 진행되며, 같은 이메일의 EGDesk 계정이 Pro로
        활성화됩니다. 자동갱신 없음.
      </p>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-700 whitespace-pre-wrap">{error}</p>}
    </div>
  );
}
