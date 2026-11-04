"use client";

import React, { useState } from "react";
import { TrabajadorNomina } from "@/lib/nomina";
import { formatPeso } from "./KpiStats";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFire,
  faMagnifyingGlass,
  faCheck,
  faHourglassHalf,
  faEye,
} from "@fortawesome/free-solid-svg-icons";

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
  const [guardando, setGuardando] = useState<Record<string, boolean>>({});

  const filtrados = trabajadores.filter((t) =>
    t.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleCheckboxClick = async (nombre: string, estadoActual: boolean) => {
    if (guardando[nombre]) return;
    setGuardando((prev) => ({ ...prev, [nombre]: true }));
    try {
      await onTogglePagado(nombre, !estadoActual);
    } finally {
      setGuardando((prev) => ({ ...prev, [nombre]: false }));
    }
  };

  return (
    <div className="samcro-panel overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      {/* Header del libro de nómina */}
      <div className="flex flex-col gap-3 border-b border-white/10 bg-[#0d0f15]/90 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <FontAwesomeIcon icon={faFire} className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-wide text-slate-100 uppercase">
              {seccionNombre}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {filtrados.length} {filtrados.length === 1 ? "miembro registrado" : "miembros registrados en bitácora"}
            </p>
          </div>
        </div>

        {/* Buscador táctico */}
        <div className="relative">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar miembro..."
            className="w-full rounded-xl border border-white/10 bg-black/60 py-2 pl-10 pr-4 text-xs font-semibold text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 sm:w-72"
          />
        </div>
      </div>

      {/* Tabla estilo libro de cuentas Sons of Anarchy */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-white/10 bg-black/70 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-5 py-3.5">Miembro / Rango</th>
              <th className="px-3 py-3.5 text-center">Horas en Turno</th>
              <th className="px-3 py-3.5 text-right">Pago Horas</th>
              <th className="px-3 py-3.5 text-center">Servicios</th>
              <th className="px-3 py-3.5 text-right">Comisiones</th>
              <th className="px-5 py-3.5 text-right">Total a Liquidar</th>
              <th className="px-4 py-3.5 text-center">Checklist Pago</th>
              <th className="px-5 py-3.5 text-center">Auditoría</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-medium text-slate-300">
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm font-bold text-slate-400">No se encontraron registros de nómina.</p>
                    <p className="text-xs text-slate-600 mt-1">Verifica los filtros o el periodo seleccionado.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtrados.map((t) => {
                const tienePago = t.total > 0;
                const estaPagado = t.pagado;
                const isUpdating = Boolean(guardando[t.nombre]);

                return (
                  <tr
                    key={t.nombre}
                    className={`transition-colors duration-150 hover:bg-white/[0.03] ${
                      estaPagado ? "bg-emerald-950/20" : ""
                    }`}
                  >
                    {/* Miembro & rol */}
                    <td className="px-5 py-3.5 font-bold text-slate-100">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black shadow-inner ${
                            t.esJefe
                              ? "border border-amber-500/40 bg-gradient-to-br from-amber-500/20 to-black text-amber-300"
                              : "border border-white/10 bg-gradient-to-br from-slate-800 to-black text-slate-300"
                          }`}
                        >
                          {t.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-100 font-bold">{t.nombre}</span>
                            {t.esTrabajadorSemana && (
                              <span
                                className="rounded-md bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-950 shadow-sm flex items-center gap-1"
                                title="Trabajador de la Semana de SAMCRO"
                              >
                                👑 TOP SEMANA
                              </span>
                            )}
                            {t.esJefe && (
                              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/30">
                                OFICIAL
                              </span>
                            )}
                          </div>
                          {estaPagado && t.pagado_por && (
                            <span className="block text-[10px] text-emerald-400/80 font-medium mt-0.5">
                              Pagado por: {t.pagado_por}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Horas */}
                    <td className="px-3 py-3.5 text-center">
                      {t.horas > 0 ? (
                        <span className="inline-block rounded-lg bg-black/60 px-2.5 py-1 text-xs font-black text-slate-200 border border-white/10">
                          {t.horas} h
                        </span>
                      ) : (
                        <span className="text-slate-600 font-bold">—</span>
                      )}
                    </td>

                    {/* Pago Horas */}
                    <td className="px-3 py-3.5 text-right">
                      {t.pagoHoras > 0 ? (
                        <span className="font-semibold text-slate-200">{formatPeso(t.pagoHoras)}</span>
                      ) : (
                        <span className="text-slate-600 font-semibold">$0</span>
                      )}
                    </td>

                    {/* Servicios */}
                    <td className="px-3 py-3.5 text-center">
                      {t.nServicios > 0 ? (
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-purple-500/15 px-2 text-xs font-black text-purple-300 border border-purple-500/30">
                          {t.nServicios}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-bold">—</span>
                      )}
                    </td>

                    {/* Comisiones */}
                    <td className="px-3 py-3.5 text-right">
                      {t.comisiones > 0 ? (
                        <span className="font-semibold text-slate-200">{formatPeso(t.comisiones)}</span>
                      ) : (
                        <span className="text-slate-600 font-semibold">$0</span>
                      )}
                    </td>

                    {/* Total a Liquidar */}
                    <td className="px-5 py-3.5 text-right font-black">
                      {tienePago ? (
                        <span className="text-sm font-black tracking-tight text-amber-300 drop-shadow-sm">
                          {formatPeso(t.total)}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-bold">$0</span>
                      )}
                    </td>

                    {/* Checklist Pago */}
                    <td className="px-4 py-3.5 text-center">
                      {tienePago ? (
                        <button
                          onClick={() => handleCheckboxClick(t.nombre, estaPagado)}
                          disabled={isUpdating}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-sm ${
                            estaPagado
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                              : "bg-black/60 text-slate-400 border border-white/10 hover:border-amber-500/40 hover:text-amber-300"
                          }`}
                        >
                          {estaPagado ? (
                            <>
                              {isUpdating ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                              ) : (
                                <FontAwesomeIcon icon={faCheck} className="h-3 w-3 text-emerald-400" />
                              )}
                              <span>Pagado</span>
                            </>
                          ) : (
                            <>
                              {isUpdating ? (
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                              ) : (
                                <FontAwesomeIcon icon={faHourglassHalf} className="h-2.5 w-2.5 text-amber-400/90" />
                              )}
                              <span>Pendiente</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-600">—</span>
                      )}
                    </td>

                    {/* Auditoría / Desglose */}
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => onVerDetalles(t)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-slate-300 transition-all hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300 cursor-pointer shadow-sm"
                      >
                        <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
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
