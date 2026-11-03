"use client";

import React, { useState, useEffect } from "react";
import { SECCIONES } from "@/lib/config";
import { Clock, Radio, User, ShieldCheck } from "lucide-react";

interface TurnoActivo {
  discord_id: string;
  nombre: string;
  seccion: string;
  canal_id: string;
  hora_inicio: string;
}

interface TurnosActivosViewProps {
  turnos: TurnoActivo[];
}

export function TurnosActivosView({ turnos }: TurnosActivosViewProps) {
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState<Record<string, string>>({});

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
        nuevo[t.discord_id] = `${pad(horas)}:${pad(minutos)}:${pad(segundos)}`;
      }

      setTiempoTranscurrido(nuevo);
    };

    actualizar();
    const timer = setInterval(actualizar, 1000);
    return () => clearInterval(timer);
  }, [turnos]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            Turnos de Trabajo en Vivo
          </h2>
          <p className="text-xs text-slate-400">
            Monitoreo en tiempo real de trabajadores que tienen turno abierto en Discord
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
          {turnos.length} {turnos.length === 1 ? "persona activa" : "personas activas"}
        </span>
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
            const duracion = tiempoTranscurrido[t.discord_id] || "00:00:00";

            return (
              <div
                key={t.discord_id}
                className="glass-card rounded-xl border border-emerald-500/30 p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
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
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-950/60 p-2.5 border border-white/5">
                  <div className="text-xs text-slate-400">
                    <div>Entrada:</div>
                    <div className="font-semibold text-slate-200">
                      {new Date(t.hora_inicio).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Tiempo</div>
                    <div className="font-mono text-sm font-extrabold text-emerald-400">{duracion}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
