"use client";

import React, { useState, useEffect } from "react";
import { SECCIONES } from "@/lib/config";
import { Clock, Radio, User, ShieldCheck, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

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

    if (!confirm(`¿Cerrar todos los ${colgados.length} turnos antiguos que llevan más de 24 horas colgados?`)) {
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
          <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            Turnos de Trabajo en Vivo
          </h2>
          <p className="text-xs text-slate-400">
            Monitoreo en tiempo real de trabajadores que tienen turno abierto en Discord
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hayColgados && (
            <button
              onClick={handleCerrarColgados}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
              title="Cerrar los turnos que llevan más de 24 horas abiertos"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Limpiar turnos antiguos (&gt;24h)</span>
            </button>
          )}

          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
            {turnos.length} {turnos.length === 1 ? "persona activa" : "personas activas"}
          </span>
        </div>
      </div>

      {turnos.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center rounded-xl p-12 text-center text-slate-500 border border-white/10">
          <Clock className="h-8 w-8 text-slate-600 mb-2" />
          <p className="text-sm font-semibold">No hay ningún turno abierto en este momento.</p>
          <p className="text-xs text-slate-600 mt-1">
            Los trabajadores inician turno desde su canal de Discord con el panel de control.
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
                className={`glass-card rounded-xl border p-4 transition-transform hover:-translate-y-0.5 ${
                  esColgado ? "border-amber-500/30 bg-slate-900/60" : "border-emerald-500/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs border ${
                        esColgado
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {t.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-100">{t.nombre}</h3>
                      <span className="text-[11px] text-amber-400 font-semibold">
                        {seccion?.nombre_visible || t.seccion}
                      </span>
                    </div>
                  </div>

                  <span className="flex h-2.5 w-2.5 relative">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        esColgado ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        esColgado ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                    ></span>
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-950/60 p-2.5 border border-white/5">
                  <div className="text-xs text-slate-400">
                    <div>Entrada:</div>
                    <div className="font-semibold text-slate-200">
                      {new Date(t.hora_inicio).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "2-digit",
                      })}{" "}
                      {new Date(t.hora_inicio).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">
                      {esColgado ? "⚠️ Horas Acumuladas" : "Tiempo"}
                    </div>
                    <div
                      className={`font-mono text-sm font-extrabold ${
                        esColgado ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {duracion}
                    </div>
                  </div>
                </div>

                {/* Botón para cerrar turno */}
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => handleCerrarTurno(t.discord_id, t.nombre)}
                    disabled={isClosing}
                    className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition"
                  >
                    <XCircle className="h-3 w-3" />
                    <span>{isClosing ? "Cerrando..." : "Finalizar Turno"}</span>
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
