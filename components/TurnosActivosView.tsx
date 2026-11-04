"use client";

import React, { useState, useEffect } from "react";
import { SECCIONES } from "@/lib/config";
import { Clock, Radio, User, AlertTriangle, XCircle, RefreshCw, Flame } from "lucide-react";

interface TurnoActivo {
  discord_id: string;
  nombre: string;
  seccion: string;
  canal_id: string;
  hora_inicio: string;
}

interface TurnosActivosViewProps {
  turnos: TurnoActivo[];
  onTurnoFinalizado?: () => void;
}

export function TurnosActivosView({ turnos, onTurnoFinalizado }: TurnosActivosViewProps) {
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<Record<string, string>>({});
  const [cerrandoId, setCerrandoId] = useState<string | null>(null);

  useEffect(() => {
    const actualizar = () => {
      const ahora = Date.now();
      const nuevo: Record<string, string> = {};

      for (const t of turnos) {
        const inicio = new Date(t.hora_inicio).getTime();
        const diffSegundos = Math.max(0, Math.floor((ahora - inicio) / 1000));
        const horas = Math.floor(diffSegundos / 3600);
        const minutos = Math.floor((diffSegundos % 3600) / 60);
        const segundos = diffSegundos % 60;
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        nuevo[t.discord_id] = `${horas}:${pad(minutos)}:${pad(segundos)}`;
      }

      setTiempoTranscurrido(nuevo);
    };

    actualizar();
    const timer = setInterval(actualizar, 1000);
    return () => clearInterval(timer);
  }, [turnos]);

  const handleCerrarTurno = async (discordId: string, nombre: string) => {
    if (!confirm(`¿Deseas cerrar el turno de ${nombre}?`)) return;

    setCerrandoId(discordId);
    try {
      const res = await fetch(`/api/turnos/${encodeURIComponent(discordId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (onTurnoFinalizado) onTurnoFinalizado();
      } else {
        alert("Error al cerrar el turno");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCerrandoId(null);
    }
  };

  const handleCerrarColgados = async () => {
    const ahora = Date.now();
    const colgados = turnos.filter((t) => {
      const diffHoras = (ahora - new Date(t.hora_inicio).getTime()) / (1000 * 3600);
      return diffHoras > 24;
    });

    if (colgados.length === 0) {
      alert("No hay turnos con más de 24 horas acumuladas.");
      return;
    }

    if (!confirm(`¿Cerrar todos los ${colgados.length} turnos antiguos que llevan más de 24 horas abiertos?`)) {
      return;
    }

    for (const t of colgados) {
      await fetch(`/api/turnos/${encodeURIComponent(t.discord_id)}`, { method: "DELETE" });
    }

    if (onTurnoFinalizado) onTurnoFinalizado();
  };

  const ahora = Date.now();
  const hayColgados = turnos.some((t) => (ahora - new Date(t.hora_inicio).getTime()) / (1000 * 3600) > 24);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black tracking-wide text-slate-100 flex items-center gap-2 uppercase">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            Turnos de Trabajo en Vivo &bull; Radar SAMCRO
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Monitoreo en tiempo real de miembros con turno activo en los canales de Discord
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hayColgados && (
            <button
              onClick={handleCerrarColgados}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-black tracking-wider uppercase text-amber-300 hover:bg-amber-500/25 transition cursor-pointer shadow-sm"
              title="Cerrar los turnos que llevan más de 24 horas abiertos"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Limpiar turnos antiguos (&gt;24h)</span>
            </button>
          )}

          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black tracking-wider uppercase text-emerald-400 border border-emerald-500/30 shadow-sm flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 radar-live" />
            {turnos.length} {turnos.length === 1 ? "persona activa" : "personas activas"}
          </span>
        </div>
      </div>

      {turnos.length === 0 ? (
        <div className="samcro-panel flex flex-col items-center justify-center rounded-2xl p-14 text-center text-slate-500 border border-white/10">
          <Clock className="h-10 w-10 text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-300">No hay ningún turno abierto en este momento.</p>
          <p className="text-xs text-slate-500 mt-1">
            Los miembros inician turno desde su canal privado de Discord con el panel interactivo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {turnos.map((t) => {
            const seccion = SECCIONES[t.seccion];
            const duracion = tiempoTranscurrido[t.discord_id] || "0:00:00";
            const diffHoras = (ahora - new Date(t.hora_inicio).getTime()) / (1000 * 3600);
            const esColgado = diffHoras > 24;
            const isClosing = cerrandoId === t.discord_id;

            return (
              <div
                key={t.discord_id}
                className={`samcro-card rounded-2xl p-4 transition-all duration-200 border ${
                  esColgado
                    ? "border-amber-500/40 bg-gradient-to-b from-[#19150d] to-[#0c0e14]"
                    : "border-white/10 hover:border-amber-500/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 border border-white/10 text-xs font-black text-amber-300 shadow-inner">
                      {t.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{t.nombre}</h3>
                      <span className="text-[11px] font-bold text-amber-400">
                        {seccion ? seccion.nombre_visible : t.seccion}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/25">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 radar-live" />
                    En Turno
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-black/60 p-3 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Entrada
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {new Date(t.hora_inicio).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Tiempo Transcurrido
                    </span>
                    <span
                      className={`text-sm font-black font-mono tracking-wider ${
                        esColgado ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {duracion}
                    </span>
                  </div>
                </div>

                {esColgado && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Turno prolongado (+24 horas)</span>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-end">
                  <button
                    onClick={() => handleCerrarTurno(t.discord_id, t.nombre)}
                    disabled={isClosing}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-900/40 transition cursor-pointer"
                  >
                    {isClosing ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300 border-t-transparent" />
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                        <span>Cerrar Turno</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
