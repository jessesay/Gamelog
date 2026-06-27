"use client";

import { useEffect, useState } from "react";
import { Bug, Lightbulb, Loader2, MessageCircleQuestion, PartyPopper, Send } from "lucide-react";

const feedbackTypes = [
  { value: "bug", label: "Bug", icon: Bug, hint: "Something broke or behaved unexpectedly." },
  { value: "idea", label: "Idea", icon: Lightbulb, hint: "A feature or improvement you would use." },
  { value: "confusion", label: "Confusion", icon: MessageCircleQuestion, hint: "A flow, label, or screen that was unclear." },
  { value: "praise", label: "Praise", icon: PartyPopper, hint: "Something that felt especially good." },
] as const;

export default function BetaFeedbackForm({ signedIn, initialPage = "" }: { signedIn: boolean; initialPage?: string }) {
  const [type, setType] = useState<(typeof feedbackTypes)[number]["value"]>("bug");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(initialPage);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [state, setState] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (page) return;
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer?.origin === window.location.origin) setPage(`${referrer.pathname}${referrer.search}`);
    } catch {
      // Referrer is a convenience only.
    }
  }, [page]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setState(null);
    try {
      const response = await fetch("/api/beta/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, page, email, website }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Feedback could not be sent.");
      setMessage("");
      if (!signedIn) setEmail("");
      setState({ tone: "success", message: "Thank you—your feedback is in the beta inbox." });
    } catch (error) {
      setState({ tone: "error", message: error instanceof Error ? error.message : "Feedback could not be sent." });
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="beta-feedback-form-v312" onSubmit={submit}>
      <div className="beta-feedback-type-grid-v312">
        {feedbackTypes.map(({ value, label, icon: Icon, hint }) => (
          <button className={type === value ? "active" : ""} key={value} type="button" onClick={() => setType(value)} aria-pressed={type === value}>
            <Icon size={18} /><span><strong>{label}</strong><small>{hint}</small></span>
          </button>
        ))}
      </div>

      <label className="beta-feedback-field-v312"><span>Message <b>Required</b></span><textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={5} maxLength={4000} required placeholder="What happened, what felt confusing, or what should we keep doing?" /><small>{message.length}/4,000</small></label>
      <div className="beta-feedback-fields-v312">
        <label className="beta-feedback-field-v312"><span>Page or URL <em>Optional</em></span><input value={page} onChange={(event) => setPage(event.target.value)} maxLength={500} placeholder="/app/search" /></label>
        {!signedIn ? <label className="beta-feedback-field-v312"><span>Email <em>Optional</em></span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} placeholder="you@example.com" /></label> : null}
      </div>
      <label className="beta-feedback-honeypot-v312" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
      <div className="beta-feedback-submit-v312"><button className="primary xl" type="submit" disabled={sending || message.trim().length < 5}>{sending ? <Loader2 className="beta-feedback-spin-v312" size={18} /> : <Send size={18} />}{sending ? "Sending…" : "Send feedback"}</button><span>{signedIn ? "Your GameLog account will be attached automatically." : "You can send anonymously or leave an email for follow-up."}</span></div>
      {state ? <p className={`beta-feedback-state-v312 ${state.tone}`} role="status">{state.message}</p> : null}
    </form>
  );
}
