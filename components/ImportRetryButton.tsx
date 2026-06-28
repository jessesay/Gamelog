"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

export default function ImportRetryButton({ disabled = false }: { disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function retry() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/imports/retry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
      const data = await response.json();
      setMessage(response.ok ? data.message : data.error ?? "Could not queue retries.");
    } catch {
      setMessage("Could not reach the retry queue.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="catalog-retry-v311"><button onClick={() => void retry()} disabled={disabled || loading}>{loading ? <Loader2 className="swipe-spin-v34" size={16} /> : <RotateCcw size={16} />}Queue failed imports</button>{message ? <p>{message}</p> : null}</div>;
}
