import type { ReactNode } from "react";
import { Icon } from "@/components/ui/core/Icon";
import { getStudentBalanceStatus, type BalanceTone } from "@/lib/hours/balanceStatus";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import type { AccessStatus, UserRole } from "@/server/admin/users/types";

type Tone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger";

const TONE_COLORS: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "var(--neutral-50)", fg: "var(--neutral-600, var(--text-muted))" },
  brand: { bg: "var(--orange-50)", fg: "var(--orange-700)" },
  accent: { bg: "var(--cyan-50)", fg: "var(--cyan-700)" },
  success: { bg: "var(--success-bg)", fg: "var(--success-fg)" },
  warning: { bg: "var(--warning-bg)", fg: "var(--warning-fg)" },
  danger: { bg: "var(--danger-bg)", fg: "var(--danger-fg)" },
};

/** Círculo con un icono y tooltip nativo -- reemplaza etiquetas de texto en celdas densas. El
 * `label` también es el aria-label, así que no se pierde accesibilidad al quitar el texto. */
export function IconBadge({ icon, tone, label, size = 30 }: { icon: string; tone: Tone; label: string; size?: number }) {
  const { bg, fg } = TONE_COLORS[tone];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{ width: size, height: size, borderRadius: "var(--radius-pill)", background: bg, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
    >
      <Icon name={icon} weight="fill" size={Math.round(size * 0.55)} color={fg} />
    </span>
  );
}

const ROLE_BADGE: Record<UserRole, { icon: string; tone: Tone; label: string }> = {
  admin: { icon: "shield-check", tone: "brand", label: "Administrador" },
  teacher: { icon: "chalkboard-teacher", tone: "accent", label: "Docente" },
  student: { icon: "student", tone: "neutral", label: "Estudiante" },
};

export function RoleBadge({ role }: { role: UserRole }) {
  const { icon, tone, label } = ROLE_BADGE[role];
  return <IconBadge icon={icon} tone={tone} label={label} />;
}

/** Estado en iconos: activo/inactivo siempre; archivado y acceso pendiente solo cuando aplican. */
export function StatusIcons({ status, archived, accessStatus }: { status: string; archived: boolean; accessStatus?: AccessStatus | null }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {status === "active" ? (
        <IconBadge icon="check-circle" tone="success" label="Activo" />
      ) : (
        <IconBadge icon="prohibit" tone="danger" label="Inactivo" />
      )}
      {archived && <IconBadge icon="archive" tone="neutral" label="Archivado" />}
      {accessStatus === "pending" && <IconBadge icon="key" tone="warning" label="Acceso pendiente: aún no configura su contraseña" />}
    </span>
  );
}

export function Avatar({ firstName, lastName, size = 36 }: { firstName: string; lastName: string; size?: number }) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-pill)",
        background: "var(--cyan-50)",
        color: "var(--cyan-700)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        font: "var(--weight-bold) 13px/1 var(--font-display)",
        letterSpacing: ".02em",
      }}
    >
      {initials}
    </span>
  );
}

const BAR_COLOR: Record<BalanceTone, string> = {
  success: "var(--success-solid)",
  warning: "var(--warning-solid)",
  danger: "var(--danger-solid)",
};

/** Horas: saldo actual en grande + barra (saldo / compradas) coloreada según la regla central de
 * saldo (getStudentBalanceStatus) + total comprado como apoyo. */
export function HoursMeter({ purchasedMinutes, balanceMinutes }: { purchasedMinutes: number | null; balanceMinutes: number | null }) {
  if (purchasedMinutes === null || balanceMinutes === null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  if (purchasedMinutes === 0) return <span style={{ color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>Sin compras</span>;

  const { tone, label } = getStudentBalanceStatus(balanceMinutes);
  const ratio = Math.min(1, Math.max(0, balanceMinutes / purchasedMinutes));

  return (
    <span title={`${label} · ${formatMinutesAsHours(purchasedMinutes)} compradas`} style={{ display: "flex", flexDirection: "column", gap: 5, width: 132 }}>
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
        <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.2 var(--font-body)", color: "var(--text-heading)", fontVariantNumeric: "tabular-nums" }}>
          {formatMinutesAsHours(balanceMinutes)}
        </span>
        <span style={{ fontSize: "var(--text-micro-size)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>de {formatMinutesAsHours(purchasedMinutes)}</span>
      </span>
      <span style={{ height: 6, borderRadius: "var(--radius-pill)", background: "var(--neutral-100)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${Math.round(ratio * 100)}%`, background: BAR_COLOR[tone], borderRadius: "var(--radius-pill)" }} />
      </span>
    </span>
  );
}

/** Encabezado de página: icono en baldosa + título + subtítulo (p. ej. el conteo). */
export function PageHeading({ icon, title, subtitle, actions }: { icon: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <span
          aria-hidden="true"
          style={{ width: 48, height: 48, borderRadius: "var(--radius-md)", background: "var(--cyan-50)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          <Icon name={icon} weight="duotone" size={26} color="var(--cyan-700)" />
        </span>
        <div>
          <h1
            style={{
              font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
              letterSpacing: "var(--text-h2-ls)",
              color: "var(--text-heading)",
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle != null && <p style={{ margin: "2px 0 0", fontSize: "var(--text-body-sm-size)", color: "var(--text-muted)" }}>{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
