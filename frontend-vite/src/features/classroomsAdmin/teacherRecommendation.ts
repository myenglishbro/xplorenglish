import type { AvailabilityBlockItem } from "@/features/availability/types";
import type { ClassScheduleItem } from "@/server/scheduling/types";
import type { AssignableTeacher } from "@/server/admin/classrooms/types";
import { coversInterval, timeToMinutes } from "@/features/availability/coverage";

type ScheduleMatch = "compatible" | "partial" | "none";

export interface RankedTeacher extends AssignableTeacher {
  scheduleMatch: ScheduleMatch;
  levelMatch: boolean;
  hint: string;
}

/**
 * AJUSTE 1 -- recomendación simple (no bloqueante) para priorizar profesores al configurar un
 * salón: prioriza a quien tenga disponibilidad compatible con el horario del salón y, cuando sea
 * posible, nivel/skill compatible. Sin porcentajes ni scoring -- solo orden + etiqueta de texto.
 * NUNCA excluye candidatos: siempre devuelve la lista completa, solo reordenada.
 */
export function rankTeachersForClassroom(
  candidates: AssignableTeacher[],
  activeSchedules: ClassScheduleItem[],
  availabilityByTeacher: Map<string, AvailabilityBlockItem[]>,
  skillNamesByTeacher: Map<string, string[]>,
  classroomLevel: string
): RankedTeacher[] {
  const ranked = candidates.map((teacher) => {
    const availability = availabilityByTeacher.get(teacher.id) ?? [];
    const skillNames = skillNamesByTeacher.get(teacher.id) ?? [];

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

    let hint: string;
    if (activeSchedules.length === 0) {
      hint = levelMatch ? classroomLevel : "";
    } else if (scheduleMatch === "compatible") {
      hint = levelMatch ? `Compatible · ${classroomLevel}` : "Compatible";
    } else if (scheduleMatch === "partial") {
      hint = levelMatch ? `Parcial · ${classroomLevel}` : "Parcial";
    } else {
      hint = "No coincide";
    }

    return { ...teacher, scheduleMatch, levelMatch, hint };
  });

  return ranked.sort((a, b) => {
    const rank = (teacher: RankedTeacher) =>
      activeSchedules.length === 0 ? (teacher.levelMatch ? 1 : 0)
        : teacher.scheduleMatch === "compatible" ? (teacher.levelMatch ? 4 : 3)
        : teacher.scheduleMatch === "partial" ? (teacher.levelMatch ? 2 : 1)
          : 0;
    const difference = rank(b) - rank(a);
    if (difference !== 0) return difference;
    return a.firstName.localeCompare(b.firstName);
  });
}
