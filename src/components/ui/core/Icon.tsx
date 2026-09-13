import React from "react";

export type IconWeight = "regular" | "fill" | "bold" | "duotone";

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  /** Phosphor icon name without prefix, e.g. "book-open", "graduation-cap". */
  name: string;
  /** Default "fill" — the brand's icons are solid cyan glyphs. */
  weight?: IconWeight;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

const PREFIX: Record<IconWeight, string> = {
  regular: "ph",
  fill: "ph-fill",
  bold: "ph-bold",
  duotone: "ph-duotone",
};

export function Icon({ name, weight = "fill", size = 20, color = "currentColor", style, ...rest }: IconProps) {
  return (
    <i
      className={`${PREFIX[weight] ?? "ph-fill"} ph-${name}`}
      aria-hidden="true"
      style={{ fontSize: size, lineHeight: 1, color, display: "inline-flex", ...style }}
      {...rest}
    />
  );
}
