"use client";

import React, { useState, useRef } from "react";
import { UserSession } from "@/lib/auth";
import { SECCIONES } from "@/lib/config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faUser,
  faCamera,
  faTrashCan,
  faCheck,
  faCircleNotch,
  faShieldHalved,
  faKey,
  faAt,
  faIdCard,
} from "@fortawesome/free-solid-svg-icons";

interface MiPerfilModalProps {
  user: UserSession;
  onClose: () => void;
  onUserUpdated: (updatedUser: UserSession) => void;
  onOpenPasswordModal?: () => void;
}

// Comprime y optimiza la imagen en el cliente (256x256 WebP) para carga ultrarrápida
function optimizarImagen(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No se pudo inicializar canvas"));

        ctx.drawImage(img, 0, 0, width, height);
        // Generar base64 WebP optimizado
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
      img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export function MiPerfilModal({
  user,
  onClose,
  onUserUpdated,
  onOpenPasswordModal,
}: MiPerfilModalProps) {
  const [nombre, setNombre] = useState(user.nombre || "");
  const [username, setUsername] = useState(user.username);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url || null);
  const [procesandoImg, setProcesandoImg] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSeleccionarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP)");
      return;
    }

    setProcesandoImg(true);
    setError(null);
    try {
      const base64Optimizada = await optimizarImagen(file);
      setAvatarUrl(base64Optimizada);
    } catch (err: any) {
      setError("Error al procesar la imagen: " + (err.message || "desconocido"));
    } finally {
      setProcesandoImg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleEliminarFoto = () => {
    setAvatarUrl(null);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("El nombre de usuario no puede estar vacío");
      return;
    }

    setGuardando(true);
    setError(null);
    setMensajeExito(null);

    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          nuevo_username: username.trim(),
          avatar_url: avatarUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar perfil");
      }

      onUserUpdated(data);
      setMensajeExito("¡Perfil actualizado con éxito!");
      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err: any) {
      setError(err.message || "Error al guardar cambios");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="samcro-panel w-full max-w-lg rounded-2xl border border-white/10 p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <FontAwesomeIcon icon={faIdCard} className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                Mi Perfil de Miembro
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Personaliza tu ficha, foto y credenciales de acceso
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleGuardar} className="mt-5 space-y-5">
          {/* Avatar / Foto de Perfil */}
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-white/5 bg-black/40 p-4">
            <div className="relative group flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-amber-500/40 bg-gradient-to-br from-amber-600/30 to-black shadow-xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-black text-amber-300">
                  {(nombre || username).slice(0, 2).toUpperCase()}
                </span>
              )}

              {procesandoImg && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                  <FontAwesomeIcon icon={faCircleNotch} className="h-5 w-5 text-amber-400 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex flex-col items-center sm:items-start gap-2 flex-1 text-center sm:text-left">
              <div>
                <p className="text-xs font-black text-slate-200 uppercase tracking-wide">
                  Foto de Perfil
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Formatos JPG, PNG o WebP. Se ajusta automáticamente a 256x256 px.
                </p>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleSeleccionarArchivo}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={procesandoImg}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
                >
                  <FontAwesomeIcon icon={faCamera} className="h-3 w-3" />
                  <span>Subir Foto</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleEliminarFoto}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-950/30 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/40 transition cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faTrashCan} className="h-3 w-3" />
                    <span>Quitar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Campos de texto */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Nombre Completo / Nombre de Personaje
              </label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faUser}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 h-3.5 w-3.5"
                />
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Jax Teller o Nicolás Fernández"
                  className="w-full rounded-xl border border-white/10 bg-black/60 py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-100 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">
                Este nombre aparecerá en la barra superior y en las bitácoras del club.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                Nombre de Usuario (Login)
              </label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faAt}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 h-3.5 w-3.5"
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. SAMCRO_ADMIN"
                  className="w-full rounded-xl border border-white/10 bg-black/60 py-2.5 pl-10 pr-3.5 text-xs font-semibold text-slate-100 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium mt-1">
                Identificador único para iniciar sesión. Mínimo 3 caracteres.
              </p>
            </div>
          </div>

          {/* Rango y Secciones (Informativo) */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Rango Asignado
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-300 border border-amber-500/30 uppercase">
                <FontAwesomeIcon icon={faShieldHalved} className="h-2.5 w-2.5" />
                {user.rol === "superadmin" ? "Mesa Directiva // Superadmin" : "Jefe de Área // Oficial"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Áreas Habilitadas
              </span>
              <div className="flex flex-wrap gap-1.5">
                {user.rol === "superadmin" || user.permisos.includes("consolidado") ? (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                    ★ Acceso Total (Consolidado)
                  </span>
                ) : (
                  user.permisos.map((p) => (
                    <span
                      key={p}
                      className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300"
                    >
                      {SECCIONES[p]?.nombre_visible || p}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Seguridad / Contraseña */}
          {onOpenPasswordModal && (
            <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/30 p-3.5">
              <div>
                <p className="text-xs font-bold text-slate-200">Seguridad de la Cuenta</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  Actualiza tu contraseña de acceso cuando lo necesites
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenPasswordModal}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faKey} className="h-3 w-3 text-amber-400" />
                <span>Cambiar Clave</span>
              </button>
            </div>
          )}

          {/* Feedback */}
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs font-bold text-red-300">
              {error}
            </div>
          )}
          {mensajeExito && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-bold text-emerald-300">
              {mensajeExito}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || procesandoImg}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-amber-400 transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {guardando ? (
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
  );
}
