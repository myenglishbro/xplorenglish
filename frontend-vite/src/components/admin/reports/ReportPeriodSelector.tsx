import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Field } from "@/components/ui/forms/Field";
import { Input } from "@/components/ui/forms/Input";
import { Alert } from "@/components/ui/feedback/Alert";
import { getMonthRangeInLima } from "@/lib/datetime/lima";

const MONTHS_ES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

/** date puro "YYYY-MM-DD" -> "DD/MM/YYYY", mismo criterio que formatDateOnly en PayrollPeriodsTable
 * (nunca new Date()/timeZone sobre un date puro). */
function formatDateOnly(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/** Reconstruye un anchorDate a partir de components de calendario Y-M (mediodía UTC del día 15 --
 * cualquier hora "segura" alcanza, getMonthRangeInLima solo necesita caer dentro del mes deseado). */
function anchorFromMonthKey(year: number, monthIndexZeroBased: number): Date {
  return new Date(Date.UTC(year, monthIndexZeroBased, 15, 12));
}

function shiftAnchor(anchorDate: Date, deltaMonths: number): Date {
  const { startDate } = getMonthRangeInLima(anchorDate);
  const [y, m] = startDate.split("-").map(Number) as [number, number];
  const total = y * 12 + (m - 1) + deltaMonths;
  return anchorFromMonthKey(Math.floor(total / 12), total % 12);
}

export interface CustomRange {
  startDate: string;
  endDate: string;
}

export interface ReportPeriodSelectorProps {
  anchorDate: Date;
  customRange: CustomRange | null;
  onChangeAnchor: (next: Date) => void;
  onChangeCustomRange: (next: CustomRange | null) => void;
}

/**
 * Un solo estado de "periodo" vive en ReportesPage (anchorDate + customRange | null); este
 * componente solo lo edita. Navegar mes a mes o "Este mes"/"Mes anterior" siempre limpia
 * customRange (vuelve al modo mes); activar un rango personalizado válido limpia el anchor visual
 * (el encabezado pasa a mostrar el rango exacto, no un nombre de mes).
 */
export function ReportPeriodSelector({ anchorDate, customRange, onChangeAnchor, onChangeCustomRange }: ReportPeriodSelectorProps) {
  const [showCustomForm, setShowCustomForm] = React.useState(false);
  const [draftStart, setDraftStart] = React.useState(customRange?.startDate ?? "");
  const [draftEnd, setDraftEnd] = React.useState(customRange?.endDate ?? "");
  const [customError, setCustomError] = React.useState<string | undefined>();

  const { startDate: monthStart } = getMonthRangeInLima(anchorDate);
  const [year, monthOneBased] = monthStart.split("-").map(Number) as [number, number];
  const monthLabel = `${MONTHS_ES[monthOneBased - 1]} ${year}`;

  function goToMonth(next: Date) {
    onChangeCustomRange(null);
    setShowCustomForm(false);
    onChangeAnchor(next);
  }

  function applyCustomRange() {
    setCustomError(undefined);
    if (!draftStart || !draftEnd) {
      setCustomError("Ingresa ambas fechas.");
      return;
    }
    if (draftStart > draftEnd) {
      setCustomError("La fecha 'Desde' debe ser menor o igual que 'Hasta'.");
      return;
    }
    onChangeCustomRange({ startDate: draftStart, endDate: draftEnd });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <Button variant="secondary" size="sm" icon="caret-left" onClick={() => goToMonth(shiftAnchor(anchorDate, -1))} aria-label="Mes anterior" />
        <span
          style={{
            minWidth: 220,
            textAlign: "center",
            font: "var(--weight-bold) var(--text-h4-size)/1 var(--font-display)",
            letterSpacing: ".02em",
            color: "var(--text-heading)",
          }}
        >
          {customRange ? `${formatDateOnly(customRange.startDate)} – ${formatDateOnly(customRange.endDate)}` : monthLabel}
        </span>
        <Button variant="secondary" size="sm" icon="caret-right" onClick={() => goToMonth(shiftAnchor(anchorDate, 1))} aria-label="Mes siguiente" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Button variant={!customRange && monthStart === getMonthRangeInLima(new Date()).startDate ? "primary" : "ghost"} size="sm" onClick={() => goToMonth(new Date())}>
          Este mes
        </Button>
        <Button variant="ghost" size="sm" onClick={() => goToMonth(shiftAnchor(new Date(), -1))}>
          Mes anterior
        </Button>
        <Button variant={customRange ? "primary" : "ghost"} size="sm" icon="calendar-blank" onClick={() => setShowCustomForm((v) => !v)}>
          Rango personalizado
        </Button>
      </div>

      {showCustomForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-4)", background: "var(--surface-sunken)", borderRadius: "var(--radius-lg)", maxWidth: 420 }}>
          {customError && <Alert tone="danger">{customError}</Alert>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <Field label="Desde" required htmlFor="reportRangeStart">
              <Input id="reportRangeStart" type="date" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} />
            </Field>
            <Field label="Hasta" required htmlFor="reportRangeEnd">
              <Input id="reportRangeEnd" type="date" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <Button variant="primary" size="sm" onClick={applyCustomRange}>
              Aplicar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCustomForm(false);
                setCustomError(undefined);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
