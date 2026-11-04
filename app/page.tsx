"use client";

import React, { useState, useEffect, useMemo } from "react";
import { UserSession } from "@/lib/auth";
import { SECCIONES } from "@/lib/config";
import { TrabajadorNomina } from "@/lib/nomina";
import { Navbar } from "@/components/Navbar";
import { KpiStats } from "@/components/KpiStats";
import { NominaTable } from "@/components/NominaTable";
import { DetallesModal } from "@/components/DetallesModal";
import { TurnosActivosView } from "@/components/TurnosActivosView";
import { AdminUsuariosView } from "@/components/AdminUsuariosView";
import { LoginModal } from "@/components/LoginModal";
import { CambiarPasswordModal } from "@/components/CambiarPasswordModal";
import { Radio, Users, ShieldAlert, Layers } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [verificandoAuth, setVerificandoAuth] = useState(true);

  // Offset de semana (0 = actual, -1 = anterior, etc.)
  const [offset, setOffset] = useState<number>(0);

  // Pestaña activa
  const [tabActiva, setTabActiva] = useState<string>("consolidado");

  // Datos de la API
  const [datosNomina, setDatosNomina] = useState<Record<string, any>>({});
  const [cargandoNomina, setCargandoNomina] = useState(false);
  const [errorNomina, setErrorNomina] = useState<string | null>(null);

  // Modales
  const [modalDetalle, setModalDetalle] = useState<{
    seccionKey: string;
    trabajadorNombre: string;
  } | null>(null);
  const [mostrarPasswordModal, setMostrarPasswordModal] = useState(false);

  // 1. Verificar sesión activa al inicio
  useEffect(() => {
    const verificar = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const u = await res.json();
          setUser(u);
          // Si no tiene permiso de consolidado, seleccionar su primera sección autorizada
          if (u.rol !== "superadmin" && !u.permisos.includes("consolidado")) {
            const primerPermiso = Object.keys(SECCIONES).find((s) => u.permisos.includes(s));
            if (primerPermiso) setTabActiva(primerPermiso);
          }
        }
      } catch (e) {
        console.error("Error al verificar auth:", e);
      } finally {
        setVerificandoAuth(false);
      }
    };
    verificar();
  }, []);

  // 2. Cargar datos de nómina cada vez que cambia el usuario o el offset
  const cargarNomina = async () => {
    if (!user) return;
    setCargandoNomina(true);
    setErrorNomina(null);
    try {
      const res = await fetch(`/api/nomina?offset=${offset}`);
      if (!res.ok) throw new Error("Error al obtener datos de nómina");
      const data = await res.json();
      setDatosNomina(data);
    } catch (e: any) {
      setErrorNomina(e.message || "Error al cargar nómina");
    } finally {
      setCargandoNomina(false);
    }
  };

  useEffect(() => {
    if (user) {
      cargarNomina();
    }
  }, [user, offset]);

  // Lista de semanas disponibles del backend
  const semanas = datosNomina["_info_semana"]?.semanas || [
    { offset: 0, label: "🟢 Semana Actual", rango: "", es_actual: true },
  ];

  // Turnos activos
  const turnosActivos = datosNomina["_turnos_activos"] || [];

  // Trabajadores consolidados (todas las secciones combinadas)
  const trabajadoresConsolidados = useMemo<TrabajadorNomina[]>(() => {
    const mapa: Record<string, TrabajadorNomina> = {};

    for (const [secKey, secList] of Object.entries(datosNomina)) {
      if (secKey.startsWith("_") || !Array.isArray(secList)) continue;

      for (const t of secList as TrabajadorNomina[]) {
        if (!mapa[t.nombre]) {
          mapa[t.nombre] = {
            nombre: t.nombre,
            horas: 0,
            pagoHoras: 0,
            nServicios: 0,
            comisiones: 0,
            total: 0,
            esJefe: t.esJefe,
            pagado: true, // Se considera pagado en consolidado solo si está pagado en todas
            discord_id: t.discord_id,
          };
        }

        mapa[t.nombre].horas += t.horas;
        mapa[t.nombre].pagoHoras += t.pagoHoras;
        mapa[t.nombre].nServicios += t.nServicios;
        mapa[t.nombre].comisiones += t.comisiones;
        mapa[t.nombre].total += t.total;
        if (!t.pagado) {
          mapa[t.nombre].pagado = false;
        }
        if (t.esJefe) {
          mapa[t.nombre].esJefe = true;
        }
      }
    }

    return Object.values(mapa).sort((a, b) => b.total - a.total);
  }, [datosNomina]);

  // Lista de trabajadores de la pestaña activa
  const trabajadoresActuales = useMemo<TrabajadorNomina[]>(() => {
    if (tabActiva === "consolidado") return trabajadoresConsolidados;
    return (datosNomina[tabActiva] as TrabajadorNomina[]) || [];
  }, [tabActiva, datosNomina, trabajadoresConsolidados]);

  // Lista de trabajadores para las métricas superiores (si está en turnos o admin, mostrar el consolidado)
  const trabajadoresKpis = useMemo<TrabajadorNomina[]>(() => {
    if (tabActiva === "turnos" || tabActiva === "admin" || tabActiva === "consolidado") {
      return trabajadoresConsolidados;
    }
    return trabajadoresActuales;
  }, [tabActiva, trabajadoresConsolidados, trabajadoresActuales]);

  // Manejador de checklist de pago
  const handleTogglePagado = async (nombre: string, nuevoEstado: boolean) => {
    // Si estamos en consolidado, se actualiza en todas las secciones donde tiene monto
    const seccionesAfectadas =
      tabActiva === "consolidado"
        ? Object.keys(SECCIONES).filter((k) => {
            const list = datosNomina[k] as TrabajadorNomina[] | undefined;
            return list?.some((t) => t.nombre === nombre);
          })
        : [tabActiva];

    for (const s of seccionesAfectadas) {
      await fetch("/api/nomina/marcar-pagado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion: s, nombre, pagado: nuevoEstado, offset }),
      });
    }

    cargarNomina();
  };

  // Manejador de logout
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
  };

  // 1. Estado de carga inicial de auth
  if (verificandoAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090b0e]">
        <div className="flex flex-col items-center">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
          <span className="mt-4 text-xs font-bold tracking-wider text-amber-500">CARGANDO SAMCRO MC...</span>
        </div>
      </div>
    );
  }

  // 2. Si no hay usuario logueado, mostrar LoginModal
  if (!user) {
    return <LoginModal onLoginSuccess={(u) => setUser(u)} />;
  }

  // Lista de tabs permitidas para este usuario
  const tabsDisponibles = [
    ...(user.rol === "superadmin" || user.permisos.includes("consolidado")
      ? [{ key: "consolidado", label: "📊 Consolidado" }]
      : []),
    ...Object.entries(SECCIONES)
      .filter(([k]) => user.rol === "superadmin" || user.permisos.includes("consolidado") || user.permisos.includes(k))
      .map(([k, v]) => ({ key: k, label: v.nombre_visible })),
    {
      key: "turnos",
      label: `🟢 Turnos en Vivo (${turnosActivos.length})`,
      badge: turnosActivos.length > 0,
    },
    ...(user.rol === "superadmin" ? [{ key: "admin", label: "⚙️ Administración" }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#090b0e] text-slate-100 flex flex-col">
      {/* Navbar Superior */}
      <Navbar
        user={user}
        semanas={semanas}
        currentOffset={offset}
        onSelectOffset={(o) => setOffset(o)}
        onLogout={handleLogout}
        onOpenPasswordModal={() => setMostrarPasswordModal(true)}
      />

      {/* Contenedor Principal */}
      <main className="mx-auto flex-1 w-full max-w-7xl p-4 md:p-8 space-y-6">
        {/* Banner de semana */}
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-gradient-to-r from-amber-950/20 via-slate-900/60 to-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                Periodo de Liquidación
              </span>
              {offset === 0 && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  En Curso
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-200 mt-0.5">
              {datosNomina["_info_semana"]?.rango_texto || "Cargando fechas de cierre..."}
            </p>
          </div>

          <div className="text-xs text-slate-400">
            Corte semanal automático: <span className="font-bold text-amber-400">Domingos a las 16:00 hrs</span>
          </div>
        </div>

        {/* KPIs de Métricas Superiores */}
        <KpiStats
          trabajadores={trabajadoresKpis}
          turnosActivosCount={turnosActivos.length}
        />

        {/* Tabs de Secciones */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-white/10">
          {tabsDisponibles.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTabActiva(tab.key)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                tabActiva === tab.key
                  ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                  : "bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-white/5"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Vista según la pestaña activa */}
        {tabActiva === "turnos" ? (
          <TurnosActivosView
            turnos={turnosActivos}
            onTurnoFinalizado={() => cargarNomina()}
          />
        ) : tabActiva === "admin" ? (
          <AdminUsuariosView />
        ) : (
          <div>
            {cargandoNomina ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                <p className="mt-3 text-xs">Calculando nómina de la semana...</p>
              </div>
            ) : errorNomina ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-xs text-red-300">
                {errorNomina}
              </div>
            ) : (
              <NominaTable
                seccionKey={tabActiva}
                seccionNombre={
                  tabActiva === "consolidado"
                    ? "📊 Resumen Consolidado de Todas las Áreas"
                    : SECCIONES[tabActiva]?.nombre_visible || tabActiva
                }
                trabajadores={trabajadoresActuales}
                offset={offset}
                onVerDetalles={(t) =>
                  setModalDetalle({
                    seccionKey: tabActiva === "consolidado" ? "_todos" : tabActiva,
                    trabajadorNombre: t.nombre,
                  })
                }
                onTogglePagado={handleTogglePagado}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950/80 px-4 py-4 text-center text-xs text-slate-500">
        SAMCRO Motorcycle Club — Bitácora y Nómina v3 &bull; Desplegado en Vercel
      </footer>

      {/* Modal de Detalles / Desglose */}
      {modalDetalle && (
        <DetallesModal
          seccionKey={modalDetalle.seccionKey}
          trabajadorNombre={modalDetalle.trabajadorNombre}
          offset={offset}
          onClose={() => setModalDetalle(null)}
          onActualizacion={() => cargarNomina()}
        />
      )}

      {/* Modal Cambiar Contraseña */}
      {mostrarPasswordModal && (
        <CambiarPasswordModal onClose={() => setMostrarPasswordModal(false)} />
      )}
    </div>
  );
}
