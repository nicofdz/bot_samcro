"use client";

import React from "react";
import { UserSession } from "@/lib/auth";
import { Calendar, KeyRound, LogOut, ShieldCheck, User } from "lucide-react";

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
    <header className="glass-panel sticky top-0 z-40 border-b border-white/10 px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/Sons-of-Anarchy-Logo.png"
            alt="SAMCRO Logo"
            className="h-10 w-auto object-contain transition-transform hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-amber-500">SAMCRO MC</span>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/20">
                Nómina v3
              </span>
            </div>
            <p className="text-xs text-slate-400">Panel Oficial de Control y Liquidación</p>
          </div>
        </div>

        {/* Center: Selector de semanas */}
        <div className="flex items-center gap-2">
          <Calendar className="hidden h-4 w-4 text-amber-500 md:block" />
          <select
            value={currentOffset}
            onChange={(e) => onSelectOffset(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-200 outline-none transition focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
          >
            {semanas.map((s) => (
              <option key={s.offset} value={s.offset}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs font-bold text-slate-200">{user.username}</span>
              {user.rol === "superadmin" ? (
                <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              ) : (
                <User className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </div>
            <span className="text-[10px] font-semibold uppercase text-slate-400">
              {user.rol === "superadmin" ? "Super Administrador" : "Jefe de Área"}
            </span>
          </div>

          <button
            onClick={onOpenPasswordModal}
            title="Cambiar Contraseña"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 transition hover:border-amber-500/40 hover:bg-slate-700 hover:text-amber-400"
          >
            <KeyRound className="h-4 w-4" />
          </button>

          <button
            onClick={onLogout}
            title="Cerrar Sesión"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 text-xs font-bold text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
