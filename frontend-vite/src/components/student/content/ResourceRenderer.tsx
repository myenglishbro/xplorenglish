"use client";

import { Icon } from "@/components/ui/core/Icon";
import { Button } from "@/components/ui/core/Button";
import { detectKnownProvider, type KnownProviderType } from "@/lib/resources/providers";
import type { ResourceItem } from "@/server/classrooms/content/types";

/**
 * Forma mínima que este componente realmente necesita -- estructural en vez de `ResourceItem`
 * completo, para poder reutilizarse tal cual desde cualquier "título + URL" del proyecto (ej.
 * documentos institucionales, ver features/institutionalDocuments) sin inventar lessonId/orderIndex
 * falsos. `type` es opcional porque solo importa para el caso dormant `embed` (ver resolveRenderable).
 */
export type RenderableResource = Pick<ResourceItem, "title" | "reference"> & Partial<Pick<ResourceItem, "type">>;

interface Renderable {
  mode: "iframe" | "link";
  embedUrl?: string;
  providerType?: KnownProviderType | "embed";
}

/**
 * Se re-detecta el proveedor a partir de `reference` en cada render (nunca se confía en un
 * `embedUrl` guardado) -- así, si mejoramos la detección en el futuro, los recursos ya existentes
 * se benefician sin tocar la DB. `type` guardado en DB solo se usa para el caso dormant `embed`
 * (no expuesto en el formulario actual, conservado por compatibilidad futura): ahí `reference` ES
 * la URL de embed final, elegida por un admin, nunca por un usuario final.
 */
function resolveRenderable(resource: RenderableResource): Renderable {
  const known = detectKnownProvider(resource.reference);
  if (known) return { mode: "iframe", embedUrl: known.embedUrl, providerType: known.type };
  if (resource.type === "embed") return { mode: "iframe", embedUrl: resource.reference, providerType: "embed" };
  return { mode: "link" };
}

const IFRAME_ALLOW: Record<KnownProviderType | "embed", string | undefined> = {
  youtube: "autoplay; fullscreen; picture-in-picture; encrypted-media",
  vimeo: "autoplay; fullscreen; picture-in-picture",
  drive: undefined,
  docs: undefined,
  slides: undefined,
  embed: undefined,
};

/**
 * Sandbox por proveedor -- antes solo se aplicaba al caso dormant 'embed', dejando los 5
 * proveedores conocidos (el 99.9% real de los recursos) sin ningún sandbox. `allow-scripts` +
 * `allow-same-origin` son imprescindibles para que los reproductores/visores de terceros
 * funcionen (YouTube/Vimeo necesitan su propio JS; los visores de Drive/Docs/Slides también) --
 * la combinación es un trade-off aceptado por los propios proveedores para embeds legítimos.
 * Lo que SÍ se retiene siempre: nunca `allow-top-navigation` ni `allow-modals`, así que el iframe
 * no puede navegar ni bloquear la pestaña del salón. `allow-popups` solo porque estos
 * reproductores a veces abren "ver en YouTube/Drive" en pestaña nueva -- eso es exactamente el
 * fallback que igual ofrecemos explícitamente abajo del iframe.
 */
const IFRAME_SANDBOX: Record<KnownProviderType | "embed", string> = {
  youtube: "allow-scripts allow-same-origin allow-presentation allow-popups",
  vimeo: "allow-scripts allow-same-origin allow-popups",
  drive: "allow-scripts allow-same-origin allow-popups allow-forms",
  docs: "allow-scripts allow-same-origin allow-popups allow-forms",
  slides: "allow-scripts allow-same-origin allow-popups allow-forms",
  embed: "allow-scripts allow-same-origin allow-popups allow-forms",
};

/** Mismo valor para los 5 -- no hay razón real para variarlo por proveedor: nunca se manda el
 * origin completo (mucho menos la URL con query) a un tercero, solo el origin cuando el destino
 * es igual de seguro (https->https). Es además el default moderno de los navegadores; se declara
 * explícito para no depender de eso. */
const IFRAME_REFERRER_POLICY = "strict-origin-when-cross-origin" as const;

/** Video (16:9, ancho acotado) vs. documento/presentación (visor amplio, alto fijo) -- misma
 * distinción que pidió el rediseño: un video no necesita todo el ancho del panel, un documento sí. */
const IS_VIDEO: Record<KnownProviderType | "embed", boolean> = {
  youtube: true,
  vimeo: true,
  drive: false,
  docs: false,
  slides: false,
  embed: false,
};

