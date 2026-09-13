const LIMA_TZ = "America/Lima";

/**
 * Offset de America/Lima respecto a UTC, en minutos, para el instante dado.
 * Se deriva de Intl/tzdata (verificado en este runtime: devuelve "GMT-5"), nunca se
 * hardcodea "-05:00" -- si algún día cambiara la política horaria de Perú, esto se
 * ajusta solo, sin tocar código. Perú no observa horario de verano, pero igual no se
 * asume: se recalcula para el instante recibido.
 */
function getLimaOffsetMinutes(atUtc: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LIMA_TZ,
    timeZoneName: "shortOffset",
  }).formatToParts(atUtc);

  const offsetText = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = offsetText.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

/**
 * [start, end) en UTC correspondientes al día calendario actual en America/Lima --
 * "start" es la medianoche de hoy en Lima, "end" la medianoche de mañana en Lima,
 * ambos expresados como instantes UTC reales. Pensado para filtrar
 * `scheduled_start >= start AND scheduled_start < end` SIN transformar la columna
 * (sargable, compatible con un futuro índice sobre scheduled_start).
 */
export function getTodayRangeInLima(now: Date = new Date()): { start: Date; end: Date } {
  const offsetMinutes = getLimaOffsetMinutes(now);

  // Hora de pared en Lima ahora mismo, expresada como si fuera un instante UTC (truco
  // estándar: sumar el offset "revela" el reloj local en los componentes getUTC*).
  const limaWallNow = new Date(now.getTime() + offsetMinutes * 60_000);
  const year = limaWallNow.getUTCFullYear();
  const month = limaWallNow.getUTCMonth();
  const day = limaWallNow.getUTCDate();

  // Medianoche de "hoy" en hora de pared Lima, todavía interpretada como UTC.
  const limaMidnightAsUtc = Date.UTC(year, month, day, 0, 0, 0, 0);

  // Instante UTC real: se resta el offset (offset negativo para Lima, así que esto suma).
  const start = new Date(limaMidnightAsUtc - offsetMinutes * 60_000);
  const end = new Date(start.getTime() + 24 * 60 * 60_000);

  return { start, end };
}

export function formatTimeInLima(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: LIMA_TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatShortDateInLima(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: LIMA_TZ, day: "2-digit", month: "short" }).format(new Date(iso));
}

export function formatLongDateInLima(date: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/**
 * Día de la semana en hora de pared Lima para el instante dado, en la MISMA convención que
 * `Date.getDay()`/`EXTRACT(DOW)` de Postgres y que `class_schedules.day_of_week` (0006):
 * **0 = domingo, 1 = lunes, 2 = martes, 3 = miércoles, 4 = jueves, 5 = viernes, 6 = sábado.**
 * Esto es una convención explícita, confirmada para este proyecto -- no una suposición. Ver
 * `DAY_OF_WEEK_LABELS` en `server/scheduling/types.ts` para las etiquetas en español en este
 * mismo orden.
 */
export function getLimaWeekday(atUtc: Date): number {
  const offsetMinutes = getLimaOffsetMinutes(atUtc);
  const limaWallNow = new Date(atUtc.getTime() + offsetMinutes * 60_000);
  return limaWallNow.getUTCDay();
}

/**
 * [start, end) en UTC de la semana calendario (lunes a domingo, uso de "vista semanal" -- NO
 * confundir con la convención de `day_of_week` de arriba, que empieza en domingo solo para
 * igualar `Date.getDay()`/Postgres; la semana que ve el admin en el calendario empieza en lunes
 * por convención de negocio, independiente de eso) que contiene `anchorDate` en hora de pared
 * Lima. Mismo patrón que `getTodayRangeInLima`: instantes UTC reales, sargable sin transformar
 * la columna `scheduled_start`.
 */
export function getWeekRangeInLima(anchorDate: Date = new Date()): { start: Date; end: Date } {
  const { start: todayStart } = getTodayRangeInLima(anchorDate);
  const weekday = getLimaWeekday(anchorDate); // 0=domingo..6=sábado
  const daysSinceMonday = (weekday + 6) % 7; // lunes=0, domingo=6
  const start = new Date(todayStart.getTime() - daysSinceMonday * 24 * 60 * 60_000);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60_000);
  return { start, end };
}

/**
 * Convierte una fecha+hora de PARED en Lima (ej. formulario "2025-03-10" + "18:00") al instante
 * UTC real que representa -- para construir `scheduled_start`/`scheduled_end` antes de escribir
 * en `sessions`. El offset se calcula sobre la fecha objetivo (no sobre "ahora"), consistente con
 * el resto de este módulo.
 */
export function limaWallClockToUtc(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const guess = new Date(Date.UTC(year as number, (month as number) - 1, day, hour, minute, 0, 0));
  const offsetMinutes = getLimaOffsetMinutes(guess);
  return new Date(guess.getTime() - offsetMinutes * 60_000);
}

/** Inverso parcial de limaWallClockToUtc: componentes de fecha/hora de pared en Lima para un
 * instante UTC, como strings listos para precargar <input type="date">/<input type="time">. */
export function toLimaDateTimeInputValues(iso: string): { date: string; time: string } {
  const atUtc = new Date(iso);
  const offsetMinutes = getLimaOffsetMinutes(atUtc);
  const wall = new Date(atUtc.getTime() + offsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}`;
  const time = `${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`;
  return { date, time };
}
