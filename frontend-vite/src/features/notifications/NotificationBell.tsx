import React from "react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@/components/ui/core/IconButton";
import { Badge } from "@/components/ui/core/Badge";
import { Icon } from "@/components/ui/core/Icon";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, type NotificationItem } from "./hooks";

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days} ${days === 1 ? "día" : "días"}`;
  return new Date(iso).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

/** Campana de la barra superior: contador de no leídas + panel con las últimas notificaciones. */
export function NotificationBell() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const items = data ?? [];
  const unread = items.filter((n) => !n.read).length;

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (n: NotificationItem) => {
    if (!n.read) markRead.mutate(n.id);
    setOpen(false);
    if (n.link?.startsWith("/")) navigate(n.link);
  };

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex" }}>
      <IconButton icon="bell" label={unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones"} onClick={() => setOpen((v) => !v)} active={open} />
      {unread > 0 && <Badge style={{ position: "absolute", top: -2, right: -4, pointerEvents: "none" }}>{unread > 9 ? "9+" : unread}</Badge>}

      {open && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 70,
            width: "min(380px, calc(100vw - 24px))",
            maxHeight: "min(480px, 70vh)",
            display: "flex",
            flexDirection: "column",
            background: "var(--surface-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
            <span style={{ font: "var(--weight-bold) 15px/1.3 var(--font-display)", color: "var(--text-heading)" }}>Notificaciones</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                style={{ border: 0, background: "none", cursor: "pointer", color: "var(--cyan-700)", font: "var(--weight-semibold) 13px/1 var(--font-body)" }}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto" }}>
            {isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
                <Spinner size={20} />
              </div>
            ) : isError ? (
              <p style={{ margin: 0, padding: 24, textAlign: "center", color: "var(--text-muted)" }}>No pudimos cargar tus notificaciones.</p>
            ) : items.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 32, color: "var(--text-muted)" }}>
                <Icon name="bell-slash" size={28} />
                <span>No tienes notificaciones</span>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openItem(n)}
                  style={{
                    display: "flex",
                    gap: 12,
                    width: "100%",
                    padding: "12px 16px",
                    textAlign: "left",
                    cursor: "pointer",
                    border: 0,
                    borderBottom: "1px solid var(--border-subtle)",
                    background: n.read ? "transparent" : "var(--surface-accent-subtle)",
                  }}
                >
                  <span style={{ flex: "0 0 auto", width: 8, height: 8, marginTop: 6, borderRadius: "50%", background: n.read ? "transparent" : "var(--xp-cyan)" }} aria-hidden />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ font: `var(--weight-${n.read ? "semibold" : "bold"}) 14px/1.35 var(--font-body)`, color: "var(--text-heading)" }}>{n.title}</span>
                    {n.body && <span style={{ font: "var(--weight-regular) 13px/1.4 var(--font-body)", color: "var(--text-body)" }}>{n.body}</span>}
                    <span style={{ font: "var(--weight-regular) 12px/1.3 var(--font-body)", color: "var(--text-muted)", marginTop: 2 }}>{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
