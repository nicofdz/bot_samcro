"use client";

import React, { useState, useEffect } from "react";
import { formatPeso } from "./KpiStats";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faClock,
  faWrench,
  faPen,
  faBan,
  faRotateLeft,
  faCheck,
  faHourglassHalf,
  faImage,
  faCircleDot,
  faPlus,
  faMinus,
  faCircleNotch,
} from "@fortawesome/free-solid-svg-icons";
import { SECCIONES } from "@/lib/config";

interface RegistroDetalle {
  id: number | "activo";
  discord_id: string;
  nombre: string;
  seccion: string;
  tipo: "horas" | "servicio";
  horas: number;
  servicio_nombre?: string | null;
  monto: number;
  comision: number;
  nota?: string | null;
  foto_url?: string | null;
  validado: number; // 1: aprobado, 0: pendiente, -1: anulado, 2: activo
  validado_por?: string | null;
  creado_en: string;
}

interface DetallesModalProps {
  seccionKey: string;
  trabajadorNombre: string;
  offset: number;
  onClose: () => void;
  onActualizacion: () => void;
}

export function DetallesModal({
  seccionKey,
  trabajadorNombre,
  offset,
  onClose,
  onActualizacion,
}: DetallesModalProps) {
  const [registros, setRegistros] = useState<RegistroDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para diálogo de editar horas
  const [editandoHoras, setEditandoHoras] = useState<{ id: number; horas: number } | null>(null);
  const [inputHoras, setInputHoras] = useState<number>(0);
  const [guardandoHoras, setGuardandoHoras] = useState(false);

  // Estados para diálogo de editar servicio (monto / comisión)
  const [editandoServicio, setEditandoServicio] = useState<{ id: number; monto: number; comision: number } | null>(null);
  const [inputMonto, setInputMonto] = useState<number>(0);
  const [inputComision, setInputComision] = useState<number>(0);
  const [guardandoServicio, setGuardandoServicio] = useState(false);

  // Estado para visor de fotos
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  const cargarDetalles = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/detalles/${encodeURIComponent(seccionKey)}/${encodeURIComponent(
          trabajadorNombre
        )}?offset=${offset}`
      );
      if (!res.ok) {
        throw new Error("No se pudieron cargar los detalles");
      }
      const data = await res.json();
      setRegistros(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDetalles();
  }, [seccionKey, trabajadorNombre, offset]);

  // Anular o restaurar
  const handleAnular = async (id: number, anular: boolean) => {
    try {
      const res = await fetch(`/api/registros/${id}/anular`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anular }),
      });
      if (res.ok) {
        cargarDetalles();
        onActualizacion();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Abrir diálogo de edición de horas
  const handleAbrirEditarHoras = (id: number, horasActuales: number) => {
    setEditandoHoras({ id, horas: horasActuales });
    setInputHoras(horasActuales);
  };

  // Guardar edición de horas
  const handleGuardarHoras = async () => {
    if (!editandoHoras) return;
    setGuardandoHoras(true);
    try {
      const res = await fetch(`/api/registros/${editandoHoras.id}/horas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horas: inputHoras }),
      });
      if (res.ok) {
        setEditandoHoras(null);
        cargarDetalles();
        onActualizacion();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGuardandoHoras(false);
    }
  };

  const handleAbrirEditarServicio = (id: number, montoActual: number, comisionActual: number) => {
    setEditandoServicio({ id, monto: montoActual, comision: comisionActual });
    setInputMonto(montoActual);
    setInputComision(comisionActual);
  };

  const handleGuardarServicio = async () => {
    if (!editandoServicio) return;
    setGuardandoServicio(true);
    try {
      const res = await fetch(`/api/registros/${editandoServicio.id}/servicio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto: inputMonto, comision: inputComision }),
      });
      if (res.ok) {
        setEditandoServicio(null);
        cargarDetalles();
        onActualizacion();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGuardandoServicio(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md">
      <div className="samcro-panel relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0d0f15] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-wide text-slate-100">{trabajadorNombre}</span>
              <span className="rounded-lg bg-amber-500/15 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-amber-400 border border-amber-500/30">
                {seccionKey === "_todos" ? "Todas las secciones" : SECCIONES[seccionKey]?.nombre_visible || seccionKey}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Auditoría de registros, turnos y comisiones de la semana</p>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FontAwesomeIcon icon={faCircleNotch} className="h-8 w-8 text-amber-500 animate-spin" />
              <p className="mt-3 text-xs font-semibold">Cargando registros del trabajador...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-xs text-red-300">
              {error}
            </div>
          ) : registros.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-sm font-semibold">No hay registros activos para esta semana.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {registros.map((r, idx) => {
                const esActivo = r.id === "activo" || r.validado === 2;
                const esAnulado = r.validado === -1;
                const esPendiente = r.validado === 0;
                const esAprobado = r.validado === 1;

                return (
                  <div
                    key={r.id === "activo" ? `activo-${idx}` : r.id}
                    className={`rounded-xl border p-4 transition ${
                      esActivo
                        ? "border-emerald-500/40 bg-emerald-950/20"
                        : esAnulado
                        ? "border-red-500/20 bg-red-950/10 opacity-60"
                        : "border-white/10 bg-black/50 hover:border-white/20"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Izquierda: Icono + detalles */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            esActivo
                              ? "bg-emerald-500/20 text-emerald-400"
                              : r.tipo === "horas"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          {esActivo ? (
                            <div className="h-3 w-3 animate-ping rounded-full bg-emerald-400" />
                          ) : r.tipo === "horas" ? (
                            <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
                          ) : (
                            <FontAwesomeIcon icon={faWrench} className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-100">
                              {esActivo
                                ? "Turno en Vivo Activo"
                                : r.tipo === "horas"
                                ? `Turno: ${r.horas} Horas`
                                : `Servicio: ${r.servicio_nombre || "Servicio general"}`}
                            </span>

                            {/* Badge de estado con Font Awesome */}
                            {esActivo ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/40 uppercase">
                                <FontAwesomeIcon icon={faCircleDot} className="h-2.5 w-2.5" />
                                EN CURSO
                              </span>
                            ) : esAnulado ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-black text-red-400 border border-red-500/30 uppercase">
                                <FontAwesomeIcon icon={faBan} className="h-2.5 w-2.5" />
                                ANULADO
                              </span>
                            ) : esPendiente ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black text-amber-400 border border-amber-500/30 uppercase">
                                <FontAwesomeIcon icon={faHourglassHalf} className="h-2.5 w-2.5" />
                                PENDIENTE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30 uppercase">
                                <FontAwesomeIcon icon={faCheck} className="h-2.5 w-2.5" />
                                APROBADO
                              </span>
                            )}

                            {r.seccion && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                ({SECCIONES[r.seccion]?.nombre_visible || r.seccion})
                              </span>
                            )}
                          </div>

                          {/* Nota y fecha */}
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span>{new Date(r.creado_en).toLocaleString("es-CL")}</span>
                            {r.nota && <span className="text-slate-300">"{r.nota}"</span>}
                            {r.validado_por && (
                              <span className="text-slate-500">Por: {r.validado_por}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Derecha: Montos y Acciones */}
                      <div className="flex items-center gap-4 self-end sm:self-center">
                        {r.tipo === "servicio" && (
                          <div className="text-right">
                            <div className="text-xs font-semibold text-slate-400">
                              Cobro: {formatPeso(r.monto)}
                            </div>
                            <div className="text-sm font-extrabold text-purple-400">
                              Comisión: {formatPeso(r.comision)}{" "}
                              {r.monto > 0 && (
                                <span className="text-[10px] font-bold text-purple-300/80">
                                  ({Math.round((r.comision / r.monto) * 100)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Foto Thumbnail */}
                        {r.foto_url && (
                          <button
                            onClick={() => setFotoAmpliada(r.foto_url || null)}
                            className="group relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-800 transition hover:border-amber-500/50 cursor-pointer"
                            title="Ver captura de comprobante"
                          >
                            <img
                              src={r.foto_url}
                              alt="Comprobante"
                              className="h-full w-full object-cover transition group-hover:scale-110"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                              <FontAwesomeIcon icon={faImage} className="h-4 w-4 text-white" />
                            </div>
                          </button>
                        )}

                        {/* Botones de acción */}
                        {!esActivo && typeof r.id === "number" && (
                          <div className="flex items-center gap-1.5">
                            {r.tipo === "horas" && !esAnulado && (
                              <button
                                onClick={() => handleAbrirEditarHoras(r.id as number, r.horas)}
                                title="Editar horas del turno"
                                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-2.5 text-xs font-bold text-slate-300 hover:border-amber-500/40 hover:bg-slate-700 hover:text-amber-400 cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                                <span className="hidden sm:inline">Ajustar</span>
                              </button>
                            )}

                            {r.tipo === "servicio" && !esAnulado && (
                              <button
                                onClick={() => handleAbrirEditarServicio(r.id as number, r.monto, r.comision)}
                                title="Editar cobro o comisión del servicio"
                                className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-slate-800 px-2.5 text-xs font-bold text-slate-300 hover:border-purple-500/40 hover:bg-slate-700 hover:text-purple-400 cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faPen} className="h-3 w-3" />
                                <span className="hidden sm:inline">Ajustar</span>
                              </button>
                            )}

                            {esAnulado ? (
                              <button
                                onClick={() => handleAnular(r.id as number, false)}
                                title="Restaurar registro"
                                className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faRotateLeft} className="h-3 w-3" />
                                <span className="hidden sm:inline">Restaurar</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAnular(r.id as number, true)}
                                title="Anular este registro"
                                className="flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 cursor-pointer"
                              >
                                <FontAwesomeIcon icon={faBan} className="h-3 w-3" />
                                <span className="hidden sm:inline">Anular</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Diálogo editar horas */}
        {editandoHoras && (
          <div className="border-t border-white/10 bg-[#0d0f15] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              Ajustando horas del registro <span className="font-bold text-amber-400">#{editandoHoras.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputHoras((prev) => Math.max(0, Math.round((prev - 0.5) * 10) / 10))}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <FontAwesomeIcon icon={faMinus} className="h-3 w-3" />
              </button>
              <input
                type="number"
                step="0.1"
                min="0"
                value={inputHoras}
                onChange={(e) => setInputHoras(parseFloat(e.target.value) || 0)}
                className="w-20 rounded-lg border border-white/15 bg-black px-2 py-1.5 text-center text-xs font-bold text-amber-300 outline-none"
              />
              <button
                onClick={() => setInputHoras((prev) => Math.round((prev + 0.5) * 10) / 10)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
              </button>
              <button
                onClick={handleGuardarHoras}
                disabled={guardandoHoras}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black uppercase text-slate-950 hover:bg-amber-400 transition cursor-pointer"
              >
                {guardandoHoras ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => setEditandoHoras(null)}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Diálogo editar cobro y comisión de servicio */}
        {editandoServicio && (
          <div className="border-t border-white/10 bg-[#0d0f15] p-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs text-slate-300">
                Ajustando cobro y comisión del registro <span className="font-bold text-purple-400">#{editandoServicio.id}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                <span>Aplicar % rápido al cobro:</span>
                {[0.1, 0.3, 0.35, 0.4, 0.5].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setInputComision(Math.round(inputMonto * pct))}
                    className="rounded bg-slate-800 px-2 py-0.5 font-bold text-amber-400 hover:bg-slate-700 hover:text-white border border-white/10 transition cursor-pointer"
                  >
                    {Math.round(pct * 100)}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Cobro ($):</span>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={inputMonto}
                  onChange={(e) => {
                    const m = Math.max(0, parseInt(e.target.value) || 0);
                    setInputMonto(m);
                  }}
                  className="w-28 rounded-lg border border-white/15 bg-black px-2 py-1.5 text-center text-xs font-bold text-slate-200 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Comisión ($):</span>
                <input
                  type="number"
                  step="500"
                  min="0"
                  value={inputComision}
                  onChange={(e) => setInputComision(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-28 rounded-lg border border-white/15 bg-black px-2 py-1.5 text-center text-xs font-bold text-purple-300 outline-none focus:border-purple-500"
                />
                <span className="text-xs font-bold text-purple-400/90">
                  ({inputMonto > 0 ? Math.round((inputComision / inputMonto) * 100) : 0}%)
                </span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handleGuardarServicio}
                  disabled={guardandoServicio}
                  className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-black uppercase text-white hover:bg-purple-500 transition cursor-pointer"
                >
                  {guardandoServicio ? "Guardando..." : "Guardar Ajuste"}
                </button>
                <button
                  onClick={() => setEditandoServicio(null)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Visor de foto ampliada */}
        {fotoAmpliada && (
          <div
            onClick={() => setFotoAmpliada(null)}
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4 cursor-zoom-out"
          >
            <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-xl border border-white/20">
              <img src={fotoAmpliada} alt="Foto comprobante ampliada" className="h-auto max-h-[85vh] w-auto object-contain" />
              <button
                onClick={() => setFotoAmpliada(null)}
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/80 text-white border border-white/20 cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
