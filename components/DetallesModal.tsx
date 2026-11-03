"use client";

import React, { useState, useEffect } from "react";
import { formatPeso } from "./KpiStats";
import {
  X,
  Clock,
  Wrench,
  Pencil,
  Ban,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Minus,
  Plus,
} from "lucide-react";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-panel relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/80 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-slate-100">{trabajadorNombre}</span>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                {seccionKey === "_todos" ? "Todas las secciones" : SECCIONES[seccionKey]?.nombre_visible || seccionKey}
              </span>
            </div>
            <p className="text-xs text-slate-400">Historial de registros y auditoría de la semana</p>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {cargando ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-xs">Cargando registros del trabajador...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-xs text-red-300">
              {error}
            </div>
          ) : registros.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <p className="text-sm">No hay registros activos para esta semana.</p>
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
                        : "border-white/10 bg-slate-900/50 hover:border-white/20"
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
                            <Clock className="h-4 w-4" />
                          ) : (
                            <Wrench className="h-4 w-4" />
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

                            {/* Badge de estado */}
                            {esActivo ? (
                              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/40">
                                🟢 EN CURSO
                              </span>
                            ) : esAnulado ? (
                              <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">
                                ❌ ANULADO
                              </span>
                            ) : esPendiente ? (
                              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                                ⏳ PENDIENTE
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                ✅ APROBADO
                              </span>
                            )}

                            {r.seccion && (
                              <span className="text-[10px] text-slate-400">
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
                              Comisión: {formatPeso(r.comision)}
                            </div>
                          </div>
                        )}

                        {/* Foto Thumbnail */}
                        {r.foto_url && (
                          <button
                            onClick={() => setFotoAmpliada(r.foto_url || null)}
                            className="group relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-800 transition hover:border-amber-500/50"
                            title="Ver captura de pantalla"
                          >
                            <img
                              src={r.foto_url}
                              alt="Comprobante"
                              className="h-full w-full object-cover transition group-hover:scale-110"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition">
                              <ImageIcon className="h-4 w-4 text-white" />
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
                                className="flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-slate-800 px-2 text-xs font-semibold text-slate-300 hover:border-amber-500/40 hover:bg-slate-700 hover:text-amber-400"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Ajustar</span>
                              </button>
                            )}

                            {esAnulado ? (
                              <button
                                onClick={() => handleAnular(r.id as number, false)}
                                title="Restaurar registro"
                                className="flex h-8 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Restaurar</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAnular(r.id as number, true)}
                                title="Anular este registro"
                                className="flex h-8 items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                              >
                                <Ban className="h-3.5 w-3.5" />
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
      </div>

      {/* Diálogo para editar horas */}
      {editandoHoras && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="glass-panel w-full max-w-sm rounded-xl border border-white/10 p-5 shadow-2xl">
            <h3 className="text-sm font-extrabold text-slate-100">Ajustar Horas del Turno</h3>
            <p className="mt-1 text-xs text-slate-400">
              Modifica la duración del turno si hubo un error o descanso.
            </p>

            <div className="my-4 flex items-center justify-center gap-3">
              <button
                onClick={() => setInputHoras((h) => Math.max(0, Math.round((h - 0.5) * 10) / 10))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                <Minus className="h-4 w-4" />
              </button>

              <input
                type="number"
                step="0.1"
                min="0"
                value={inputHoras}
                onChange={(e) => setInputHoras(parseFloat(e.target.value) || 0)}
                className="w-24 rounded-lg border border-white/10 bg-slate-950 py-1.5 text-center text-lg font-extrabold text-amber-400 outline-none focus:border-amber-500/50"
              />

              <button
                onClick={() => setInputHoras((h) => Math.round((h + 0.5) * 10) / 10)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditandoHoras(null)}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarHoras}
                disabled={guardandoHoras}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
              >
                {guardandoHoras ? "Guardando..." : "Guardar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor de Foto Ampliada */}
      {fotoAmpliada && (
        <div
          onClick={() => setFotoAmpliada(null)}
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/90 p-4 cursor-zoom-out"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={fotoAmpliada}
              alt="Foto ampliada"
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl border border-white/10"
            />
            <button
              onClick={() => setFotoAmpliada(null)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
