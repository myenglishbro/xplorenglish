import type React from "react";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { WeeklyScheduleCalendar } from "./WeeklyScheduleCalendar";
import { WeeklyScheduleAgenda } from "./WeeklyScheduleAgenda";
import type { ScheduleBlockBase } from "./scheduleLayout";

export interface WeeklyScheduleProps<T extends ScheduleBlockBase> {
  blocks: T[];
  renderBlock: (block: T) => React.ReactNode;
  emptyTitle: string;
}

/**
 * Punto de entrada único de "Mi horario semanal" (FIX 7, segunda etapa) -- DESKTOP muestra un
 * calendario semanal real (WeeklyScheduleCalendar); MOBILE cambia a la agenda vertical agrupada por
 * día (WeeklyScheduleAgenda). El cambio es puramente CSS (@media min-width: 768px), nunca detección
 * de ancho por JS -- ambas vistas reciben exactamente los mismos `blocks` ya resueltos por la query
 * self-scoped del caller (Teacher o Student). Un único EmptyState si no hay ningún bloque, para no
 * mostrar un calendario/agenda vacíos.
 */
export function WeeklySchedule<T extends ScheduleBlockBase>({ blocks, renderBlock, emptyTitle }: WeeklyScheduleProps<T>) {
  if (blocks.length === 0) {
    return <EmptyState icon="calendar-blank" title={emptyTitle} />;
  }

  return (
    <div>
      <div className="xp-weekly-schedule-desktop">
        <WeeklyScheduleCalendar blocks={blocks} renderBlock={renderBlock} />
      </div>
      <div className="xp-weekly-schedule-mobile">
        <WeeklyScheduleAgenda blocks={blocks} renderBlock={renderBlock} emptyTitle={emptyTitle} />
      </div>
      <style>{`
        .xp-weekly-schedule-desktop { display: none; }
        .xp-weekly-schedule-mobile { display: block; }
        @media (min-width: 768px) {
          .xp-weekly-schedule-desktop { display: block; }
          .xp-weekly-schedule-mobile { display: none; }
        }
      `}</style>
    </div>
  );
}
