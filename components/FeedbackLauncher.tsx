"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { track } from "@vercel/analytics";

export default function FeedbackLauncher() {
  const pathname = usePathname();
  if (pathname === "/feedback") return null;
  return <Link className="feedback-launcher-v316" href={`/feedback?from=${encodeURIComponent(pathname)}`} onClick={() => track("feedback_open", { page: pathname })} aria-label="Send beta feedback"><MessageSquarePlus size={18} /><span>Feedback</span></Link>;
}
