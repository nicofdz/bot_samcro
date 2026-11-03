"use client";

import React, { useState } from "react";
import { X, Lock, Check } from "lucide-react";

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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500" />
            Cambiar Mi Contraseña
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-300">Nueva Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300">Confirmar Contraseña</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500/50"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {mensaje && <p className="text-xs text-emerald-400">{mensaje}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              {cargando ? "Guardando..." : "Actualizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
