import "server-only";
import { randomInt } from "crypto";

// Sin caracteres ambiguos (0/O, 1/l/I) -- el admin puede tener que leerla o transcribirla.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_=+";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;
const LENGTH = 20;

function pick(charset: string): string {
  // randomInt(charset.length) siempre cae dentro de [0, charset.length) -- el acceso nunca es
  // undefined, pero noUncheckedIndexedAccess no puede saberlo por sí solo.
  return charset[randomInt(charset.length)] as string;
}

/**
 * Contraseña temporal para cuentas de estudiante creadas o reseteadas por un admin.
 * crypto.randomInt (CSPRNG de Node), nunca Math.random. No se persiste en ningún lado --
 * solo vive en memoria durante la request que la genera y la muestra una única vez.
 */
export function generateTempPassword(): string {
  const required = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: LENGTH - required.length }, () => pick(ALL));
  const chars = [...required, ...rest];

  // Fisher-Yates con randomInt criptográfico: los 4 caracteres "garantizados" no deben quedar
  // siempre en las primeras posiciones.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = chars[i] as string;
    chars[i] = chars[j] as string;
    chars[j] = tmp;
  }

  return chars.join("");
}
