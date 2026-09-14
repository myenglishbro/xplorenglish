/** Formatea un monto + moneda ISO (ej. "PEN") como texto localizado ("S/ 150.00") -- puramente de
 * presentación, nunca participa en ningún cálculo financiero. */
export function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(amount);
  } catch {
    // Código de moneda no reconocido por Intl (no debería pasar con datos reales) -- degrada a un
    // formato simple en vez de lanzar, ya que esto es solo presentación.
    return `${currency} ${amount.toFixed(2)}`;
  }
}
