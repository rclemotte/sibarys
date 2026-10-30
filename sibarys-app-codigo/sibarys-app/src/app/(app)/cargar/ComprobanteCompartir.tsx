"use client";

import { useEffect, useRef, useState } from "react";
import { fmtDateTime, fmtMoney, fmtNumber } from "@/lib/format";
import type { Comprobante } from "./actions";

const ANCHO = 1080;
const FUENTE = "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const TEAL = "#0f766e";
const TEAL_OSCURO = "#0b544e";
const GRIS = "#64748b";
const TEXTO = "#0f172a";

/** Texto que acompaña la imagen en WhatsApp. */
export function textoComprobante(c: Comprobante): string {
  return [
    `⛽ Carga registrada – ${c.vehiculo}${c.patente ? ` (${c.patente})` : ""}`,
    `${fmtNumber(c.litros, 2)} L · ${fmtMoney(c.total)} · ${fmtNumber(c.odometro)} km`,
    `${c.chofer} · ${fmtDateTime(c.fecha)}`,
  ].join("\n");
}

/** Corta un texto para que entre en el ancho dado (agrega "…"). */
function recortar(ctx: CanvasRenderingContext2D, txt: string, max: number): string {
  if (ctx.measureText(txt).width <= max) return txt;
  let t = txt;
  while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

/** Rectángulo redondeado (con respaldo para celulares viejos). */
function caja(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

/** Dibuja el comprobante en un canvas y lo devuelve como PNG. */
function dibujar(c: Comprobante): Promise<Blob | null> {
  const filas: [string, string][] = [
    ["Fecha y hora", fmtDateTime(c.fecha)],
    ["Vehículo", `${c.vehiculo}${c.patente ? ` · ${c.patente}` : ""}`],
    ["Chofer", c.chofer || "—"],
    ["Estación", c.estacion || "—"],
    ["Combustible", c.combustible || "—"],
    ["Litros", `${fmtNumber(c.litros, 2)} L${c.tanqueLleno ? " · tanque lleno" : ""}`],
    ["Precio por litro", fmtMoney(c.precioLitro)],
    [
      "Odómetro",
      `${fmtNumber(c.odometro)} km${
        c.kmRecorridos != null ? ` (+${fmtNumber(c.kmRecorridos)} km)` : ""
      }`,
    ],
  ];
  const alto = 330 + filas.length * 96 + 250;
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  // Fondo y encabezado
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, ANCHO, alto);
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, ANCHO, 230);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 40px ${FUENTE}`;
  ctx.fillText("SIBARYS", 64, 92);
  ctx.font = `700 60px ${FUENTE}`;
  ctx.fillText("Comprobante de carga", 64, 172);
  ctx.textAlign = "right";
  ctx.font = `600 34px ${FUENTE}`;
  ctx.fillText(`Nº ${c.numero}`, ANCHO - 64, 92);
  ctx.textAlign = "left";

  // Tarjeta
  const x = 48;
  const w = ANCHO - 96;
  let y = 270;
  ctx.fillStyle = "#ffffff";
  caja(ctx, x, y, w, filas.length * 96 + 40, 28);
  y += 20;
  filas.forEach(([label, valor], i) => {
    if (i > 0) {
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 40, y);
      ctx.lineTo(x + w - 40, y);
      ctx.stroke();
    }
    ctx.fillStyle = GRIS;
    ctx.font = `500 32px ${FUENTE}`;
    ctx.fillText(label, x + 40, y + 60);
    ctx.fillStyle = TEXTO;
    ctx.font = `700 36px ${FUENTE}`;
    ctx.textAlign = "right";
    ctx.fillText(recortar(ctx, valor, w - 420), x + w - 40, y + 60);
    ctx.textAlign = "left";
    y += 96;
  });

  // Total
  y += 50;
  ctx.fillStyle = TEAL_OSCURO;
  caja(ctx, x, y, w, 130, 28);
  ctx.fillStyle = "#ccfbf1";
  ctx.font = `600 36px ${FUENTE}`;
  ctx.fillText("Total pagado", x + 40, y + 80);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 56px ${FUENTE}`;
  ctx.textAlign = "right";
  ctx.fillText(fmtMoney(c.total), x + w - 40, y + 86);
  ctx.textAlign = "left";

  ctx.fillStyle = GRIS;
  ctx.font = `500 28px ${FUENTE}`;
  ctx.textAlign = "center";
  ctx.fillText("Registrado en la app de combustible de Sibarys", ANCHO / 2, alto - 36);

  return new Promise((ok) => canvas.toBlob((b) => ok(b), "image/png"));
}

/**
 * Después de guardar una carga: muestra el comprobante y lo comparte como
 * imagen (WhatsApp u otra app) con el menú de compartir del celular.
 */
export default function ComprobanteCompartir({ comprobante }: { comprobante: Comprobante }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  // Se genera apenas aparece, así el botón comparte sin demora
  // (algunos celulares solo permiten compartir justo después del toque).
  useEffect(() => {
    let vivo = true;
    setAviso(null);
    dibujar(comprobante).then((blob) => {
      if (!vivo || !blob) return;
      const f = new File([blob], `comprobante-${comprobante.numero}.png`, { type: "image/png" });
      const u = URL.createObjectURL(blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = u;
      setArchivo(f);
      setUrl(u);
    });
    return () => {
      vivo = false;
    };
  }, [comprobante]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  function descargar() {
    if (!url || !archivo) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = archivo.name;
    a.click();
  }

  async function compartir() {
    if (!archivo) return;
    const texto = textoComprobante(comprobante);
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [archivo] })) {
      try {
        await nav.share({ files: [archivo], text: texto });
      } catch {
        // El chofer cerró el menú de compartir: no pasa nada
      }
      return;
    }
    // Computadora o navegador sin "compartir": se descarga la imagen
    descargar();
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Se descargó la imagen y se copió el texto. Pegalo en el grupo junto con la imagen.");
    } catch {
      setAviso("Se descargó la imagen. Enviala al grupo de la oficina.");
    }
  }

  return (
    <div className="card space-y-3 border-emerald-200">
      <p className="text-sm font-semibold text-slate-700">
        Mandá el comprobante al grupo de la oficina
      </p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Comprobante de la carga"
          className="mx-auto w-full max-w-xs rounded-lg border border-slate-200"
        />
      ) : (
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      )}
      <button
        type="button"
        className="btn-primary flex w-full items-center justify-center gap-2 !bg-[#25D366] hover:!bg-[#1ebe5b]"
        onClick={compartir}
        disabled={!archivo}
      >
        <span aria-hidden="true">📲</span> Compartir por WhatsApp
      </button>
      {aviso ? <p className="text-xs text-slate-500">{aviso}</p> : null}
    </div>
  );
}
