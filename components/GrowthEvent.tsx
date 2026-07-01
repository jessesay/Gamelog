"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

export default function GrowthEvent({ name, properties }: { name: string; properties?: Record<string, string | number | boolean> }) {
  useEffect(() => { track(name, properties); }, [name, properties]);
  return null;
}
