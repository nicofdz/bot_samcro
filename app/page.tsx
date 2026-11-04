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
import { BitacoraTrabajadorView } from "@/components/BitacoraTrabajadorView";
import { LoginModal } from "@/components/LoginModal";
import { CambiarPasswordModal } from "@/components/CambiarPasswordModal";
import { MiPerfilModal } from "@/components/MiPerfilModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarCheck,
  faChartPie,
  faWrench,
  faBeerMugEmpty,
  faPenNib,
  faMusic,
  faTowerBroadcast,
  faGear,
  faCircleNotch,
  faGem,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";

// Mapeo de iconos Font Awesome por sección
const ICONOS_SECCION: Record<string, any> = {
  consolidado: faChartPie,
  mecanica: faWrench,
  bar: faBeerMugEmpty,
  tatuajes: faPenNib,
  show: faMusic,
  coleccionables: faGem,
  bitacora: faClipboardList,
  turnos: faTowerBroadcast,
  admin: faGear,
};

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
  const [mostrarPerfilModal, setMostrarPerfilModal] = useState(false);

  // 1. Verificar sesión activa al inicio
  useEffect(() => {
    const verificar = async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const u: UserSession = await res.json();
          setUser(u);
          if (u.rol === "trabajador") {
            setTabActiva("bitacora");
          } else if (u.rol !== "superadmin" && !u.permisos.includes("consolidado")) {
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
    { offset: 0, label: "Semana Actual", rango: "", es_actual: true },
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
            pagado: true,
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

  // Lista de trabajadores para las métricas superiores
  const trabajadoresKpis = useMemo<TrabajadorNomina[]>(() => {
    if (tabActiva === "turnos" || tabActiva === "admin" || tabActiva === "bitacora" || tabActiva === "consolidado") {
      return trabajadoresConsolidados;
    }
    return trabajadoresActuales;
  }, [tabActiva, trabajadoresConsolidados, trabajadoresActuales]);

  // Manejador de checklist de pago optimista e instantáneo
  const handleTogglePagado = async (nombre: string, nuevoEstado: boolean) => {
    const seccionesAfectadas =
      tabActiva === "consolidado"
        ? Object.keys(SECCIONES).filter((k) => {
            const list = datosNomina[k] as TrabajadorNomina[] | undefined;
            return list?.some((t) => t.nombre === nombre);
          })
        : [tabActiva];

    // 1. Actualización optimista inmediata en memoria (0ms, sin recargar toda la tabla)
    setDatosNomina((prev) => {
      const next = { ...prev };
      for (const s of seccionesAfectadas) {
        if (Array.isArray(next[s])) {
          next[s] = next[s].map((t: TrabajadorNomina) =>
            t.nombre === nombre ? { ...t, pagado: nuevoEstado } : t
          );
        }
      }
      return next;
    });

    // 2. Guardar en segundo plano en la base de datos en paralelo
    try {
      await Promise.all(
        seccionesAfectadas.map((s) =>
          fetch("/api/nomina/marcar-pagado", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ seccion: s, nombre, pagado: nuevoEstado, offset }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || "Error al actualizar estado");
            }
          })
        )
      );
    } catch (error: any) {
      console.error("Error al actualizar pago:", error);
      // Revertir estado si falló la conexión
      setDatosNomina((prev) => {
        const next = { ...prev };
        for (const s of seccionesAfectadas) {
          if (Array.isArray(next[s])) {
            next[s] = next[s].map((t: TrabajadorNomina) =>
              t.nombre === nombre ? { ...t, pagado: !nuevoEstado } : t
            );
          }
        }
        return next;
      });
      alert(`No se pudo actualizar el pago de ${nombre}. Revisa tu conexión.`);
    }
  };

  // Manejador de logout
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    setUser(null);
  };

  // 1. Estado de carga inicial de auth
  if (verificandoAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080b]">
        <div className="flex flex-col items-center">
          <FontAwesomeIcon icon={faCircleNotch} className="h-9 w-9 text-amber-500 animate-spin" />
          <span className="mt-4 text-xs font-black tracking-widest text-amber-400 uppercase">
            CONECTANDO CON MESA SAMCRO...
          </span>
        </div>
      </div>
    );
  }

  // 2. Si no hay usuario logueado, mostrar LoginModal
  if (!user) {
    return <LoginModal onLoginSuccess={(u) => setUser(u)} />;
  }

  // Lista de tabs permitidas para este usuario (con iconos Font Awesome)
  const tabsDisponibles = [
    ...(user.rol === "trabajador"
      ? [{ key: "bitacora", label: "Mi Bitácora", icon: ICONOS_SECCION.bitacora }]
      : []),
    ...(user.rol === "superadmin" || user.permisos.includes("consolidado")
      ? [{ key: "consolidado", label: "Consolidado", icon: ICONOS_SECCION.consolidado }]
      : []),
    ...Object.entries(SECCIONES)
      .filter(([k]) => user.rol === "superadmin" || user.permisos.includes("consolidado") || user.permisos.includes(k))
      .map(([k, v]) => ({ key: k, label: v.nombre_visible, icon: ICONOS_SECCION[k] || faWrench })),
    ...(user.rol !== "trabajador"
      ? [{ key: "bitacora", label: "Mi Bitácora", icon: ICONOS_SECCION.bitacora }]
      : []),
    {
      key: "turnos",
      label: `Turnos en Vivo (${turnosActivos.length})`,
      icon: ICONOS_SECCION.turnos,
      badge: turnosActivos.length > 0,
    },
    ...(user.rol === "superadmin" ? [{ key: "admin", label: "Administración", icon: ICONOS_SECCION.admin }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#07080b] text-slate-100 flex flex-col">
      {/* Navbar Superior */}
      <Navbar
        user={user}
        semanas={semanas}
        currentOffset={offset}
        onSelectOffset={(o) => setOffset(o)}
        onLogout={handleLogout}
        onOpenPasswordModal={() => setMostrarPasswordModal(true)}
        onOpenPerfilModal={() => setMostrarPerfilModal(true)}
      />

      {/* Contenedor Principal */}
      <main className="mx-auto flex-1 w-full max-w-7xl p-3 sm:p-6 md:p-8 space-y-6">
        {/* Banner de semana estilo Biker Ledger */}
        <div className="samcro-panel flex flex-col gap-3 rounded-2xl border border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <FontAwesomeIcon icon={faCalendarCheck} className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                  Periodo de Liquidación Activo
                </span>
                {offset === 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    Semana en curso
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-extrabold text-slate-100 mt-0.5">
                {datosNomina["_info_semana"]?.rango_texto || "Cargando fechas de cierre..."}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-black/60 px-3.5 py-2 border border-white/5 text-xs text-slate-400 text-left sm:text-right">
            <span>Corte semanal automático: </span>
            <span className="font-black text-amber-400 block sm:inline">Domingos a las 16:00 hrs</span>
          </div>
        </div>

        {/* KPIs de Métricas Superiores */}
        <KpiStats
          trabajadores={trabajadoresKpis}
          turnosActivosCount={turnosActivos.length}
        />

        {/* Tabs de Secciones estilo Rocker Patches con Font Awesome */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {tabsDisponibles.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTabActiva(tab.key)}
              className={`rocker-tab flex items-center gap-2 whitespace-nowrap rounded-xl px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs font-black uppercase tracking-wider cursor-pointer ${
                tabActiva === tab.key ? "rocker-tab-active" : "text-slate-400"
              }`}
            >
              {tab.icon && (
                <FontAwesomeIcon
                  icon={tab.icon}
                  className={`h-3 w-3 ${tabActiva === tab.key ? "text-amber-300" : "text-slate-400"}`}
                />
              )}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 radar-live" />
              )}
            </button>
          ))}
        </div>

        {/* Vista según la pestaña activa */}
        {tabActiva === "bitacora" ? (
          <BitacoraTrabajadorView
            user={user}
            offset={offset}
            onActualizacion={() => cargarNomina()}
          />
        ) : tabActiva === "turnos" ? (
          <TurnosActivosView
            turnos={turnosActivos}
            onTurnoFinalizado={() => cargarNomina()}
          />
        ) : tabActiva === "admin" ? (
          <AdminUsuariosView />
        ) : (
          <div>
            {cargandoNomina ? (
              <div className="samcro-panel flex flex-col items-center justify-center py-24 text-slate-400 rounded-2xl border border-white/10">
                <FontAwesomeIcon icon={faCircleNotch} className="h-8 w-8 text-amber-500 animate-spin" />
                <p className="mt-4 text-xs font-black tracking-widest text-amber-400 uppercase">
                  Auditoría y cálculo de nómina en proceso...
                </p>
              </div>
            ) : errorNomina ? (
              <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-6 text-center text-xs font-bold text-red-300">
                {errorNomina}
              </div>
            ) : (
              <NominaTable
                seccionKey={tabActiva}
                seccionNombre={
                  tabActiva === "consolidado"
                    ? "Resumen Consolidado de Todas las Áreas"
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

      {/* Footer Biker */}
      <footer className="border-t border-white/10 bg-[#060709] px-4 py-5 text-center text-xs text-slate-500 font-medium">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <span className="font-black text-amber-500/80 tracking-wider">SAMCRO MOTORCYCLE CLUB</span>
          <span className="hidden sm:inline">&bull;</span>
          <span>Nómina & Control v3</span>
        </div>
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

      {/* Modal Mi Perfil */}
      {mostrarPerfilModal && (
        <MiPerfilModal
          user={user}
          onClose={() => setMostrarPerfilModal(false)}
          onUserUpdated={(updatedUser) => {
            setUser(updatedUser);
          }}
          onOpenPasswordModal={() => {
            setMostrarPerfilModal(false);
            setMostrarPasswordModal(true);
          }}
        />
      )}

      {/* Modal Cambiar Contraseña (Obligatorio en primer ingreso o voluntario) */}
      {(mostrarPasswordModal || Boolean(user?.debe_cambiar_password)) && (
        <CambiarPasswordModal
          obligatorio={Boolean(user?.debe_cambiar_password)}
          username={user.username}
          onClose={() => setMostrarPasswordModal(false)}
          onSuccess={() => {
            setUser({ ...user, debe_cambiar_password: false });
            setMostrarPasswordModal(false);
          }}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
