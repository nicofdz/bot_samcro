"use client";

import React, { useState, useEffect, useRef } from "react";
import { UserSession } from "@/lib/auth";
import { SECCIONES, PORCENTAJES_JEFE } from "@/lib/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faStop,
  faClock,
  faCamera,
  faCheck,
  faCircleNotch,
  faEye,
  faXmark,
  faRotateRight,
  faTrashCan,
  faFileInvoiceDollar,
  faWrench,
  faBeerMugEmpty,
  faPenNib,
  faMusic,
  faGem,
  faCalendarCheck,
  faUserCheck,
  faPaste,
} from "@fortawesome/free-solid-svg-icons";

interface TurnoActivo {
  discord_id: string;
  nombre: string;
  seccion: string;
  canal_id: string;
  hora_inicio: string;
}

interface RegistroItem {
  id: number | string;
  discord_id: string;
  nombre: string;
  seccion: string;
  tipo: string;
  horas: number;
  servicio_nombre: string;
  monto: number;
  comision: number;
  nota: string;
  foto_url: string | null;
  validado: number;
  validado_por: string | null;
  creado_en: string;
}

interface ResumenSemana {
  horasTotales: number;
  serviciosTotales: number;
  totalComisiones: number;
  totalVentas: number;
  pagoHorasTotal: number;
  totalLiquidacion: number;
  pagado: boolean;
  pagado_por: string | null;
  pagado_en: string | null;
}

interface BitacoraTrabajadorViewProps {
  user: UserSession;
  offset: number;
  onActualizacion?: () => void;
}