const LABEL: Record<KnownProviderType | "embed", string> = {
  youtube: "Video de YouTube",
  vimeo: "Video de Vimeo",
  drive: "Documento de Google Drive",
  docs: "Documento de Google Docs",
  slides: "Presentación de Google Slides",
  embed: "Contenido embebido",
};

const ICON: Record<KnownProviderType | "embed", string> = {
  youtube: "video-camera",
  vimeo: "video-camera",
  drive: "file-text",
  docs: "file-text",
  slides: "file-text",
  embed: "link-simple",
};

function ResourceLabel({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-2)" }}>
      <Icon name={icon} size={15} color="var(--text-muted)" />
      <span
        style={{
          font: "var(--weight-semibold) var(--text-caption-size)/1 var(--font-body)",
          letterSpacing: ".02em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {text}
      </span>
    </div>
  );
}

export function ResourceRenderer({ resource }: { resource: RenderableResource }) {
  const renderable = resolveRenderable(resource);

  if (renderable.mode === "iframe" && renderable.embedUrl) {
    const providerType = renderable.providerType as KnownProviderType | "embed";
    const isVideo = IS_VIDEO[providerType];
    return (
      <div>
        <ResourceLabel icon={ICON[providerType]} text={`${LABEL[providerType]} · ${resource.title}`} />
        <div
          style={{
            position: "relative",
            width: "100%",
            // Video: 16:9 con ancho máximo controlado (no ocupa todo el panel). Documento/
            // presentación: visor amplio a todo el ancho del panel, con una altura generosa fija
            // en vez de aspect-ratio (una hoja de Docs no es 16:9).
            maxWidth: isVideo ? 760 : undefined,
            aspectRatio: isVideo ? "16 / 9" : undefined,
            height: isVideo ? undefined : "min(72vh, 780px)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            border: "1px solid var(--border-subtle)",
            background: "var(--neutral-100)",
          }}
        >
          <iframe
            src={renderable.embedUrl}
            title={resource.title}
            loading="lazy"
            allow={IFRAME_ALLOW[providerType]}
            allowFullScreen
            referrerPolicy={IFRAME_REFERRER_POLICY}
            // La URL del iframe siempre la construye esta función a partir de un proveedor
            // conocido, o -- solo para el caso dormant 'embed' -- de una URL que ya eligió un
            // admin al crear el recurso. Nunca HTML pegado por nadie, nunca dangerouslySetInnerHTML.
            sandbox={IFRAME_SANDBOX[providerType]}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        </div>
        {/* Fallback siempre visible, no solo "si falla": un archivo de Drive/Docs/Slides sin
            permisos públicos no dispara ningún error de carga detectable (Google renderiza su
            propio mensaje de "sin acceso" DENTRO del iframe, que sigue cargando con éxito) -- la
            única forma confiable de no dejar al estudiante varado es ofrecer siempre el enlace
            directo, en vez de intentar adivinar si el embed "falló". */}
        <div style={{ marginTop: "var(--space-2)" }}>
          <Button
            variant="ghost"
            size="sm"
            icon="arrow-square-out"
            onClick={() => window.open(resource.reference, "_blank", "noopener,noreferrer")}
          >
            Abrir en una nueva pestaña
          </Button>
        </div>
      </div>
    );
  }

  // URL genérica: nunca se convierte en iframe (fuera del allowlist de detectKnownProvider), solo
  // se usa para mostrar el dominio en la tarjeta -- si ni siquiera es una URL parseable, se omite
  // el dominio en vez de romper el render.
  let domain: string | null = null;
  try {
    domain = new URL(resource.reference).hostname.replace(/^www\./, "");
  } catch {
    domain = null;
  }

  return (
    <div>
      <ResourceLabel icon="link-simple" text="Enlace externo" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "16px 18px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          background: "var(--surface-card)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            style={{
              width: 36,
              height: 36,
              flex: "0 0 auto",
              borderRadius: "var(--radius-pill)",
              background: "var(--surface-accent-subtle)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="link-simple" size={17} color="var(--cyan-700)" />
          </span>
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 2 }}>
            <span
              style={{
                font: "var(--weight-semibold) var(--text-body-size)/1.3 var(--font-body)",
                color: "var(--text-heading)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {resource.title}
            </span>
            {domain && (
              <span
                style={{
                  font: "var(--weight-regular) var(--text-caption-size)/1 var(--font-body)",
                  color: "var(--text-subtle)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {domain}
              </span>
            )}
          </span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          icon="arrow-square-out"
          onClick={() => window.open(resource.reference, "_blank", "noopener,noreferrer")}
        >
          Abrir recurso
        </Button>
      </div>
    </div>
  );
}
