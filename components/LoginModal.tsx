"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faUser,
  faArrowRight,
  faShieldHalved,
  faFire,
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
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 overflow-x-hidden bg-[#07080a]">
      {/* Fondo cinematográfico con desenfoque de la portada */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-25 filter blur-md scale-110 pointer-events-none"
        style={{ backgroundImage: `url('/portada_login.jpg')` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-[#07080a]/90 via-[#07080a]/75 to-[#07080a] pointer-events-none" />

      {/* Contenedor central - Biker Terminal */}
      <div className="relative w-full max-w-4xl z-10 flex flex-col items-center">
        
        {/* Marco Superior: La foto de la Mesa SAMCRO en GRANDE con borde y brillo */}
        <div className="w-full relative rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-[0_0_50px_rgba(217,119,6,0.25)] bg-black group transition-all duration-500 hover:border-amber-500/60">
          <div className="relative w-full">
            <img
              src="/portada_login.jpg"
              alt="SAMCRO Meeting Table"
              className="w-full h-auto max-h-[380px] sm:max-h-[460px] md:max-h-[520px] object-contain sm:object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
            />
            {/* Gradiente sutil para fundir la parte inferior con la consola de acceso */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0d0f14] via-[#0d0f14]/80 to-transparent pointer-events-none" />
            
            {/* Badges del club sobre la imagen */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-1 text-[10px] sm:text-xs font-black tracking-widest uppercase text-amber-400 border border-amber-500/40 backdrop-blur-md shadow-lg">
                <FontAwesomeIcon icon={faFire} className="h-3 w-3 text-amber-500" />
                Redwood Original &bull; Men of Mayhem
              </span>
            </div>

            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 hidden sm:block">
              <span className="rounded-full bg-black/80 px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-300 border border-white/10 backdrop-blur-md">
                Club House Terminal
              </span>
            </div>

            <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                <img
                  src="/Sons-of-Anarchy-Logo.png"
                  alt="SAMCRO"
                  className="h-9 w-auto object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div>
                  <h1 className="text-lg sm:text-xl font-black tracking-wider text-white drop-shadow-md">
                    <span className="gold-gradient-text">SAMCRO MC</span>
                  </h1>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                    Sistema de Nóminas & Bitácoras
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-400/90 hidden sm:inline-block">
                Mesa Directiva &bull; Sons of Anarchy
              </span>
            </div>
          </div>

          {/* Formulario de Login estilo consola de club */}
          <div className="w-full bg-[#0d0f14] px-5 py-6 sm:px-10 sm:py-8 border-t border-white/10">
            <div className="max-w-xl mx-auto">
              <p className="text-center text-xs text-slate-400 mb-6 font-medium">
                Acceso restringido para <span className="text-amber-400 font-bold">Jefes de Área y Mesa Directiva</span>. Ingresa tus credenciales autorizadas.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Usuario */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Usuario
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon
                        icon={faUser}
                        className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                      />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="ej: admin o jefe"
                        className="w-full rounded-xl border border-white/15 bg-black/70 py-2.5 pl-10 pr-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-medium"
                      />
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Contraseña
                    </label>
                    <div className="relative">
                      <FontAwesomeIcon
                        icon={faLock}
                        className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                      />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-xl border border-white/15 bg-black/70 py-2.5 pl-10 pr-3 text-xs text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-2.5 text-center text-xs font-bold text-red-400 animate-shake">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 py-3 text-xs sm:text-sm font-black tracking-widest uppercase text-slate-950 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 shadow-[0_4px_20px_rgba(217,119,6,0.35)] cursor-pointer"
                >
                  {cargando ? (
                    <FontAwesomeIcon icon={faCircleNotch} className="h-4 w-4 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <span>INGRESAR A LA REUNIÓN</span>
                      <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5 text-slate-950" />
                    </>
                  )}
                </button>
              </form>

              {/* Pie de autenticación */}
              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3 text-amber-500/70" />
                  Conexión segura Supabase
                </span>
                <span>SAMCRO &bull; Redwood Original 1967</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
