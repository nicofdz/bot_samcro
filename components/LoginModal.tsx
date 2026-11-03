"use client";

import React, { useState } from "react";
import { Lock, User, ArrowRight, Shield } from "lucide-react";
import { UserSession } from "@/lib/auth";

interface LoginModalProps {
  onLoginSuccess: (user: UserSession) => void;
}

export function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Credenciales incorrectas");
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090b0e] p-4">
      {/* Fondo con brillo sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0,transparent_70%)] pointer-events-none" />

      <div className="glass-panel gold-glow relative w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl sm:p-8">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <img
            src="/324-3248703_welcome-to-sons-of-anarchy-samcro-sons-of.png"
            alt="SAMCRO Reaper"
            className="h-20 w-auto object-contain transition-transform hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/Sons-of-Anarchy-Logo.png";
            }}
          />
          <h1 className="mt-3 text-lg font-black tracking-wider text-amber-500">SAMCRO MC</h1>
          <p className="text-xs text-slate-400">Acceso a Nóminas y Bitácoras</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Usuario
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Tu usuario"
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Contraseña
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-center text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {cargando ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[11px] text-slate-500">
          Uso restringido a Jefaturas y Liderazgo de SAMCRO
        </div>
      </div>
    </div>
  );
}
