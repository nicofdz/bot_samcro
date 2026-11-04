"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faUser,
  faRightToBracket,
  faCircleNotch,
} from "@fortawesome/free-solid-svg-icons";
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-[#07080a]">
      <div className="w-full max-w-3xl flex flex-col items-center">
        {/* Imagen principal limpia, sin textos ni badges encima */}
        <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
          <img
            src="/portada_login.jpg"
            alt="SAMCRO"
            className="w-full h-auto object-contain block"
          />
        </div>

        {/* Formulario limpio y directo */}
        <div className="w-full max-w-md mt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faUser}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500"
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Usuario"
                  className="w-full rounded-xl border border-white/10 bg-[#0f1218] py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faLock}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-white/10 bg-[#0f1218] py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-2.5 text-center text-xs font-semibold text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-black tracking-widest uppercase text-slate-950 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {cargando ? (
                <FontAwesomeIcon icon={faCircleNotch} className="h-4 w-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <span>Ingresar</span>
                  <FontAwesomeIcon icon={faRightToBracket} className="h-3.5 w-3.5 text-slate-950" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
