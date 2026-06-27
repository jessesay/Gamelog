"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, List, Radio, Search, UserRound } from "lucide-react";

const items = [
  { href: "/app/discover", label: "Discover", icon: Compass },
  { href: "/app/search", label: "Search", icon: Search },
  { href: "/app/activity", label: "Activity", icon: Radio },
  { href: "/app/lists", label: "Lists", icon: List },
  { href: "/app/profile", label: "Profile", icon: UserRound },
];

export default function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="app-bottom-nav-v35" aria-label="GameLog app navigation">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link className={active ? "active" : ""} href={href} key={href}>
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
