"use client";

import React, { useState, useEffect } from "react";
import { SECCIONES } from "@/lib/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faUserPlus,
  faTrashCan,
  faCircleNotch,
  faEye,
  faXmark,
  faLink,
  faPenToSquare,
  faCheck,
  faKey,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";

interface Usuario {
  username: string;
  nombre?: string | null;
  avatar_url?: string | null;
  rol: "superadmin" | "jefe" | "trabajador";
  permisos: string[];
  debe_cambiar_password: boolean;
  discord_id?: string | null;
  creado_en: string;
}

interface CanalTrabajador {
  discord_id: string;
  nombre: string;
  canal_id?: string | null;
  avatar_url?: string | null;
}

export function AdminUsuariosView() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [canales, setCanales] = useState<CanalTrabajador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Visor de foto ampliada
  const [fotoAmpliada, setFotoAmpliada] = useState<{ url: string; nombre: string } | null>(null);

  // Formulario nuevo usuario
  const [nuevoUsername, setNuevoUsername] = useState("");
  const [nuevoPassword, setNuevoPassword] = useState("");
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoDiscordId, setNuevoDiscordId] = useState("");
  const [nuevoRol, setNuevoRol] = useState<"trabajador" | "jefe" | "superadmin">("trabajador");
  const [nuevosPermisos, setNuevosPermisos] = useState<string[]>(["mecanica"]);
  const [canalSeleccionado, setCanalSeleccionado] = useState<string>("");
  const [guardando, setGuardando] = useState(false);

  // Modal Edición de Usuario
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editDiscordId, setEditDiscordId] = useState("");
  const [editCanalSeleccionado, setEditCanalSeleccionado] = useState("");
  const [editRol, setEditRol] = useState<"trabajador" | "jefe" | "superadmin">("trabajador");
  const [editPermisos, setEditPermisos] = useState<string[]>([]);
  const [editPassword, setEditPassword] = useState("");
  const [editDebeCambiarPassword, setEditDebeCambiarPassword] = useState(false);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resUsers, resCanales] = await Promise.all([
        fetch("/api/usuarios"),
        fetch("/api/trabajadores-canales"),
      ]);

      if (!resUsers.ok) throw new Error("No se pudieron cargar los usuarios");
      const dataUsers = await resUsers.json();
      setUsuarios(dataUsers);

      if (resCanales.ok) {
        const dataCanales = await resCanales.json();
        setCanales(dataCanales);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleTogglePermiso = (permiso: string) => {
    setNuevosPermisos((prev) =>
      prev.includes(permiso) ? prev.filter((p) => p !== permiso) : [...prev, permiso]
    );
  };

  const handleSelectCanal = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setCanalSeleccionado(val);
    if (!val) {
      setNuevoNombre("");
      setNuevoDiscordId("");
      return;
    }

    const c = canales.find((item) => item.discord_id === val);
    if (c) {
      setNuevoNombre(c.nombre);
      setNuevoDiscordId(c.discord_id);
      if (!nuevoUsername.trim()) {
        const userSlug = c.nombre
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "_")
          .replace(/_+/g, "_")
          .slice(0, 20);
        setNuevoUsername(userSlug);
      }
    } else {
      setNuevoDiscordId(val);
    }
  };

  const handleInputDiscordIdNuevo = (val: string) => {
    setNuevoDiscordId(val);
    const c = canales.find((item) => item.discord_id === val);
    if (c) {
      setCanalSeleccionado(c.discord_id);
      if (!nuevoNombre.trim()) setNuevoNombre(c.nombre);
    } else {
      setCanalSeleccionado(val);
    }
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
          nombre: nuevoNombre.trim() || null,
          discord_id: nuevoDiscordId.trim() || null,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error al crear usuario");
      }

      setNuevoUsername("");
      setNuevoPassword("");
      setNuevoNombre("");
      setNuevoDiscordId("");
      setCanalSeleccionado("");
      setNuevoRol("trabajador");
      setNuevosPermisos(["mecanica"]);
      setMensajeExito("¡Usuario creado exitosamente!");
      setTimeout(() => setMensajeExito(null), 4000);
      cargarDatos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Abrir modal de edición
  const handleAbrirEditar = (u: Usuario) => {
    setUsuarioEditando(u);
    setEditUsername(u.username);
    setEditNombre(u.nombre || "");
    setEditDiscordId(u.discord_id || "");
    setEditCanalSeleccionado(u.discord_id || "");
    setEditRol(u.rol);
    setEditPermisos([...u.permisos]);
    setEditPassword("");
    setEditDebeCambiarPassword(Boolean(u.debe_cambiar_password));
    setErrorEdicion(null);
  };

  // Seleccionar canal en modal de edición
  const handleSelectCanalEdicion = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setEditCanalSeleccionado(val);
    if (!val) {
      setEditDiscordId("");
      return;
    }

    const c = canales.find((item) => item.discord_id === val);
    if (c) {
      setEditNombre(c.nombre);
      setEditDiscordId(c.discord_id);
    } else {
      setEditDiscordId(val);
    }
  };

  const handleInputDiscordIdEdicion = (val: string) => {
    setEditDiscordId(val);
    const c = canales.find((item) => item.discord_id === val);
    if (c) {
      setEditCanalSeleccionado(c.discord_id);
      if (!editNombre.trim()) setEditNombre(c.nombre);
    } else {
      setEditCanalSeleccionado(val);
    }
  };

  const handleTogglePermisoEdicion = (permiso: string) => {
    setEditPermisos((prev) =>
      prev.includes(permiso) ? prev.filter((p) => p !== permiso) : [...prev, permiso]
    );
  };

  // Guardar cambios de edición
  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;
    if (!editUsername.trim()) {
      setErrorEdicion("El nombre de usuario no puede estar vacío");
      return;
    }

    setGuardandoEdicion(true);
    setErrorEdicion(null);
    try {
      const res = await fetch(`/api/usuarios/${encodeURIComponent(usuarioEditando.username)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nuevo_username: editUsername.trim(),
          nombre: editNombre.trim() || null,
          discord_id: editDiscordId.trim() || null,
          rol: editRol,
          permisos: editPermisos,
          password: editPassword.trim() || undefined,
          debe_cambiar_password: editDebeCambiarPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar usuario");

      setUsuarioEditando(null);
      setMensajeExito(`¡Usuario @${editUsername.trim()} actualizado correctamente!`);
      setTimeout(() => setMensajeExito(null), 4000);
      cargarDatos();
    } catch (err: any) {
      setErrorEdicion(err.message);
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleEliminarUsuario = async (username: string) => {
    if (!confirm(`¿Estás seguro de eliminar el acceso para "${username}"?`)) return;

    try {
      const res = await fetch(`/api/usuarios/${encodeURIComponent(username)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMensajeExito(`Usuario "${username}" eliminado`);
        setTimeout(() => setMensajeExito(null), 4000);
        cargarDatos();
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
      {/* Alerta de Éxito */}
      {mensajeExito && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/70 p-3.5 text-xs font-bold text-emerald-200 flex items-center justify-between shadow-lg shadow-emerald-950/40 animate-in fade-in">
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

      {/* Encabezado */}
      <div>
        <h2 className="text-base font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
          <FontAwesomeIcon icon={faUsers} className="h-4 w-4 text-amber-500" />
          Administración de Cuentas y Accesos
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Crea y edita accesos para trabajadores y directiva, asignando su canal de Discord correspondiente para no duplicar datos
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Formulario Crear Usuario */}
        <div className="samcro-card col-span-1 rounded-2xl border border-white/10 p-5 shadow-xl">
          <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <FontAwesomeIcon icon={faUserPlus} className="h-3.5 w-3.5" />
            Crear Acceso al Sistema
          </h3>

          <form onSubmit={handleCrearUsuario} className="mt-4 space-y-4">
            {/* Selector de Miembro de Discord para Cero Duplicidad */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-1">
                <FontAwesomeIcon icon={faLink} className="h-3 w-3" />
                <span>Vincular a Miembro de Discord (Sin duplicar)</span>
              </label>
              <select
                value={canalSeleccionado}
                onChange={handleSelectCanal}
                className="w-full rounded-xl border border-amber-500/30 bg-black/70 px-3 py-2 text-xs font-semibold text-amber-300 outline-none transition focus:border-amber-500"
              >
                <option value="">— Seleccionar miembro de la lista ({canales.length} registrados) —</option>
                {!canales.some((c) => c.discord_id === canalSeleccionado) && canalSeleccionado && (
                  <option value={canalSeleccionado}>
                    {nuevoNombre || "Canal personalizado"} (Discord ID: {canalSeleccionado})
                  </option>
                )}
                {canales.map((c) => (
                  <option key={c.discord_id} value={c.discord_id}>
                    {c.nombre} (Discord ID: {c.discord_id})
                  </option>
                ))}
              </select>

              <div className="mt-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Discord ID del Trabajador (Auto o Manual)
                </label>
                <input
                  type="text"
                  value={nuevoDiscordId}
                  onChange={(e) => handleInputDiscordIdNuevo(e.target.value.trim())}
                  placeholder="Ej. 1567337545996435537"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 text-xs font-mono font-semibold text-amber-300 outline-none transition focus:border-amber-500"
                />
              </div>

              <p className="text-[10px] text-slate-400 mt-1">
                Al seleccionar un miembro o pegar su Discord ID, sus turnos y ventas web quedarán en su misma bitácora de Discord.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Nombre de Personaje / Trabajador
              </label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej. Ashley Miller"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Nombre de Usuario (Login)
              </label>
              <input
                type="text"
                required
                value={nuevoUsername}
                onChange={(e) => setNuevoUsername(e.target.value)}
                placeholder="Ej. ashley_miller"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Contraseña Inicial
              </label>
              <input
                type="password"
                required
                value={nuevoPassword}
                onChange={(e) => setNuevoPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                El sistema obligará a cambiar esta contraseña en el primer inicio de sesión.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Rol de Acceso
              </label>
              <select
                value={nuevoRol}
                onChange={(e) => setNuevoRol(e.target.value as "trabajador" | "jefe" | "superadmin")}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500"
              >
                <option value="trabajador">Trabajador / Miembro (Bitácora Personal)</option>
                <option value="jefe">Jefe de Área (Oficial)</option>
                <option value="superadmin">Mesa Directiva (Superadmin)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                Permisos de Visualización de Nómina
              </label>
              <div className="space-y-1.5 rounded-xl border border-white/5 bg-black/40 p-3">
                {listaPermisosOpciones.map((opc) => (
                  <label
                    key={opc.key}
                    className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={nuevosPermisos.includes(opc.key)}
                      onChange={() => handleTogglePermiso(opc.key)}
                      className="rounded border-white/20 bg-slate-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="font-medium text-[11px]">{opc.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-xs font-bold text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={guardando}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-amber-400 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {guardando ? "Creando..." : "Crear Usuario"}
            </button>
          </form>
        </div>

        {/* Lista de Usuarios con Botón Editar */}
        <div className="samcro-panel col-span-1 rounded-2xl border border-white/10 p-5 shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
              Usuarios Registrados
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">
              {usuarios.length} cuentas activas
            </span>
          </div>

          {cargando ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <FontAwesomeIcon icon={faCircleNotch} className="h-4 w-4 animate-spin text-amber-500" />
              <span>Cargando cuentas...</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {usuarios.map((u) => {
                const canalMatch = u.discord_id ? canales.find((c) => c.discord_id === u.discord_id) : null;
                const fotoSrc = u.avatar_url || canalMatch?.avatar_url || null;

                return (
                  <div
                    key={u.username}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/60 p-3 sm:flex-row sm:items-center sm:justify-between transition hover:border-white/20"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar con foto clickeable para ver en grande */}
                      {fotoSrc ? (
                        <button
                          type="button"
                          onClick={() =>
                            setFotoAmpliada({
                              url: fotoSrc,
                              nombre: u.nombre || u.username,
                            })
                          }
                          title="Clic para ver foto en tamaño completo"
                          className="group relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-amber-500/40 bg-black cursor-pointer shadow-md transition-transform hover:scale-105 hover:border-amber-400"
                        >
                          <img
                            src={fotoSrc}
                            alt={u.username}
                            className="h-full w-full object-cover transition duration-200 group-hover:brightness-110"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <FontAwesomeIcon icon={faEye} className="h-3.5 w-3.5 text-amber-300 drop-shadow" />
                          </div>
                        </button>
                      ) : (
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-amber-600/20 to-black text-amber-300 shadow-inner"
                          title="Sin foto de perfil"
                        >
                          <span className="text-xs font-black uppercase">
                            {(u.nombre || u.username).slice(0, 2)}
                          </span>
                        </div>
                      )}

                      {/* Información del usuario */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-100">
                            {u.nombre || u.username}
                          </span>
                          {u.nombre && (
                            <span className="text-xs text-slate-400 font-semibold">
                              @{u.username}
                            </span>
                          )}
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                              u.rol === "superadmin"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : u.rol === "jefe"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {u.rol}
                          </span>
                        </div>

                        {/* Canal de Discord Vinculado */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                          {u.discord_id ? (
                            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-300 border border-emerald-500/20 font-semibold flex items-center gap-1">
                              <FontAwesomeIcon icon={faLink} className="h-2.5 w-2.5 text-emerald-400" />
                              <span>Canal: {canalMatch?.nombre || u.nombre || "Discord"}</span>
                            </span>
                          ) : (
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-slate-400 border border-white/5 font-medium">
                              ○ Sin canal de Discord asignado
                            </span>
                          )}

                          <span className="text-slate-600">&bull;</span>

                          <div className="flex flex-wrap gap-1 text-slate-400">
                            <span>Permisos:</span>
                            {u.permisos.length === 0 ? (
                              <span className="text-slate-500">Solo Bitácora</span>
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
                      </div>
                    </div>

                    {/* Acciones: Editar y Eliminar */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        onClick={() => handleAbrirEditar(u)}
                        title="Editar nombre, canal de Discord y permisos"
                        className="flex h-7 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 cursor-pointer transition shadow-sm"
                      >
                        <FontAwesomeIcon icon={faPenToSquare} className="h-3 w-3" />
                        <span>Editar</span>
                      </button>

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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE USUARIO */}
      {usuarioEditando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setUsuarioEditando(null)}
        >
          <div
            className="samcro-panel relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-amber-500/40 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                    Editar Usuario
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    @{usuarioEditando.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioEditando(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              {/* Selector de Miembro / Canal de Discord */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-1">
                  <FontAwesomeIcon icon={faLink} className="h-3 w-3" />
                  <span>Asignar Miembro / Canal de Discord</span>
                </label>
                <select
                  value={editCanalSeleccionado}
                  onChange={handleSelectCanalEdicion}
                  className="w-full rounded-xl border border-amber-500/30 bg-black/80 px-3 py-2 text-xs font-semibold text-amber-300 outline-none transition focus:border-amber-500"
                >
                  <option value="">— Sin vinculación / Ingreso manual —</option>
                  {!canales.some((c) => c.discord_id === editCanalSeleccionado) && editCanalSeleccionado && (
                    <option value={editCanalSeleccionado}>
                      {editNombre || "Canal actual"} (Discord ID: {editCanalSeleccionado})
                    </option>
                  )}
                  {canales.map((c) => (
                    <option key={c.discord_id} value={c.discord_id}>
                      {c.nombre} (Discord ID: {c.discord_id})
                    </option>
                  ))}
                </select>

                <div className="mt-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Discord ID del Trabajador (Auto o Manual)
                  </label>
                  <input
                    type="text"
                    value={editDiscordId}
                    onChange={(e) => handleInputDiscordIdEdicion(e.target.value.trim())}
                    placeholder="Ej. 1567337545996435537"
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-1.5 text-xs font-mono font-semibold text-amber-300 outline-none transition focus:border-amber-500"
                  />
                </div>

                <p className="text-[10px] text-slate-400 mt-1">
                  Al vincular un miembro o ingresar su Discord ID, sus turnos y ventas web se sincronizarán directamente con ese canal de Discord.
                </p>
              </div>

              {/* Nombre de Personaje */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Nombre Completo / Nombre de Personaje
                </label>
                <input
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  placeholder="Ej. Nico Gallagher"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                />
              </div>

              {/* Nombre de Usuario (Login) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Nombre de Usuario (Login)
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Ej. SAMCRO_ADMIN"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Identificador para iniciar sesión. Si lo cambias, sus sesiones previas se actualizarán.
                </p>
              </div>

              {/* Rol de Acceso */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Rol de Acceso
                </label>
                <select
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value as "trabajador" | "jefe" | "superadmin")}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500"
                >
                  <option value="trabajador">Trabajador / Miembro (Bitácora Personal)</option>
                  <option value="jefe">Jefe de Área (Oficial)</option>
                  <option value="superadmin">Mesa Directiva (Superadmin)</option>
                </select>
              </div>

              {/* Permisos de Visualización de Nómina */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Permisos de Visualización de Nómina
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-xl border border-white/5 bg-black/40 p-3">
                  {listaPermisosOpciones.map((opc) => (
                    <label
                      key={opc.key}
                      className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={editPermisos.includes(opc.key)}
                        onChange={() => handleTogglePermisoEdicion(opc.key)}
                        className="rounded border-white/20 bg-slate-800 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="font-medium text-[11px]">{opc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Nueva Contraseña (Opcional) */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Cambiar / Resetear Contraseña (Opcional)
                  </label>
                  <div className="relative mt-1">
                    <FontAwesomeIcon icon={faKey} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-3 w-3" />
                    <input
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Dejar en blanco para mantener la clave actual"
                      className="w-full rounded-xl border border-white/10 bg-black/60 pl-8 pr-3.5 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500"
                    />
                  </div>
                </div>

                {editPassword && (
                  <label className="flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editDebeCambiarPassword}
                      onChange={(e) => setEditDebeCambiarPassword(e.target.checked)}
                      className="rounded border-white/20 bg-slate-800 text-amber-500"
                    />
                    <span className="text-[11px]">Obligar a cambiar esta clave en su próximo inicio de sesión</span>
                  </label>
                )}
              </div>

              {errorEdicion && <p className="text-xs font-bold text-red-400">{errorEdicion}</p>}

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setUsuarioEditando(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-black uppercase tracking-wider text-slate-950 transition cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {guardandoEdicion ? (
                    <>
                      <FontAwesomeIcon icon={faCircleNotch} className="h-3.5 w-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visor de Foto de Perfil Ampliada */}
      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setFotoAmpliada(null)}
        >
          <div
            className="samcro-panel relative max-h-[90vh] max-w-lg overflow-hidden rounded-3xl border border-amber-500/40 p-4 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex w-full items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  Foto de Perfil
                </span>
                <span className="text-xs text-slate-300 font-bold">&bull; {fotoAmpliada.nombre}</span>
              </div>
              <button
                onClick={() => setFotoAmpliada(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black flex items-center justify-center p-2">
              <img
                src={fotoAmpliada.url}
                alt={fotoAmpliada.nombre}
                className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
