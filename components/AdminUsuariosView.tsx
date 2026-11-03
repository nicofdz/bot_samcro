"use client";

import React, { useState, useEffect } from "react";
import { SECCIONES } from "@/lib/config";
import {
  Users,
  UserPlus,
  ShieldAlert,
  KeyRound,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Lock,
} from "lucide-react";

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

  // Modal confirmación limpieza
  const [mostrarConfirmLimpieza, setMostrarConfirmLimpieza] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLimpiarBdd = async () => {
    setLimpiando(true);
    try {
      const res = await fetch("/api/admin/limpiar-bdd", { method: "POST" });
      if (res.ok) {
        alert("Base de datos limpiada con éxito. Se preservaron las cuentas de usuario.");
        setMostrarConfirmLimpieza(false);
      } else {
        alert("Error al limpiar la base de datos.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLimpiando(false);
    }
  };

  const listaPermisosOpciones = [
    { key: "consolidado", label: "📊 Consolidado (Todas las áreas)" },
    ...Object.entries(SECCIONES).map(([k, v]) => ({ key: k, label: v.nombre_visible })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-500" />
          Administración de Cuentas y Accesos
        </h2>
        <p className="text-xs text-slate-400">
          Gestiona quién puede entrar al dashboard y qué secciones puede auditar o pagar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Formulario Crear Usuario */}
        <div className="glass-panel rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-amber-400" />
            Crear Nueva Cuenta
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Asigna rol y secciones permitidas.</p>

          <form onSubmit={handleCrearUsuario} className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300">Usuario</label>
              <input
                type="text"
                required
                value={nuevoUsername}
                onChange={(e) => setNuevoUsername(e.target.value)}
                placeholder="ej: jefe_mecanica"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300">Contraseña Inicial</label>
              <input
                type="text"
                required
                value={nuevoPassword}
                onChange={(e) => setNuevoPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300">Rol</label>
              <select
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500/50"
              >
                <option value="jefe">Jefe de Área</option>
                <option value="superadmin">Super Administrador (Total)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 mb-1.5 block">
                Permisos por Sección
              </label>
              <div className="space-y-1.5">
                {listaPermisosOpciones.map((p) => (
                  <label
                    key={p.key}
                    className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={nuevosPermisos.includes(p.key)}
                      onChange={() => handleTogglePermiso(p.key)}
                      className="rounded border-white/10 bg-slate-950 text-amber-500 focus:ring-0"
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={guardando}
              className="mt-2 w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              {guardando ? "Creando..." : "Crear Usuario"}
            </button>
          </form>
        </div>

        {/* Lista de Usuarios */}
        <div className="glass-panel col-span-1 rounded-xl border border-white/10 p-5 lg:col-span-2">
          <h3 className="text-sm font-extrabold text-slate-100 mb-3">Usuarios Registrados</h3>

          {cargando ? (
            <div className="py-8 text-center text-xs text-slate-400">Cargando cuentas...</div>
          ) : (
            <div className="space-y-2">
              {usuarios.map((u) => (
                <div
                  key={u.username}
                  className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{u.username}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
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
                      className="flex h-7 items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zona de Peligro */}
      <div className="rounded-xl border border-red-500/30 bg-red-950/15 p-5">
        <h3 className="text-sm font-extrabold text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Zona de Peligro del Sistema
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Reiniciar o vaciar datos históricos de turnos y servicios. Las cuentas de usuario no se
          eliminarán.
        </p>

        <div className="mt-4">
          <button
            onClick={() => setMostrarConfirmLimpieza(true)}
            className="rounded-lg border border-red-500/40 bg-red-600/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-600/30 transition"
          >
            Limpiar Todos los Registros de la BD
          </button>
        </div>
      </div>

      {/* Modal Confirmación Limpieza */}
      {mostrarConfirmLimpieza && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4">
          <div className="glass-panel w-full max-w-md rounded-xl border border-red-500/40 p-5 shadow-2xl">
            <h3 className="text-sm font-extrabold text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              ¿Confirmas el borrado de registros?
            </h3>
            <p className="mt-2 text-xs text-slate-300">
              Esta acción borrará permanentemente todos los turnos, servicios registrados y listas de
              pagos. Las contraseñas y cuentas seguirán intactas.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setMostrarConfirmLimpieza(false)}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleLimpiarBdd}
                disabled={limpiando}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition"
              >
                {limpiando ? "Borrando..." : "Sí, borrar registros"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
