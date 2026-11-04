"use client";

import React from "react";
import { DollarSign, Users, Clock, Wrench, CheckCircle2, ShieldAlert } from "lucide-react";
import { TrabajadorNomina } from "@/lib/nomina";

interface KpiStatsProps {
  trabajadores: TrabajadorNomina[];
  turnosActivosCount: number;
}

export function formatPeso(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

export function KpiStats({ trabajadores, turnosActivosCount }: KpiStatsProps) {
  const totalPagar = trabajadores.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalHoras = trabajadores.reduce((sum, t) => sum + (t.horas || 0), 0);
  const totalServicios = trabajadores.reduce((sum, t) => sum + (t.nServicios || 0), 0);
  const totalConPago = trabajadores.filter((t) => t.total > 0).length;
  const totalPagados = trabajadores.filter((t) => t.total > 0 && t.pagado).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {/* 1. Total a Pagar - Tarjeta Dorada SAMCRO */}
      <div className="samcro-card rounded-2xl p-4 border border-amber-500/30 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/90">
            Total a Liquidar
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black tracking-tight text-amber-300 drop-shadow-md">
          {formatPeso(totalPagar)}
        </p>
        <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span>{totalConPago} con pago</span>
          <span className="text-amber-400/70 text-[10px] uppercase font-bold">Semanal</span>
        </div>
      </div>

      {/* 2. Progreso de Pagos */}
      <div className="samcro-card rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/90">
            Progreso Pagos
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black tracking-tight text-emerald-400">
          {totalPagados} <span className="text-sm font-semibold text-slate-400">/ {totalConPago}</span>
        </p>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold">
            {totalConPago > 0 ? `${Math.round((totalPagados / totalConPago) * 100)}% cancelado` : "Sin pagos pendientes"}
          </span>
        </div>
      </div>

      {/* 3. Horas Turnos */}
      <div className="samcro-card rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-sky-400/90">
            Horas Turnos
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/25">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black tracking-tight text-sky-300">
          {Math.round(totalHoras * 10) / 10} <span className="text-xs font-bold text-slate-400">hrs</span>
        </p>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-semibold">
            <span className={`h-1.5 w-1.5 rounded-full ${turnosActivosCount > 0 ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
            {turnosActivosCount} en vivo ahora
          </span>
        </div>
      </div>

      {/* 4. Servicios & Ventas */}
      <div className="samcro-card rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-purple-400/90">
            Trabajos / Ventas
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/25">
            <Wrench className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black tracking-tight text-purple-300">
          {totalServicios}
        </p>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold">Fotos & comisiones</span>
        </div>
      </div>

      {/* 5. Nómina Registrada */}
      <div className="col-span-2 sm:col-span-1 samcro-card rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
            Plantilla SAMCRO
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-slate-300 border border-white/10">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black tracking-tight text-slate-100">
          {trabajadores.length} <span className="text-xs font-bold text-slate-400">miembros</span>
        </p>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold">Bitácoras vinculadas</span>
        </div>
      </div>
    </div>
  );
}
