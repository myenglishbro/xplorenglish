import React from "react";
import { supabase } from "@/lib/supabase";
import { getRecordingUrl } from "@/lib/storage/recordings";
import { detectKnownProvider } from "@/lib/resources/providers";
import { MEDIA_PROVIDERS } from "@/server/questionBank/validation";
import { Spinner } from "@/components/ui/feedback/Spinner";

/** Medio de listening: Google Drive, YouTube o Vimeo embebido. Un audio necesita solo una barra; un video, 16:9. */
export function MediaEmbed({ url, type = "audio" }: { url: string; type?: "audio" | "video" }) {
  const provider = detectKnownProvider(url);
  if (!provider || !MEDIA_PROVIDERS.includes(provider.type)) return null;
  const compact = type === "audio" && provider.type === "drive";
  return (
    <iframe
      src={provider.embedUrl}
      title={type === "video" ? "Video del ejercicio" : "Audio del ejercicio"}
      allow="autoplay; fullscreen"
      allowFullScreen
      style={{
        width: "100%",
        ...(compact ? { height: 80 } : { aspectRatio: "16 / 9" }),
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-sunken)",
      }}
    />
  );
}

/** Reproduce una grabación de speaking desde Storage (URL firmada; RLS decide quién la puede abrir). */
export function RecordingPlayer({ path }: { path: string }) {
  const [url, setUrl] = React.useState<string | null | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    getRecordingUrl(supabase, path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (url === undefined) return <Spinner size={18} label="Cargando audio…" />;
  if (url === null) return <span style={{ color: "var(--text-muted)", fontSize: 13 }}>No pudimos cargar el audio.</span>;
  return <audio controls src={url} style={{ maxWidth: "100%" }} />;
}