// Optimiza la captura de pantalla a WebP max 1280px con ~85% de calidad
function optimizarCaptura(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No se pudo inicializar canvas"));

        ctx.drawImage(img, 0, 0, width, height);
        // Intentar WebP, fallback a JPEG
        const dataUrl = canvas.toDataURL("image/webp", 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Error al decodificar la imagen"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function parseHoraInicio(h: string): number {
  if (!h) return Date.now();
  const iso = h.endsWith("Z") ? h : `${h}Z`;
  return new Date(iso).getTime();
}

function formatoCronometro(segundosTotales: number): string {
  const s = Math.max(0, Math.floor(segundosTotales));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(h)}:${pad(m)}:${pad(seg)}`;
}

const ICONOS_AREA: Record<string, any> = {
  mecanica: faWrench,
  bar: faBeerMugEmpty,
  tatuajes: faPenNib,
  show: faMusic,
  coleccionables: faGem,
};

export function BitacoraTrabajadorView({ user, offset, onActualizacion }: BitacoraTrabajadorViewProps) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Estado del trabajador
  const [trabajadorInfo, setTrabajadorInfo] = useState<{
    nombre: string;
    discord_id: string;
    canal_id: string;
    esDiscordOriginal: boolean;
  } | null>(null);
  const [turnoActivo, setTurnoActivo] = useState<TurnoActivo | null>(null);
  const [resumen, setResumen] = useState<ResumenSemana | null>(null);
  const [registros, setRegistros] = useState<RegistroItem[]>([]);
  const [rangoTexto, setRangoTexto] = useState<string>("");

  // Cronómetro en vivo
  const [segundosTranscurridos, setSegundosTranscurridos] = useState(0);

  // Formulario Turno
  const [seccionTurno, setSeccionTurno] = useState<string>("mecanica");
  const [procesandoTurno, setProcesandoTurno] = useState(false);

  // Formulario Servicio / Venta
  const [seccionServicio, setSeccionServicio] = useState<string>("mecanica");
  const [servicioNombre, setServicioNombre] = useState<string>("Reparación y Modificación");
  const [montoServicio, setMontoServicio] = useState<string>("");
  const [notaServicio, setNotaServicio] = useState<string>("");
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoTamanioKb, setFotoTamanioKb] = useState<number | null>(null);
  const [procesandoServicio, setProcesandoServicio] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Visor HD Modal
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Cargar estado inicial
  const cargarEstado = async () => {
    setCargando(true);
    try {
      const res = await fetch(`/api/bitacora/mi-estado?offset=${offset}`);
      if (!res.ok) throw new Error("Error al obtener los datos de la bitácora");
      const data = await res.json();
      setTrabajadorInfo(data.trabajador);
      setTurnoActivo(data.turnoActivo);
      setResumen(data.resumen);
      setRegistros(data.registros || []);
      setRangoTexto(data.semana?.rangoTexto || "");
    } catch (err: any) {
      setError(err.message || "Error al conectar con la base de datos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEstado();
  }, [offset]);

  // Actualizar cronómetro cada segundo si hay turno activo
  useEffect(() => {
    if (!turnoActivo) {
      setSegundosTranscurridos(0);
      return;
    }

    const inicioMs = parseHoraInicio(turnoActivo.hora_inicio);
    const actualizar = () => {
      const diffSeg = Math.max(0, Math.floor((Date.now() - inicioMs) / 1000));
      setSegundosTranscurridos(diffSeg);
    };

    actualizar();
    const interval = setInterval(actualizar, 1000);
    return () => clearInterval(interval);
  }, [turnoActivo]);

  // Captura global de Ctrl + V (Portapapeles)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            try {
              const base64 = await optimizarCaptura(file);
              setFotoBase64(base64);
              setFotoTamanioKb(Math.round((base64.length * 3) / 4 / 1024));
              setMensajeExito("¡Captura de pantalla pegada desde el portapapeles con éxito!");
              setTimeout(() => setMensajeExito(null), 4000);
            } catch (err: any) {
              setError("No se pudo procesar la captura del portapapeles");
            }
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // Procesar archivo seleccionado manualmente o arrastrado
  const procesarArchivoImagen = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("El archivo seleccionado no es una imagen válida");
      return;
    }
    try {
      const base64 = await optimizarCaptura(file);
      setFotoBase64(base64);
      setFotoTamanioKb(Math.round((base64.length * 3) / 4 / 1024));
      setMensajeExito("Comprobante cargado y optimizado correctamente");
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err: any) {
      setError("Error al procesar el comprobante");
    }
  };

  // Cálculo en vivo de la comisión
  const montoNumerico = parseFloat(montoServicio.replace(/[^0-9]/g, "")) || 0;
  const esJefe = user.rol === "superadmin" || user.rol === "jefe";
  const porcentajeComision = esJefe
    ? (PORCENTAJES_JEFE[seccionServicio] ?? SECCIONES[seccionServicio]?.comision_servicio ?? 0.3)
    : (SECCIONES[seccionServicio]?.comision_servicio ?? 0.3);

  const comisionCalculada = Math.round(montoNumerico * porcentajeComision);
  const parteClub = Math.max(0, montoNumerico - comisionCalculada);

  // Iniciar turno
  const handleIniciarTurno = async () => {
    setProcesandoTurno(true);
    setError(null);
    try {
      const res = await fetch("/api/bitacora/turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "iniciar", seccion: seccionTurno }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al iniciar turno");

      setTurnoActivo(data.turno);
      setMensajeExito(data.mensaje);
      setTimeout(() => setMensajeExito(null), 4000);
      if (onActualizacion) onActualizacion();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcesandoTurno(false);
    }
  };

  // Finalizar turno
  const handleFinalizarTurno = async () => {
    if (!confirm("¿Deseas finalizar tu turno actual y registrar las horas en tu nómina?")) return;

    setProcesandoTurno(true);
    setError(null);
    try {
      const res = await fetch("/api/bitacora/turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "finalizar" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al finalizar turno");

      setTurnoActivo(null);
      setMensajeExito(data.mensaje);
      setTimeout(() => setMensajeExito(null), 5000);
      cargarEstado();
      if (onActualizacion) onActualizacion();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcesandoTurno(false);
    }
  };

  // Enviar Venta / Servicio
  const handleRegistrarServicio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoNumerico <= 0) {
      setError("Por favor ingresa un monto válido mayor a $0");
      return;
    }
    if (!fotoBase64) {
      setError("Debes pegar la captura de pantalla del comprobante con Ctrl + V antes de registrar");
      return;
    }

    setProcesandoServicio(true);
    setError(null);
    try {
      const res = await fetch("/api/bitacora/servicio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seccion: seccionServicio,
          servicio_nombre: servicioNombre.trim(),
          monto: montoNumerico,
          nota: notaServicio.trim(),
          foto_base64: fotoBase64,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar el servicio");

      // Limpiar formulario
      setMontoServicio("");
      setNotaServicio("");
      setFotoBase64(null);
      setFotoTamanioKb(null);
      setMensajeExito(data.mensaje || "¡Servicio registrado exitosamente en tu bitácora!");
      setTimeout(() => setMensajeExito(null), 5000);

      cargarEstado();
      if (onActualizacion) onActualizacion();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcesandoServicio(false);
    }
  };

  if (cargando && !resumen) {
    return (
      <div className="samcro-panel flex flex-col items-center justify-center py-20 text-slate-400 rounded-2xl border border-white/10">
        <FontAwesomeIcon icon={faCircleNotch} className="h-8 w-8 text-amber-500 animate-spin" />
        <p className="mt-4 text-xs font-black tracking-widest text-amber-400 uppercase">
          Cargando tu bitácora personal...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Éxito / Notificación */}
      {mensajeExito && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/70 p-3.5 text-xs font-bold text-emerald-200 flex items-center justify-between shadow-lg shadow-emerald-950/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
            </span>
            <span>{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="text-emerald-400 hover:text-white cursor-pointer">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Alerta de Error */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/70 p-3.5 text-xs font-bold text-red-200 flex items-center justify-between shadow-lg shadow-red-950/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
              <FontAwesomeIcon icon={faXmark} className="h-3.5 w-3.5" />
            </span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white cursor-pointer">
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tarjeta de Identidad y Estado de Vinculación */}
      <div className="samcro-card rounded-2xl border border-white/10 p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.nombre || user.username}
                className="h-14 w-14 rounded-2xl border-2 border-amber-500/40 object-cover shadow-md"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-black/60 text-amber-400 text-lg font-black">
                {(trabajadorInfo?.nombre || user.nombre || user.username)[0]?.toUpperCase()}
              </div>
            )}
            {turnoActivo && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-black" />
              </span>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-100">
                {trabajadorInfo?.nombre || user.nombre || user.username}
              </h1>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-400 border border-amber-500/30">
                {user.rol === "superadmin" ? "Mesa Directiva" : user.rol === "jefe" ? "Oficial / Jefe" : "Miembro / Trabajador"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <FontAwesomeIcon icon={faUserCheck} className="h-3 w-3" />
                {trabajadorInfo?.esDiscordOriginal ? (
                  <span>Canal Discord Vinculado ({trabajadorInfo.nombre})</span>
                ) : (
                  <span>Canal Web Sincronizado</span>
                )}
              </span>
              <span>&bull;</span>
              <span>Usuario: @{user.username}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-white/5 bg-black/50 px-3.5 py-2 text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Periodo Liquidación
            </span>
            <span className="text-xs font-black text-amber-400">
              {rangoTexto || "Semana Actual"}
            </span>
          </div>

          <button
            onClick={() => cargarEstado()}
            title="Recargar datos"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:border-amber-500 hover:text-amber-400 transition cursor-pointer"
          >
            <FontAwesomeIcon icon={faRotateRight} className={`h-3.5 w-3.5 ${cargando ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPIs Personales de la Semana */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Horas */}
        <div className="samcro-card rounded-2xl border border-white/10 p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Horas Turno</span>
            <FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-100">
              {resumen?.horasTotales ?? 0}
            </span>
            <span className="text-xs font-bold text-slate-400">hrs</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            {turnoActivo ? (
              <span className="text-emerald-400 font-bold">● Turno en curso ({formatoCronometro(segundosTranscurridos)})</span>
            ) : (
              <span>Sin turno activo</span>
            )}
          </div>
        </div>

        {/* Trabajos / Servicios */}
        <div className="samcro-card rounded-2xl border border-white/10 p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Servicios / Ventas</span>
            <FontAwesomeIcon icon={faFileInvoiceDollar} className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-slate-100">
              {resumen?.serviciosTotales ?? 0}
            </span>
            <span className="text-xs font-bold text-slate-400">registros</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            Ventas totales: ${(resumen?.totalVentas ?? 0).toLocaleString("es-CL")}
          </div>
        </div>

        {/* Ganancia a Liquidar */}
        <div className="samcro-card rounded-2xl border border-white/10 p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total a Cobrar</span>
            <span className="text-xs font-black text-amber-400">$</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-amber-400">
              ${(resumen?.totalLiquidacion ?? 0).toLocaleString("es-CL")}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            Comisiones: ${(resumen?.totalComisiones ?? 0).toLocaleString("es-CL")}
          </div>
        </div>

        {/* Estado de Pago */}
        <div className="samcro-card rounded-2xl border border-white/10 p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Checklist Pago</span>
            <FontAwesomeIcon icon={faCalendarCheck} className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-2">
            {resumen?.pagado ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-400 border border-emerald-500/40 uppercase">
                <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
                PAGADO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-black text-amber-400 border border-amber-500/40 uppercase">
                PENDIENTE
              </span>
            )}
          </div>
          <div className="mt-1 text-[10px] text-slate-400 truncate">
            {resumen?.pagado ? `Por ${resumen.pagado_por || "Directiva"}` : "A liquidar este domingo"}
          </div>
        </div>
      </div>

      {/* Grid Central: Turno en Vivo (Izquierda) + Subir Servicio con Ctrl+V (Derecha) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* MÓDULO 1: CONTROL DE TURNO EN VIVO */}
        <div className="samcro-card lg:col-span-4 rounded-2xl border border-white/10 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5 text-amber-500" />
                Control de Turno en Vivo
              </h2>
              {turnoActivo && (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30 uppercase animate-pulse">
                  EN VIVO
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Registra tus horas activas en el Club. Al finalizar se calculará el tiempo exacto.
            </p>

            {turnoActivo ? (
              /* Turno en curso */
              <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
                  {SECCIONES[turnoActivo.seccion]?.nombre_visible || turnoActivo.seccion}
                </div>
                <div className="my-2 font-mono text-3xl sm:text-4xl font-black text-slate-100 tracking-wider">
                  {formatoCronometro(segundosTranscurridos)}
                </div>
                <div className="text-[11px] text-slate-400">
                  Iniciado a las {new Date(turnoActivo.hora_inicio).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                </div>

                <button
                  type="button"
                  onClick={handleFinalizarTurno}
                  disabled={procesandoTurno}
                  className="mt-4 w-full rounded-xl bg-red-600/90 hover:bg-red-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-900/40 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {procesandoTurno ? (
                    <FontAwesomeIcon icon={faCircleNotch} className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faStop} className="h-3.5 w-3.5" />
                  )}
                  <span>Finalizar Turno y Registrar Horas</span>
                </button>
              </div>
            ) : (
              /* Sin turno */
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Área de Trabajo
                  </label>
                  <select
                    value={seccionTurno}
                    onChange={(e) => setSeccionTurno(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500"
                  >
                    {Object.entries(SECCIONES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.nombre_visible}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/40 p-3 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Sueldo base:</span>
                    <span className="font-bold text-amber-400">
                      {SECCIONES[seccionTurno]?.usa_sueldo_base ? "$10.000 (>= 10 hrs)" : "Por comisiones"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comisión del área:</span>
                    <span className="font-bold text-emerald-400">
                      {Math.round((SECCIONES[seccionTurno]?.comision_servicio || 0) * 100)}%
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleIniciarTurno}
                  disabled={procesandoTurno}
                  className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {procesandoTurno ? (
                    <FontAwesomeIcon icon={faCircleNotch} className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faPlay} className="h-3 w-3" />
                  )}
                  <span>Iniciar Turno Ahora</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-slate-500">
            <span>Nota: Tu turno aparecerá en tiempo real en la pantalla de jefatura y mesa directiva.</span>
          </div>
        </div>

        {/* MÓDULO 2: SUBIR SERVICIO / VENTA CON CAPTURA CTRL + V */}
        <div className="samcro-card lg:col-span-8 rounded-2xl border border-white/10 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <FontAwesomeIcon icon={faCamera} className="h-3.5 w-3.5 text-amber-500" />
              Subir Trabajo / Venta a Bitácora
            </h2>
            <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-300 border border-white/10">
              📸 Pega con <kbd className="text-amber-400 font-mono">Ctrl + V</kbd>
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Ingresa los datos del trabajo realizado y pega la captura de pantalla directamente sin tener que guardarla como archivo.
          </p>

          <form onSubmit={handleRegistrarServicio} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sección */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Área / División
                </label>
                <select
                  value={seccionServicio}
                  onChange={(e) => {
                    const sec = e.target.value;
                    setSeccionServicio(sec);
                    if (sec === "mecanica") setServicioNombre("Reparación y Modificación");
                    else if (sec === "bar") setServicioNombre("Venta de Trago / Botella");
                    else if (sec === "tatuajes") setServicioNombre("Tatuaje Personalizado");
                    else if (sec === "show") setServicioNombre("Show Privado");
                    else if (sec === "coleccionables") setServicioNombre("Venta Coleccionable");
                  }}
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500"
                >
                  {Object.entries(SECCIONES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.nombre_visible}
                    </option>
                  ))}
                </select>
              </div>

              {/* Concepto / Nombre del Servicio */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Concepto / Tipo de Trabajo
                </label>
                <input
                  type="text"
                  required
                  value={servicioNombre}
                  onChange={(e) => setServicioNombre(e.target.value)}
                  placeholder="Ej. Reparación y Pintura, Mesa VIP..."
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Monto de la Venta */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Monto Total de la Venta ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={montoServicio}
                    onChange={(e) => setMontoServicio(e.target.value)}
                    placeholder="Ej. 50000"
                    className="w-full rounded-xl border border-white/10 bg-black/60 pl-7 pr-3 py-2 text-xs font-bold text-amber-400 outline-none transition focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Detalle / Nota Opcional */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Detalle / Cliente / Patente (Opcional)
                </label>
                <input
                  type="text"
                  value={notaServicio}
                  onChange={(e) => setNotaServicio(e.target.value)}
                  placeholder="Ej. Sánchez - Dominator / Factura #142"
                  className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500"
                />
              </div>
            </div>

            {/* Calculadora en Vivo de Comisión */}
            {montoNumerico > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-amber-400 uppercase tracking-wide">
                    Desglose de Comisión ({Math.round(porcentajeComision * 100)}%):
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-400">Tu Ganancia: </span>
                    <span className="font-extrabold text-emerald-400">
                      ${comisionCalculada.toLocaleString("es-CL")}
                    </span>
                  </div>
                  <div className="text-slate-500">&bull;</div>
                  <div>
                    <span className="text-slate-400">Caja Club: </span>
                    <span className="font-extrabold text-slate-300">
                      ${parteClub.toLocaleString("es-CL")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ZONA DE CAPTURA DE PANTALLA (CTRL + V) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Comprobante / Captura de Pantalla</span>
                <span className="text-amber-400 text-[10px] font-normal">Requerido</span>
              </label>

              {fotoBase64 ? (
                /* Vista previa de la captura pegada */
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      onClick={() => setFotoAmpliada(fotoBase64)}
                      className="relative h-16 w-24 rounded-xl overflow-hidden border border-white/20 bg-black/60 cursor-pointer group shrink-0"
                    >
                      <img
                        src={fotoBase64}
                        alt="Comprobante"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <FontAwesomeIcon icon={faEye} className="h-4 w-4 text-white" />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-300">
                          Captura lista para enviar
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-400">
                          {fotoTamanioKb ? `${fotoTamanioKb} KB` : "Optimizada"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Haz clic en la miniatura para verificarla en grande antes de enviar
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFotoAmpliada(fotoBase64)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-500 hover:text-amber-400 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faEye} className="h-3 w-3" />
                      <span>Ver HD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFotoBase64(null);
                        setFotoTamanioKb(null);
                      }}
                      className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/20 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
                      <span>Quitar</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Zona interactiva de pegar o arrastrar */
                <div
                  ref={dropzoneRef}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) procesarArchivoImagen(file);
                  }}
                  className={`rounded-2xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
                    isDragOver
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-white/15 bg-black/40 hover:border-amber-500/50 hover:bg-black/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) procesarArchivoImagen(file);
                    }}
                  />

                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 mb-3">
                    <FontAwesomeIcon icon={faPaste} className="h-5 w-5" />
                  </div>

                  <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200">
                    Presiona <span className="text-amber-400">Ctrl + V</span> para pegar tu captura aquí
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    o haz clic para seleccionar una imagen desde tu dispositivo (JPG, PNG, WebP)
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] text-slate-400 border border-white/5">
                    <span>💡 Tip: Saca captura con <strong>Win + Shift + S</strong> y dale Ctrl+V de inmediato</span>
                  </div>
                </div>
              )}
            </div>

            {/* Botón de Enviar Servicio */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={procesandoServicio || !fotoBase64 || montoNumerico <= 0}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-4 py-3 text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {procesandoServicio ? (
                  <>
                    <FontAwesomeIcon icon={faCircleNotch} className="h-4 w-4 animate-spin" />
                    <span>Registrando y subiendo comprobante...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCheck} className="h-4 w-4" />
                    <span>Registrar Servicio en mi Bitácora</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MÓDULO 3: MIS REGISTROS DE LA SEMANA */}
      <div className="samcro-card rounded-2xl border border-white/10 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <FontAwesomeIcon icon={faFileInvoiceDollar} className="h-3.5 w-3.5 text-amber-500" />
              Mis Registros de Esta Semana ({registros.length})
            </h2>
            <p className="text-[11px] text-slate-400">
              Historial de turnos y servicios ingresados por ti durante el periodo activo
            </p>
          </div>
        </div>

        {registros.length === 0 ? (
          <div className="mt-6 rounded-xl border border-white/5 bg-black/40 py-12 text-center text-xs text-slate-400 font-medium">
            Aún no has registrado turnos ni servicios en este periodo. ¡Inicia un turno o registra una venta arriba!
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Fecha / Hora</th>
                  <th className="py-3 px-3">Área</th>
                  <th className="py-3 px-3">Tipo / Concepto</th>
                  <th className="py-3 px-3 text-right">Monto Venta</th>
                  <th className="py-3 px-3 text-right">Mi Comisión</th>
                  <th className="py-3 px-3 text-center">Comprobante</th>
                  <th className="py-3 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {registros.map((r) => {
                  const fecha = new Date(r.creado_en);
                  const fechaStr = fecha.toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "2-digit",
                  });
                  const horaStr = fecha.toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-3 whitespace-nowrap text-slate-300">
                        <span className="font-bold text-slate-200">{fechaStr}</span>
                        <span className="text-[11px] text-slate-400 ml-1.5">{horaStr}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-amber-300 border border-white/10 uppercase">
                          {SECCIONES[r.seccion]?.nombre_visible || r.seccion}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-100">
                          {r.tipo === "horas" ? `Turno de ${r.horas} hrs` : r.servicio_nombre}
                        </div>
                        {r.nota && (
                          <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                            {r.nota}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-semibold text-slate-300 whitespace-nowrap">
                        {r.tipo === "horas" ? "—" : `$${Number(r.monto || 0).toLocaleString("es-CL")}`}
                      </td>

                      <td className="py-3 px-3 text-right font-black text-amber-400 whitespace-nowrap">
                        {r.tipo === "horas" ? "—" : `$${Number(r.comision || 0).toLocaleString("es-CL")}`}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {r.foto_url ? (
                          <button
                            type="button"
                            onClick={() => setFotoAmpliada(r.foto_url)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-black text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faEye} className="h-2.5 w-2.5" />
                            <span>Ver Foto</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {r.validado === 1 ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30">
                            VÁLIDO
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-400 border border-red-500/30">
                            ANULADO
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL LIGHTBOX PARA VISOR DE FOTO HD */}
      {fotoAmpliada && (
        <div
          onClick={() => setFotoAmpliada(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-white/20 bg-[#0d0f14] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-black/50">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Comprobante de Servicio en Alta Definición
              </span>
              <button
                type="button"
                onClick={() => setFotoAmpliada(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black/90 max-h-[80vh] overflow-auto">
              <img
                src={fotoAmpliada}
                alt="Comprobante en grande"
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

