import type { Metadata } from "next";
import "@phosphor-icons/web/regular";
import "@phosphor-icons/web/fill";
import "@phosphor-icons/web/bold";
import "@phosphor-icons/web/duotone";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "X-plore English",
  description: "Tu inglés. Tus objetivos. Tu ritmo. Tu plan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
