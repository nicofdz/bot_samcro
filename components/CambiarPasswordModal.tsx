"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faLock, faCheck } from "@fortawesome/free-solid-svg-icons";

interface CambiarPasswordModalProps {
  onClose: () => void;
}

export function CambiarPasswordModal({ onClose }: CambiarPasswordModalProps) {
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

      setMensaje("Contraseña actualizada exitosamente");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Error al actualizar contraseña");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="samcro-panel w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <FontAwesomeIcon icon={faLock} className="h-3.5 w-3.5 text-amber-500" />
            Cambiar Mi Contraseña
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Nueva Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Confirmar Contraseña</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:border-amber-500"
            />
          </div>

          {error && <p className="text-xs font-bold text-red-400">{error}</p>}
          {mensaje && <p className="text-xs font-bold text-emerald-400">{mensaje}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-amber-400 transition cursor-pointer"
            >
              <FontAwesomeIcon icon={faCheck} className="h-3 w-3" />
              <span>{cargando ? "Guardando..." : "Actualizar"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
