import React from "react";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";

export interface AudioRecorderProps {
  /** Segundos máximos; al llegar al límite se detiene solo. */
  maxSeconds?: number;
  disabled?: boolean;
  onChange: (blob: Blob | null) => void;
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Grabadora con MediaRecorder del navegador: graba, permite escuchar y regrabar antes de enviar. */
export function AudioRecorder({ maxSeconds = 180, disabled, onChange }: AudioRecorderProps) {
  const [state, setState] = React.useState<"idle" | "recording" | "recorded">("idle");
  const [seconds, setSeconds] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<number | null>(null);

  const stopTimer = () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const stopStream = () => streamRef.current?.getTracks().forEach((t) => t.stop());

  React.useEffect(
    () => () => {
      stopTimer();
      stopStream();
    },
    []
  );
  React.useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const stop = () => {
    stopTimer();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Tu navegador no permite grabar audio. Prueba con Chrome, Edge, Firefox o Safari actualizado.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setPreviewUrl(URL.createObjectURL(blob));
        setState("recorded");
        onChange(blob);
      };
      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setState("recording");
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= maxSeconds) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("No pudimos acceder al micrófono. Permite el acceso en tu navegador e inténtalo de nuevo.");
    }
  };

  const reset = () => {
    setPreviewUrl(null);
    setState("idle");
    onChange(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {error && <Alert tone="danger">{error}</Alert>}
      {state === "idle" && (
        <div>
          <Button icon="microphone" onClick={start} disabled={disabled}>
            Empezar a grabar
          </Button>
        </div>
      )}
      {state === "recording" && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--danger-solid)" }} aria-hidden />
          <span style={{ font: "var(--weight-bold) 16px/1 var(--font-display)", color: "var(--text-heading)" }}>
            {formatTime(seconds)} / {formatTime(maxSeconds)}
          </span>
          <Button variant="danger" icon="stop" onClick={stop}>
            Detener
          </Button>
        </div>
      )}
      {state === "recorded" && previewUrl && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-3)" }}>
          <audio controls src={previewUrl} style={{ maxWidth: "100%" }} />
          <Button variant="secondary" size="sm" icon="arrow-counter-clockwise" onClick={reset} disabled={disabled}>
            Grabar de nuevo
          </Button>
        </div>
      )}
    </div>
  );
}
