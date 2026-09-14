/**
 * Formatea minutos enteros como "Xh Ymin" (o solo una de las dos partes cuando la otra es 0) --
 * puramente de presentación. El minuto entero sigue siendo la única unidad real/persistida en
 * todo el dominio de horas (ver DOMAIN_FUNCTIONS_API.md §0.7); esta función nunca participa en
 * ningún cálculo de saldo o consumo, solo formatea un número ya calculado en otro lugar.
 */
export function formatMinutesAsHours(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} h`;
  return `${hours} h ${remainder} min`;
}
