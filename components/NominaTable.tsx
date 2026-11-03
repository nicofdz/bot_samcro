"use client";

import React, { useState } from "react";
import { TrabajadorNomina } from "@/lib/nomina";
import { formatPeso } from "./KpiStats";
import { Check, Clock, Eye, Search, ShieldAlert, Sparkles, UserCheck } from "lucide-react";

interface NominaTableProps {
  seccionKey: string;
  seccionNombre: string;
  trabajadores: TrabajadorNomina[];
  offset: number;
  onVerDetalles: (trabajador: TrabajadorNomina) => void;
  onTogglePagado: (nombre: string, nuevoEstado: boolean) => Promise<void>;
}

export function NominaTable({
  seccionKey,
  seccionNombre,
  trabajadores,
  offset,
  onVerDetalles,
  onTogglePagado,
}: NominaTableProps) {
  const [busqueda, setBusqueda] = useState("");
  const [actualizando, setActualizando] = useState<string | null>(null);

  const filtrados = trabajadores.filter((t) =>
    t.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleCheckboxClick = async (nombre: string, estadoActual: boolean) => {
    setActualizando(nombre);
    try {
      await onTogglePagado(nombre, !estadoActual);
    } finally {
      setActualizando(null);
    }
  };

  return (
    <div className="glass-panel overflow-hidden rounded-xl border border-white/10 shadow-2xl">
      {/* Header de la tabla y buscador */}
      <div className="flex flex-col gap-3 border-b border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-100">{seccionNombre}</h2>
          <p className="text-xs text-slate-400">
            {filtrados.length} {filtrados.length === 1 ? "trabajador" : "trabajadores"} en lista
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full rounded-lg border border-white/10 bg-slate-950/80 py-1.5 pl-9 pr-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 sm:w-64"
          />
        </div>
      </div>

      {/* Tabla responsive */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/10 bg-slate-950/80 font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Trabajador</th>
              <th className="px-3 py-3 text-center">Horas</th>
              <th className="px-3 py-3 text-right">Pago Horas</th>
              <th className="px-3 py-3 text-center">Servicios</th>
              <th className="px-3 py-3 text-right">Comisiones</th>
              <th className="px-4 py-3 text-right">Total a Pagar</th>
              <th className="px-3 py-3 text-center">Checklist Pago</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-medium text-slate-300">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <p className="text-sm">No se encontraron trabajadores para esta sección o búsqueda.</p>
                </td>
              </tr>
            ) : (
              filtrados.map((t) => {
                const tienePago = t.total > 0;
                const estaPagado = t.pagado;
                const isUpdating = actualizando === t.nombre;

                return (
                  <tr
                    key={t.nombre}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      estaPagado ? "bg-emerald-950/15" : ""
                    }`}
                  >
                    {/* Trabajador & rol */}
                    <td className="px-4 py-3 font-semibold text-slate-100">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            t.esJefe
                              ? "border border-amber-500/30 bg-amber-500/20 text-amber-400"
                              : "border border-white/10 bg-slate-800 text-slate-300"
                          }`}
                        >
                          {t.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span>{t.nombre}</span>
                            {t.esJefe && (
                              <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wide text-amber-400 border border-amber-500/30">
                                Jefe
                              </span>
                            )}
                          </div>
                          {estaPagado && t.pagado_por && (
                            <span className="text-[10px] text-emerald-400/80">
                              Pagado por: {t.pagado_por}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Horas */}
                    <td className="px-3 py-3 text-center">
                      {t.horas > 0 ? (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-200">
                          {t.horas} h
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Pago Horas */}
                    <td className="px-3 py-3 text-right">
                      {t.pagoHoras > 0 ? (
                        <span className="font-semibold text-slate-200">{formatPeso(t.pagoHoras)}</span>
                      ) : (
                        <span className="text-slate-600">$0</span>
                      )}
                    </td>

                    {/* Servicios */}
                    <td className="px-3 py-3 text-center">
                      {t.nServicios > 0 ? (
                        <span className="rounded bg-purple-950/40 px-2 py-0.5 font-bold text-purple-300 border border-purple-500/20">
                          {t.nServicios}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Comisiones */}
                    <td className="px-3 py-3 text-right">
                      {t.comisiones > 0 ? (
                        <span className="font-semibold text-purple-300">{formatPeso(t.comisiones)}</span>
                      ) : (
                        <span className="text-slate-600">$0</span>
                      )}
                    </td>

                    {/* Total a pagar */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-extrabold ${
                          tienePago ? "text-amber-400" : "text-slate-600"
                        }`}
                      >
                        {formatPeso(t.total)}
                      </span>
                    </td>

                    {/* Checklist Pagado */}
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => handleCheckboxClick(t.nombre, estaPagado)}
                        disabled={isUpdating}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                          estaPagado
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-slate-800 text-slate-400 border border-white/10 hover:border-emerald-500/30 hover:text-slate-200"
                        }`}
                      >
                        {isUpdating ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                        ) : estaPagado ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Pagado</span>
                          </>
                        ) : (
                          <span>Pendiente</span>
                        )}
                      </button>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onVerDetalles(t)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-amber-500/40 hover:bg-slate-700 hover:text-amber-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Desglose</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
