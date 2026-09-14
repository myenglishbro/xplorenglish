import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/core/Icon";
import { Button } from "@/components/ui/core/Button";
import { formatShortDateInLima, toLimaDateTimeInputValues } from "@/lib/datetime/lima";

export interface WeekNavProps {
  /** Lunes 00:00 Lima de la semana visible, como instante UTC real. */
  weekStartIso: string;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}

function buildHref(basePath: string, searchParams: Record<string, string | undefined>, weekParam?: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  if (weekParam) params.set("week", weekParam);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** La semana vive en la URL (?week=YYYY-MM-DD, lunes de esa semana). "Hoy" simplemente omite el
 * parámetro. */
export function WeekNav({ weekStartIso, basePath, searchParams }: WeekNavProps) {
  const start = new Date(weekStartIso);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60_000); // domingo de esa semana, para el label
  const prevWeekParam = toLimaDateTimeInputValues(new Date(start.getTime() - 7 * 24 * 60 * 60_000).toISOString()).date;
  const nextWeekParam = toLimaDateTimeInputValues(new Date(start.getTime() + 7 * 24 * 60 * 60_000).toISOString()).date;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
      <Link to={buildHref(basePath, searchParams, prevWeekParam)} style={{ textDecoration: "none" }}>
        <Button variant="secondary" size="sm" icon="caret-left">
          Semana anterior
        </Button>
      </Link>
      <Link to={buildHref(basePath, searchParams)} style={{ textDecoration: "none" }}>
        <Button variant="secondary" size="sm">
          Hoy
        </Button>
      </Link>
      <Link to={buildHref(basePath, searchParams, nextWeekParam)} style={{ textDecoration: "none" }}>
        <Button variant="secondary" size="sm" iconRight="caret-right">
          Semana siguiente
        </Button>
      </Link>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) var(--text-body-sm-size)/1 var(--font-body)", color: "var(--text-muted)" }}>
        <Icon name="calendar-blank" size={16} />
        {formatShortDateInLima(start.toISOString())} – {formatShortDateInLima(end.toISOString())}
      </span>
    </div>
  );
}
