"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBookmark, IconHome, IconSearch, IconSettings, IconTicket } from "./Icons";

const LINKS = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/search", label: "Search", icon: IconSearch },
  { href: "/browse/free", label: "Free", icon: IconTicket },
  { href: "/lists", label: "My lists", icon: IconBookmark },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="top-nav" aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={isCurrent(pathname, l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
      <Link href="/browse/public-domain" aria-current={isCurrent(pathname, "/browse/public-domain") ? "page" : undefined}>
        Public domain
      </Link>
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Main">
      <ul>
        {LINKS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} aria-current={isCurrent(pathname, href) ? "page" : undefined}>
              <Icon size={22} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
