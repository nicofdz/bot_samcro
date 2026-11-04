import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolverIdentidadTrabajador } from "@/lib/trabajadores";
import { query, queryOne } from "@/lib/db";
import { obtenerRangoSemana, formatoFechaCorta } from "@/lib/nomina";
import {
  SECCIONES,
  SUELDO_BASE_TRABAJADOR,
  SUELDO_BASE_JEFE,
  HORAS_MINIMAS_SUELDO_BASE,
} from "@/lib/config";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;

    // Resuelve la identidad exacta vinculada a Discord
    const trabajador = await resolverIdentidadTrabajador(user);

    // 1. Turno activo actual del trabajador
    const turnoActivo = await queryOne<{
      discord_id: string;
      nombre: string;
      seccion: string;
      canal_id: string;
      hora_inicio: string;
    }>(
      `SELECT discord_id, nombre, seccion, canal_id, hora_inicio
       FROM turnos_activos
       WHERE discord_id = $1 OR LOWER(nombre) = LOWER($2)
       LIMIT 1`,
      [trabajador.discord_id, trabajador.nombre]
    );

    // 2. Rango de la semana
    const { inicioUtc, finUtc, inicioLocal, finLocal } = obtenerRangoSemana(offset);
    const inicioUtcIso = inicioUtc.toISOString();
    const finUtcIso = finUtc.toISOString();

    const rangoTexto = `${formatoFechaCorta(inicioLocal)} al ${formatoFechaCorta(finLocal)} 16:00`;

    // 3. Registros de esta semana para este trabajador
    const registros = await query<{
      id: number | string;
      discord_id: string;
      nombre: string;
      seccion: string;
      tipo: string;
      horas: number;
      servicio_nombre: string;
      monto: number;
      comision: number;
      nota: string;
      foto_url: string;
      validado: number;
      validado_por: string;
      creado_en: string;
    }>(
      `SELECT id, discord_id, nombre, seccion, tipo, COALESCE(horas, 0) as horas,
              servicio_nombre, COALESCE(monto, 0) as monto, COALESCE(comision, 0) as comision,
              nota, foto_url, validado, validado_por, creado_en
       FROM registros
       WHERE creado_en >= $1 AND creado_en < $2
         AND (discord_id = $3 OR LOWER(nombre) = LOWER($4))
       ORDER BY creado_en DESC`,
      [inicioUtcIso, finUtcIso, trabajador.discord_id, trabajador.nombre]
    );

    // 4. Calcular KPIs de la semana
    let horasTotales = 0;
    let serviciosTotales = 0;
    let totalComisiones = 0;
    let totalVentas = 0;

    // Mapeo por sección para cálculo de horas y sueldo base
    const horasPorSeccion: Record<string, number> = {};

    for (const r of registros) {
      if (r.validado === 1) {
        if (r.tipo === "horas") {
          const h = Number(r.horas || 0);
          horasTotales += h;
          horasPorSeccion[r.seccion] = (horasPorSeccion[r.seccion] || 0) + h;
        } else {
          serviciosTotales += 1;
          totalComisiones += Number(r.comision || 0);
          totalVentas += Number(r.monto || 0);
        }
      }
    }

    const esJefe = user.rol === "superadmin" || user.rol === "jefe";
    let pagoHorasTotal = 0;

    // Cálculo de sueldo base / horas por sección según configuración
    for (const [seccionKey, seccionCfg] of Object.entries(SECCIONES)) {
      const horasSeccion = horasPorSeccion[seccionKey] || 0;
      if (horasSeccion > 0) {
        if (esJefe) {
          pagoHorasTotal += horasSeccion >= HORAS_MINIMAS_SUELDO_BASE ? SUELDO_BASE_JEFE : 0;
        } else if (seccionCfg.usa_sueldo_base) {
          pagoHorasTotal += horasSeccion >= HORAS_MINIMAS_SUELDO_BASE ? SUELDO_BASE_TRABAJADOR : 0;
        } else {
          pagoHorasTotal += Math.round(horasSeccion * (seccionCfg.tarifa_hora || 0));
        }
      }
    }

    const totalLiquidacion = Math.round((pagoHorasTotal + totalComisiones) * 100) / 100;

    // 5. Estado de pagos en checklist para esta semana
    const checklistRows = await query<{
      seccion: string;
      nombre: string;
      pagado: number;
      pagado_por: string;
      pagado_en: string;
    }>(
      `SELECT seccion, nombre, pagado, pagado_por, pagado_en
       FROM checklist_pagos
       WHERE semana_inicio = $1 AND (LOWER(nombre) = LOWER($2) OR LOWER(nombre) = LOWER($3))`,
      [inicioUtcIso, trabajador.nombre, user.username]
    );

    const estaPagado = checklistRows.some((c) => c.pagado === 1);
    const ultimoPago = checklistRows.find((c) => c.pagado === 1);

    return NextResponse.json({
      trabajador: {
        nombre: trabajador.nombre,
        discord_id: trabajador.discord_id,
        canal_id: trabajador.canal_id,
        esDiscordOriginal: trabajador.esDiscordOriginal,
      },
      turnoActivo: turnoActivo || null,
      semana: {
        offset,
        rangoTexto,
        inicioUtcIso,
        finUtcIso,
      },
      resumen: {
        horasTotales: Math.round(horasTotales * 100) / 100,
        serviciosTotales,
        totalComisiones: Math.round(totalComisiones * 100) / 100,
        totalVentas: Math.round(totalVentas * 100) / 100,
        pagoHorasTotal,
        totalLiquidacion,
        pagado: estaPagado,
        pagado_por: ultimoPago?.pagado_por || null,
        pagado_en: ultimoPago?.pagado_en || null,
      },
      registros,
    });
  } catch (error: any) {
    console.error("Error al obtener estado de bitácora:", error);
    return NextResponse.json({ error: error.message || "Error al obtener estado" }, { status: 500 });
  }
}
