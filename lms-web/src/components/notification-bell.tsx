"use client";

import { useState } from "react";
import useSWR from "swr";
import { Bell } from "lucide-react";
import { getNotifications, markNotificationRead } from "@/lib/api";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data, mutate } = useSWR("/notifications", () => getNotifications());
  const unread = data?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative text-ink-muted hover:text-ink"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 h-4 min-w-4 rounded-badge bg-brass px-1 text-center text-[10px] font-medium text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-card border border-paper-line bg-paper-alt shadow-sm">
          <p className="border-b border-paper-line px-3 py-2 text-xs font-medium text-ink-muted">Notifications</p>
          <ul className="max-h-80 overflow-auto">
            {data?.map((n) => (
              <li key={n._id} className="border-b border-paper-line px-3 py-2 last:border-0">
                <p className="text-sm font-medium text-ink">{n.title}</p>
                <p className="text-xs text-ink-muted">{n.body}</p>
                {!n.readAt && (
                  <button
                    type="button"
                    className="mt-1 text-xs text-brass"
                    onClick={async () => {
                      await markNotificationRead(n._id);
                      mutate();
                    }}
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
            {!data?.length && <li className="px-3 py-6 text-xs text-ink-muted">No notifications.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
