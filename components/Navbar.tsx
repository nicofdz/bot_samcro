"use client";

import React from "react";
import { UserSession } from "@/lib/auth";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faKey,
  faRightFromBracket,
  faShieldHalved,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

interface NavbarProps {
  user: UserSession;
  semanas: Array<{ offset: number; label: string; rango: string; es_actual: boolean }>;
  currentOffset: number;
  onSelectOffset: (offset: number) => void;
  onLogout: () => void;
  onOpenPasswordModal: () => void;
}

export function Navbar({
  user,
  semanas,
  currentOffset,
  onSelectOffset,
  onLogout,
  onOpenPasswordModal,
}: NavbarProps) {
  return (
    <header className="samcro-panel sticky top-0 z-40 border-b border-white/10 px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Brand SAMCRO MC */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <img
              src="/Sons-of-Anarchy-Logo.png"
              alt="SAMCRO Logo"
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_2px_8px_rgba(245,158,11,0.3)]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-wider gold-gradient-text">
                SAMCRO MC
              </span>
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-400 border border-amber-500/30 shadow-inner">
                REDWOOD ORIGINAL
              </span>
            </div>
            <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Club House &bull; Nómina & Bitácoras v3
            </p>
          </div>
        </div>

        {/* Center: Selector de semanas */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <FontAwesomeIcon
              icon={faCalendarDays}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-400 pointer-events-none"
            />
            <select
              value={currentOffset}
              onChange={(e) => onSelectOffset(Number(e.target.value))}
              className="appearance-none rounded-xl border border-amber-500/30 bg-black/80 py-1.5 pl-9 pr-8 text-xs font-bold text-amber-200 outline-none transition hover:border-amber-500/60 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 cursor-pointer shadow-inner"
            >
              {semanas.map((s) => (
                <option key={s.offset} value={s.offset} className="bg-[#0f1218] text-slate-100 font-semibold py-1">
                  {s.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-400">
              ▼
            </span>
          </div>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs font-black tracking-wide text-slate-100 uppercase">{user.username}</span>
              {user.rol === "superadmin" ? (
                <FontAwesomeIcon icon={faShieldHalved} className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <FontAwesomeIcon icon={faUser} className="h-3 w-3 text-emerald-400" />
              )}
            </div>
            <span className="rounded bg-black/60 px-1.5 py-0.2 text-[9px] font-extrabold tracking-wider uppercase text-amber-400/90 border border-white/5">
              {user.rol === "superadmin" ? "Mesa Directiva // Superadmin" : "Jefe de Área // Oficial"}
            </span>
          </div>

          <button
            onClick={onOpenPasswordModal}
            title="Cambiar Contraseña"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 transition hover:border-amber-500/40 hover:bg-slate-700 hover:text-amber-400 cursor-pointer shadow-sm"
          >
            <FontAwesomeIcon icon={faKey} className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onLogout}
            title="Cerrar Sesión"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 px-3 text-xs font-black uppercase tracking-wider text-red-400 transition hover:bg-red-900/40 hover:text-red-300 cursor-pointer shadow-sm"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="h-3 w-3" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
