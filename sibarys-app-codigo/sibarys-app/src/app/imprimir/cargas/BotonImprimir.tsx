"use client";

/** Barra superior del reporte (no sale en la impresión). */
export default function BotonImprimir() {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-slate-100 px-4 py-3 print:hidden">
      <p className="text-sm text-slate-600">
        Para guardarlo como PDF, en la ventana de impresión elegí{" "}
        <b>Guardar como PDF</b>.
      </p>
      <button
        type="button"
        onClick={() => window.print()}
        className="btn-primary whitespace-nowrap"
      >
        🖨 Imprimir / Guardar PDF
      </button>
    </div>
  );
}
