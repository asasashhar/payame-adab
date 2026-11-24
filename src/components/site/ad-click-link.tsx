"use client";

import type { ReactNode } from "react";

/**
 * Client wrapper around an ad's <a> so clicks can be counted server-side
 * (POST /api/ads/click) without slowing the navigation down — the request is
 * fire-and-forget with keepalive so it survives the page transition.
 */
export function AdClickLink({
  id,
  href,
  title,
  className,
  children,
}: {
  id: string;
  href: string;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={title}
      className={className}
      onClick={() => {
        try {
          fetch("/api/ads/click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
            keepalive: true,
          }).catch(() => {});
        } catch {
          /* click tracking must never break navigation */
        }
      }}
    >
      {children}
    </a>
  );
}
