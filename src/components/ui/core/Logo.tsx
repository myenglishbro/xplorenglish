import React from "react";

export interface LogoProps {
  height?: number;
  /** Relative path to the design system's assets/ directory from the consuming page. */
  assetBase?: string;
  /** Render the type-only fallback instead of the PNG lockup. */
  showWordmarkFallback?: boolean;
  style?: React.CSSProperties;
}

export function Logo({ height = 44, assetBase = "/assets", showWordmarkFallback = false, style }: LogoProps) {
  if (showWordmarkFallback) {
    return (
      <span style={{ font: `var(--weight-extrabold) ${height * 0.6}px/1 var(--font-display)`, color: "var(--xp-orange)", ...style }}>
        Xplore<span style={{ color: "var(--xp-cyan)" }}>English</span>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${assetBase}/logo-xplore-english.png`} alt="X-plore English" style={{ height, width: "auto", display: "block", ...style }} />;
}
