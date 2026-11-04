"use client";

import React, { useState, useEffect } from "react";
import { SECCIONES } from "@/lib/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faUserPlus,
  faTrashCan,
  faLock,
  faCircleNotch,
} from "@fortawesome/free-solid-svg-icons";

interface Usuario {
  username: string;
  rol: "superadmin" | "jefe";
  permisos: string[];
  debe_cambiar_password: boolean;
  creado_en: string;
}

export function AdminUsuariosView() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario nuevo usuario
  const [nuevoUsername, setNuevoUsername] = useState("");
  const [nuevoPassword, setNuevoPassword] = useState("");
  const [nuevoRol, setNuevoRol] = useState<"jefe" | "superadmin">("jefe");
  const [nuevosPermisos, setNuevosPermisos] = useState<string[]>(["mecanica"]);
  const [guardando, setGuardando] = useState(false);

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/usuarios");
      if (!res.ok) throw new Error("No se pudieron cargar los usuarios");
      const data = await res.json();
      setUsuarios(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleTogglePermiso = (permiso: string) => {
    setNuevosPermisos((prev) =>
      prev.includes(permiso) ? prev.filter((p) => p !== permiso) : [...prev, permiso]
    );
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoUsername.trim() || !nuevoPassword) return;

    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: nuevoUsername.trim(),
          password: nuevoPassword,
          rol: nuevoRol,
          permisos: nuevosPermisos,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error al crear usuario");
      }

      setNuevoUsername("");
      setNuevoPassword("");
      setNuevosPermisos(["mecanica"]);
      cargarUsuarios();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarUsuario = async (username: string) => {
    if (!confirm(`¿Estás seguro de eliminar el acceso para "${username}"?`)) return;

    try {
      const res = await fetch(`/api/usuarios/${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        cargarUsuarios();
      } else {
        const d = await res.json();
        alert(d.error || "Error al eliminar usuario");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const listaPermisosOpciones = [
    { key: "consolidado", label: "Consolidado (Todas las áreas)" },
    ...Object.entries(SECCIONES).map(([k, v]) => ({ key: k, label: v.nombre_visible })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-black tracking-wide text-slate-100 flex items-center gap-2 uppercase">
          <FontAwesomeIcon icon={faUsers} className="h-4 w-4 text-amber-500" />
          Administración de Cuentas y Accesos
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Crea accesos para jefes de área, asigna permisos o gestiona credenciales de la directiva
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Formulario Nuevo Usuario */}
        <div className="samcro-panel col-span-1 rounded-2xl border border-white/10 p-5 shadow-xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2 mb-4">
            <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5 text-amber-400" />
            Crear Acceso de Jefatura
          </h3>

          <form onSubmit={handleCrearUsuario} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Usuario</label>
              <input
                type="text"
                required
                value={nuevoUsername}
                onChange={(e) => setNuevoUsername(e.target.value)}
                placeholder="ej: nico_mecanica"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Contraseña Inicial</label>
              <input
                type="password"
                required
                value={nuevoPassword}
                onChange={(e) => setNuevoPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Rol de Acceso</label>
              <select
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="jefe">Jefe de Área (Oficial)</option>
                <option value="superadmin">Super Administrador (Mesa Directiva)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Permisos de Visualización</label>
              <div className="mt-1.5 space-y-1.5 rounded-xl border border-white/10 bg-black/50 p-2.5">
                {listaPermisosOpciones.map((p) => (
                  <label
                    key={p.key}
                    className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={nuevosPermisos.includes(p.key)}
                      onChange={() => handleTogglePermiso(p.key)}
                      className="rounded border-white/10 bg-black text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-xs font-bold text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={guardando}
              className="mt-2 w-full rounded-xl bg-amber-500 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-amber-400 transition cursor-pointer"
            >
              {guardando ? "Creando..." : "Crear Usuario"}
            </button>
          </form>
        </div>

        {/* Lista de Usuarios */}
        <div className="samcro-panel col-span-1 rounded-2xl border border-white/10 p-5 shadow-xl lg:col-span-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 mb-3">
            Usuarios Registrados
          </h3>

          {cargando ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <FontAwesomeIcon icon={faCircleNotch} className="h-4 w-4 animate-spin text-amber-500" />
              <span>Cargando cuentas...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {usuarios.map((u) => (
                <div
                  key={u.username}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{u.username}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          u.rol === "superadmin"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {u.rol}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-400">
                      <span>Permisos:</span>
                      {u.permisos.length === 0 ? (
                        <span className="text-slate-600">Ninguno</span>
                      ) : (
                        u.permisos.map((p) => (
                          <span
                            key={p}
                            className="rounded bg-slate-800 px-1.5 py-0.2 text-slate-300"
                          >
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleEliminarUsuario(u.username)}
                      title="Eliminar cuenta"
                      className="flex h-7 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 px-2.5 text-xs font-bold text-red-400 hover:bg-red-900/40 cursor-pointer transition"
                    >
                      <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
