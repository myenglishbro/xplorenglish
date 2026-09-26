import type { AvailabilityBlockItem, OccupiedBlockItem } from "@/features/availability/types";
import { DAY_OF_WEEK_LABELS, type ClassScheduleItem } from "@/server/scheduling/types";
import type { AssignableTeacher } from "@/server/admin/classrooms/types";
import { coversInterval, findOverlapping, timeToMinutes } from "@/features/availability/coverage";

type ScheduleMatch = "compatible" | "partial" | "none";

export interface RankedTeacher extends AssignableTeacher {
  scheduleMatch: ScheduleMatch;
  levelMatch: boolean;
  /** FIX 2B -- cubre la disponibilidad declarada, pero ya tiene otro salón asignado en (al menos
   * uno de) esos horarios. Señal negativa, nunca bloquea la asignación manual. */
  hasConflict: boolean;
  hint: string;
}

function describeConflict(conflictingSchedules: ClassScheduleItem[]): string {
  if (conflictingSchedules.length === 1) {
    const s = conflictingSchedules[0];
    return `Conflicto de horario · ${DAY_OF_WEEK_LABELS[s.dayOfWeek]} ${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)}`;
  }
  return `Conflicto de horario · ${conflictingSchedules.length} horarios`;
}

/**
 * AJUSTE 1 -- recomendación simple (no bloqueante) para priorizar profesores al configurar un
 * salón: prioriza a quien tenga disponibilidad compatible con el horario del salón y, cuando sea
 * posible, nivel/skill compatible. Sin porcentajes ni scoring -- solo orden + etiqueta de texto.
 * NUNCA excluye candidatos: siempre devuelve la lista completa, solo reordenada.
 *
 * FIX 2B añade una señal más: disponibilidad declarada YA NO basta para considerar a un profesor
 * completamente libre -- si tiene otro salón asignado que se solapa con el horario solicitado
 * (occupiedByTeacher, derivado de class_schedules -- ver getTeacherOccupiedBlocksByIds), se marca
 * como en conflicto y se ordena por debajo de quien esté realmente libre, aunque siga por encima
 * de quien no cubre el horario. Sigue sin excluir candidatos ni impedir la asignación manual.
 */
export function rankTeachersForClassroom(
  candidates: AssignableTeacher[],
  activeSchedules: ClassScheduleItem[],
  availabilityByTeacher: Map<string, AvailabilityBlockItem[]>,
  skillNamesByTeacher: Map<string, string[]>,
  classroomLevel: string,
  occupiedByTeacher: Map<string, OccupiedBlockItem[]> = new Map()
): RankedTeacher[] {
  const ranked = candidates.map((teacher) => {
    const availability = availabilityByTeacher.get(teacher.id) ?? [];
    const skillNames = skillNamesByTeacher.get(teacher.id) ?? [];
    const occupied = occupiedByTeacher.get(teacher.id) ?? [];

    const coveredSchedules = activeSchedules.filter((schedule) =>
      coversInterval(availability, schedule.dayOfWeek, timeToMinutes(schedule.startTime), timeToMinutes(schedule.endTime))
    ).length;
    const scheduleMatch: ScheduleMatch =
      activeSchedules.length > 0 && coveredSchedules === activeSchedules.length
        ? "compatible"
        : coveredSchedules > 0
          ? "partial"
          : "none";
    const levelMatch = skillNames.includes(classroomLevel);

    const conflictingSchedules = activeSchedules.filter(
      (schedule) => findOverlapping(occupied, schedule.dayOfWeek, timeToMinutes(schedule.startTime), timeToMinutes(schedule.endTime)).length > 0
    );
    const hasConflict = conflictingSchedules.length > 0;

    let hint: string;
    if (activeSchedules.length === 0) {
      hint = levelMatch ? classroomLevel : "";
    } else if (scheduleMatch === "compatible" && hasConflict) {
      hint = describeConflict(conflictingSchedules);
    } else if (scheduleMatch === "compatible") {
      hint = levelMatch ? `Compatible · ${classroomLevel}` : "Compatible";
    } else if (scheduleMatch === "partial" && hasConflict) {
      hint = `Parcial · ${describeConflict(conflictingSchedules)}`;
    } else if (scheduleMatch === "partial") {
      hint = levelMatch ? `Parcial · ${classroomLevel}` : "Parcial";
    } else {
      hint = "No coincide";
    }

    return { ...teacher, scheduleMatch, levelMatch, hasConflict, hint };
  });

  return ranked.sort((a, b) => {
    const rank = (teacher: RankedTeacher) => {
      if (activeSchedules.length === 0) return teacher.levelMatch ? 1 : 0;
      if (teacher.scheduleMatch === "compatible") {
        if (teacher.hasConflict) return teacher.levelMatch ? 4 : 3;
        return teacher.levelMatch ? 6 : 5;
      }
      if (teacher.scheduleMatch === "partial") return teacher.levelMatch ? 2 : 1;
      return 0;
    };
    const difference = rank(b) - rank(a);
    if (difference !== 0) return difference;
    return a.firstName.localeCompare(b.firstName);
  });
}
