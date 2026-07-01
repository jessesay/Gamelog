"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { track } from "@vercel/analytics";

export default function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    const supabase = createClient();
    if (!supabase) {
      setMessage("Supabase auth is not configured.");
      return;
    }

    setSaving(true);
    setMessage("");
    const result = mode === "signup"
      ? await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/app/onboarding` },
        })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSaving(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "signup") track("signup_completed", { surface: "auth_panel" });

    setPassword("");
    if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to finish signing in.");
      return;
    }

    router.push(mode === "signup" ? "/app/onboarding" : "/app/profile");
    router.refresh();
  }

  return (
    <section className="social-card-v35">
      <div className="actions" style={{ marginTop: 0 }}>
        <button className={mode === "signin" ? "pill active" : "pill"} onClick={() => setMode("signin")}>Sign in</button>
        <button className={mode === "signup" ? "pill active" : "pill"} onClick={() => setMode("signup")}>Create account</button>
      </div>
      <div className="social-form-grid-v35">
        <label>
          <span>Email</span>
          <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          <span>Password</span>
          <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
      </div>
      <button className="primary" onClick={submit} disabled={saving || !email.trim() || password.length < 6}>
        {saving ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </section>
  );
}
