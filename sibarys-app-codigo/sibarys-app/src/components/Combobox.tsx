"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

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
      <Search
        aria-hidden="true"
        size={18}
        strokeWidth={2.6}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-tenue"
      />
      <input
        className="field pl-11 pr-11"
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
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-tenue hover:bg-fondo hover:text-tinta"
        >
          <X size={18} strokeWidth={2.6} />
        </button>
      ) : null}

      {open ? (
        <div className="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl bg-white p-1.5 shadow-flotante">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              seleccionar("", "");
            }}
            className="block min-h-[44px] w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-tenue hover:bg-fondo"
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
              className={`block min-h-[44px] w-full rounded-xl px-3 py-2.5 text-left text-[15px] hover:bg-fondo ${
                o.id === value ? "bg-brand-suave font-extrabold text-brand-dark" : "font-bold text-tinta"
              }`}
            >
              {o.nombre}
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-sm font-bold text-tenue">Sin resultados</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
