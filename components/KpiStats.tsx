"use client";

import React from "react";
import { DollarSign, Users, Clock, Wrench, CheckCircle2 } from "lucide-react";
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
      {/* Total a Pagar */}
      <div className="glass-card gold-glow rounded-xl p-4 transition-transform hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total a Pagar</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-xl font-extrabold text-amber-400">{formatPeso(totalPagar)}</p>
        <span className="text-[11px] text-slate-400">{totalConPago} personas con pago</span>
      </div>

      {/* Checklist Pagados */}
      <div className="glass-card rounded-xl p-4 transition-transform hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Progreso Pagos</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-xl font-extrabold text-emerald-400">
          {totalPagados} / {totalConPago}
        </p>
        <span className="text-[11px] text-slate-400">
          {totalConPago > 0 ? `${Math.round((totalPagados / totalConPago) * 100)}% cancelado` : "Sin pagos"}
        </span>
      </div>

      {/* Horas Totales */}
      <div className="glass-card rounded-xl p-4 transition-transform hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Horas Turnos</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-xl font-extrabold text-blue-400">{Math.round(totalHoras * 10) / 10} h</p>
        <span className="text-[11px] text-slate-400">{turnosActivosCount} turnos activos ahora</span>
      </div>

      {/* Total Servicios */}
      <div className="glass-card rounded-xl p-4 transition-transform hover:-translate-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Servicios / Ventas</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
            <Wrench className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-xl font-extrabold text-purple-400">{totalServicios}</p>
        <span className="text-[11px] text-slate-400">con fotos y comisiones</span>
      </div>

      {/* Trabajadores Activos */}
      <div className="col-span-2 glass-card rounded-xl p-4 transition-transform hover:-translate-y-0.5 sm:col-span-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nómina Registrada</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-500/10 text-slate-300">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-xl font-extrabold text-slate-200">{trabajadores.length}</p>
        <span className="text-[11px] text-slate-400">bitácoras vinculadas</span>
      </div>
    </div>
  );
}
