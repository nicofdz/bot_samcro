"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faLock,
  faCheck,
  faShieldHalved,
  faRightFromBracket,
  faKey,
} from "@fortawesome/free-solid-svg-icons";

interface CambiarPasswordModalProps {
  onClose: () => void;
  obligatorio?: boolean;
  username?: string;
  onSuccess?: () => void;
  onLogout?: () => void;
}

export function CambiarPasswordModal({
  onClose,
  obligatorio = false,
  username,
  onSuccess,
  onLogout,
}: CambiarPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setCargando(true);
    setError(null);
    setMensaje(null);

    try {
      const res = await fetch("/api/mi-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nueva_password: password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al actualizar");
      }

      setMensaje("¡Contraseña actualizada exitosamente! Entrando...");
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar contraseña");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="samcro-panel w-full max-w-sm rounded-2xl border border-amber-500/30 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <FontAwesomeIcon
              icon={obligatorio ? faShieldHalved : faLock}
              className={`h-4 w-4 ${obligatorio ? "text-amber-400" : "text-amber-500"}`}
            />
            {obligatorio ? "Establece Tu Nueva Contraseña" : "Cambiar Mi Contraseña"}
          </h3>
          {!obligatorio && (
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer"
            >
              <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
            </button>
          )}
        </div>

        {obligatorio && (
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs">
            <p className="font-extrabold text-amber-400 flex items-center gap-1.5">
              <FontAwesomeIcon icon={faKey} className="h-3 w-3" />
              Primer Ingreso Obligatorio
            </p>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-300">
              {username ? `Hola ${username}, por` : "Por"} seguridad del club SAMCRO, debes cambiar tu contraseña provisional por una personal para poder ingresar.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Nueva Contraseña Personal
            </label>
            <input
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Confirmar Contraseña
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-2 text-xs font-bold text-red-300">
              {error}
            </div>
          )}
          {mensaje && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-2 text-xs font-bold text-emerald-300">
              {mensaje}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between gap-2 pt-1">
            {obligatorio ? (
              onLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-red-400 hover:border-red-500/30 cursor-pointer transition"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} className="h-3 w-3" />
                  <span>Salir</span>
                </button>
              ) : <div />
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white cursor-pointer transition"
              >
                Cancelar
              </button>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-amber-400 transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
              <span>{cargando ? "Guardando..." : "Guardar Contraseña"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
