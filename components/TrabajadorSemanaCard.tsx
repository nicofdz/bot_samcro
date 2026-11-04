"use client";

import React, { useState, useEffect } from "react";
import { formatPeso } from "./KpiStats";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCrown,
  faTrophy,
  faMedal,
  faFire,
  faClock,
  faWrench,
  faDollarSign,
  faStar,
  faXmark,
  faEye,
  faCircleNotch,
  faChevronRight,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { ResumenTrabajadorSemana, MiembroRankingSemana } from "@/lib/trabajadorSemana";

interface TrabajadorSemanaCardProps {
  offset: number;
  onVerDetalles?: (nombre: string) => void;
}

export function TrabajadorSemanaCard({ offset, onVerDetalles }: TrabajadorSemanaCardProps) {
  const [datosPeriodo, setDatosPeriodo] = useState<ResumenTrabajadorSemana | null>(null);
  const [campeonVigente, setCampeonVigente] = useState<ResumenTrabajadorSemana | null>(null);
  const [liderActual, setLiderActual] = useState<ResumenTrabajadorSemana | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modo de visualización: 'vigente' (campeón semana pasada) vs 'carrera' (líder semana actual)
  const [modo, setModo] = useState<"vigente" | "carrera">("vigente");

  // Visor de foto ampliada
  const [fotoModal, setFotoModal] = useState<{ url: string; nombre: string } | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/trabajador-semana?offset=${offset}`);
      if (!res.ok) throw new Error("No se pudo cargar el Trabajador de la Semana");
      const data = await res.json();
      setDatosPeriodo(data.periodoSeleccionado);
      setCampeonVigente(data.campeonVigente);
      setLiderActual(data.liderActual);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [offset]);

  // Si estamos navegando a una semana histórica (offset < -1), mostramos directamente los datos de ese periodo
  const esHistorico = offset < -1;
  const resumenActivo = esHistorico
    ? datosPeriodo
    : modo === "vigente"
    ? campeonVigente
    : liderActual;

  const campeon = resumenActivo?.ganador || null;
  const top3 = resumenActivo?.top3 || [];
  const podio2 = top3.length > 1 ? top3[1] : null;
  const podio3 = top3.length > 2 ? top3[2] : null;

  if (cargando) {
    return (
      <div className="samcro-panel rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#0c0e14] via-[#121622] to-[#07080c] p-6 shadow-2xl flex items-center justify-center min-h-[160px]">
        <div className="flex items-center gap-3 text-amber-400">
          <FontAwesomeIcon icon={faCircleNotch} className="h-5 w-5 animate-spin" />
          <span className="text-xs font-black uppercase tracking-wider">Cargando Cuadro de Honor SAMCRO...</span>
        </div>
      </div>
    );
  }

  if (error || !resumenActivo) {
    return null;
  }

  return (
    <>
      <div className="samcro-panel relative overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-[#0d0f17] via-[#151926] to-[#08090d] shadow-2xl">
        {/* Adorno superior dorado con efecto halo */}
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />

        {/* Encabezado del Cuadro de Honor */}
        <div className="flex flex-col gap-3 border-b border-white/10 bg-black/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30">
              <FontAwesomeIcon icon={faCrown} className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                  Cuadro de Honor SAMCRO
                </span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[9px] font-black uppercase text-amber-300 border border-amber-500/40">
                  Oficial
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Reconocimiento semanal a la dedicación, horas y ventas del Club &bull; {resumenActivo.semanaTexto}
              </p>
            </div>
          </div>

          {/* Toggle entre Campeón Vigente y Líder de la Semana Actual */}
          {!esHistorico && (
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/60 p-1">
              <button
                type="button"
                onClick={() => setModo("vigente")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-wider transition cursor-pointer ${
                  modo === "vigente"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FontAwesomeIcon icon={faCrown} className="h-3 w-3" />
                <span>Campeón Vigente</span>
              </button>
              <button
                type="button"
                onClick={() => setModo("carrera")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-black uppercase tracking-wider transition cursor-pointer ${
                  modo === "carrera"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FontAwesomeIcon icon={faFire} className="h-3 w-3 text-orange-400" />
                <span>En Carrera (En Vivo)</span>
              </button>
            </div>
          )}
        </div>

        {/* Contenido Principal: El Trabajador de la Semana */}
        {!campeon ? (
          <div className="p-8 text-center text-slate-400">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/10 text-amber-400">
              <FontAwesomeIcon icon={faTrophy} className="h-6 w-6" />
            </div>
            <h4 className="mt-3 text-sm font-black uppercase tracking-wider text-slate-200">
              Aún no hay campeón registrado en este periodo
            </h4>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              Los turnos aprobados y los servicios con comprobante suman puntos para coronar al Trabajador de la Semana cada domingo a las 16:00 hrs.
            </p>
          </div>
        ) : (
          <div className="p-5 sm:p-6 lg:p-7">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
              {/* Columna Izquierda: FOTO EN GRANDE CON AURA DORADA */}
              <div className="col-span-1 lg:col-span-4 flex flex-col items-center justify-center text-center">
                <div className="relative group">
                  {/* Aura brillante */}
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 opacity-60 blur-md group-hover:opacity-90 transition duration-300" />

                  {/* Marco de la Foto en Grande */}
                  <div className="relative h-36 w-36 sm:h-44 sm:w-44 overflow-hidden rounded-2xl border-2 border-amber-400/80 bg-black shadow-2xl">
                    {campeon.avatar_url ? (
                      <img
                        src={campeon.avatar_url}
                        alt={campeon.nombre}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-600/30 to-black text-amber-400">
                        <span className="text-4xl font-black uppercase tracking-widest">
                          {campeon.nombre.slice(0, 2)}
                        </span>
                      </div>
                    )}

                    {/* Botón flotante para ver en grande si tiene foto */}
                    {campeon.avatar_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setFotoModal({
                            url: campeon.avatar_url!,
                            nombre: campeon.nombre,
                          })
                        }
                        title="Ver foto en tamaño completo"
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-amber-300"
                      >
                        <div className="flex items-center gap-1.5 rounded-lg bg-black/80 px-2.5 py-1 text-xs font-bold border border-amber-400/40">
                          <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                          <span>Ver Foto</span>
                        </div>
                      </button>
                    )}

                    {/* Corona Dorada Flotante */}
                    <div className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-md">
                      <FontAwesomeIcon icon={faCrown} className="h-4 w-4 drop-shadow" />
                    </div>

                    {/* Badge #1 */}
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-500/40">
                      TOP #1
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-400 border border-amber-500/30">
                    <FontAwesomeIcon icon={faStar} className="h-2.5 w-2.5 text-amber-300" />
                    TRABAJADOR DE LA SEMANA
                  </span>
                </div>
              </div>

              {/* Columna Derecha: DATOS, MÉTRICAS Y PODIO */}
              <div className="col-span-1 lg:col-span-8 flex flex-col justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tight text-white">
                      {campeon.nombre}
                    </h3>
                    {campeon.username && (
                      <span className="text-xs sm:text-sm font-bold text-amber-400/90">
                        @{campeon.username}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-300 font-medium">
                    {modo === "vigente" || esHistorico
                      ? "Coronado como el miembro más productivo del Club al cierre semanal del domingo a las 16:00 hrs."
                      : "Liderando actualmente la carrera de rendimiento para el próximo cierre del domingo a las 16:00 hrs."}
                  </p>
                </div>

                {/* Grid de 4 Estadísticas Clave */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {/* Horas */}
                  <div className="rounded-xl border border-white/10 bg-black/60 p-3 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      <FontAwesomeIcon icon={faClock} className="h-3 w-3 text-amber-400" />
                      <span>Turnos</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-100">
                      {campeon.horas} <span className="text-xs font-semibold text-slate-400">hrs</span>
                    </div>
                  </div>

                  {/* Ventas Totales */}
                  <div className="rounded-xl border border-white/10 bg-black/60 p-3 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      <FontAwesomeIcon icon={faDollarSign} className="h-3 w-3 text-emerald-400" />
                      <span>Ventas</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-emerald-400">
                      {formatPeso(campeon.ventas)}
                    </div>
                  </div>

                  {/* Servicios */}
                  <div className="rounded-xl border border-white/10 bg-black/60 p-3 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      <FontAwesomeIcon icon={faWrench} className="h-3 w-3 text-purple-400" />
                      <span>Trabajos</span>
                    </div>
                    <div className="text-base sm:text-lg font-black text-purple-300">
                      {campeon.servicios}{" "}
                      <span className="text-xs font-semibold text-slate-400">servicios</span>
                    </div>
                  </div>

                  {/* Puntuación */}
                  <div
                    className="relative group rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-3 text-center sm:text-left cursor-help"
                    title="Fórmula: (Horas × 100) + (Ventas ÷ 100) + (Trabajos × 50)"
                  >
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1">
                      <FontAwesomeIcon icon={faTrophy} className="h-3 w-3 text-amber-300" />
                      <span>Puntaje</span>
                      <FontAwesomeIcon icon={faCircleInfo} className="h-2.5 w-2.5 text-amber-400/60 ml-auto hidden sm:inline" />
                    </div>
                    <div className="text-base sm:text-lg font-black text-amber-300">
                      {campeon.puntos.toLocaleString("es-CL")}{" "}
                      <span className="text-xs font-semibold text-amber-500/80">pts</span>
                    </div>

                    {/* Tooltip explicativo al pasar el cursor */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col gap-1 w-52 rounded-xl bg-black/95 p-2.5 text-left text-[10px] text-slate-200 border border-amber-500/40 shadow-2xl z-20 pointer-events-none">
                      <span className="font-black text-amber-400 uppercase">¿Cómo se calcula?</span>
                      <span>&bull; <strong>1 hr turno</strong> = 100 pts</span>
                      <span>&bull; <strong>$1.000 ventas</strong> = 10 pts</span>
                      <span>&bull; <strong>1 trabajo</strong> = 50 pts</span>
                    </div>
                  </div>
                </div>

                {/* Podio Secundario: 2° y 3° Lugar */}
                {(podio2 || podio3) && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Podio de Honor del Periodo:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {podio2 && (
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-slate-950 text-[10px] font-black shadow">
                              2
                            </span>
                            <span className="text-xs font-bold text-slate-200">{podio2.nombre}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-400">
                            {formatPeso(podio2.ventas)} &bull; {podio2.horas}h
                          </div>
                        </div>
                      )}

                      {podio3 && (
                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-700 text-white text-[10px] font-black shadow">
                              3
                            </span>
                            <span className="text-xs font-bold text-slate-200">{podio3.nombre}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-400">
                            {formatPeso(podio3.ventas)} &bull; {podio3.horas}h
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para ver la foto ampliada en grande */}
      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md cursor-zoom-out"
        >
          <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl border-2 border-amber-400 shadow-2xl">
            <img
              src={fotoModal.url}
              alt={fotoModal.nombre}
              className="h-auto max-h-[80vh] w-auto object-contain"
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 text-center">
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-300 border border-amber-500/40">
                👑 TRABAJADOR DE LA SEMANA: {fotoModal.nombre}
              </span>
            </div>
            <button
              onClick={() => setFotoModal(null)}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/80 text-white border border-white/20 cursor-pointer hover:bg-black"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

