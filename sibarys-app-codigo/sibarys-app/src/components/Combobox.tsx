"use client";

import { useEffect, useRef, useState } from "react";

type Opt = { id: string; nombre: string };

export default function Combobox({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  allLabel = "Todos",
}: {
  options: Opt[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Mantener el texto en sync con el valor seleccionado
  useEffect(() => {
    if (!value) {
      setQuery("");
    } else {
      const sel = options.find((o) => o.id === value);
      if (sel) setQuery(sel.nombre);
    }
  }, [value, options]);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = options.filter((o) =>
    o.nombre.toLowerCase().includes(query.toLowerCase())
  );

  function seleccionar(id: string, nombre: string) {
    onChange(id);
    setQuery(nombre);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        className="field pr-9"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (e.target.value === "" && value) onChange("");
        }}
        onFocus={() => setOpen(true)}
      />
      {value || query ? (
        <button
          type="button"
          aria-label="Limpiar"
          onClick={() => {
            onChange("");
            setQuery("");
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      ) : null}

      {open ? (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              seleccionar("", "");
            }}
            className="block w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
          >
            {allLabel}
          </button>
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                seleccionar(o.id, o.nombre);
              }}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                o.id === value ? "font-semibold text-brand" : "text-slate-700"
              }`}
            >
              {o.nombre}
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-4 py-2 text-sm text-slate-400">Sin resultados</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
