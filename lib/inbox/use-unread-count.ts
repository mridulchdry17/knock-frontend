"use client";

import { useEffect, useState } from "react";
import { fetchInboxList } from "@/lib/inbox/client";

/**
 * Lightweight probe for sidebar / bottom-tab unread indicator.
 *
 * Polls the list endpoint once per mount and refreshes on a 60s interval.
 * Returns 0 when unauthenticated, on 502, or on any error — calm-fail
 * (no badge surfaces if the upstream is unreachable).
 *
 * v0.5+ swap point: replace the polling with a server-sent event or push
 * channel so the badge updates instantly when a reply arrives.
 */
export function useInboxUnreadCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      fetchInboxList("all")
        .then((res) => {
          if (cancelled) return;
          if (res.kind === "list") setCount(res.data.unread_count);
          else setCount(0);
        })
        .catch(() => {
          if (!cancelled) setCount(0);
        });
    };

    tick();
    timer = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  return count;
}
