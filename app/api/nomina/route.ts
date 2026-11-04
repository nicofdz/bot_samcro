import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SECCIONES } from "@/lib/config";
import { query } from "@/lib/db";
import {
  obtenerRangoSemana,
  formatoFechaCorta,
  formatoFechaHora,
  calcularNominaParaSeccion,
} from "@/lib/nomina";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;

    const { inicioUtc, finUtc, inicioLocal, finLocal } = obtenerRangoSemana(offset);
    const inicioUtcIso = inicioUtc.toISOString();
    const finUtcIso = finUtc.toISOString();

    // 1. Checklist de pagos para esta semana
    const checklistRows = await query<{
      seccion: string;
      nombre: string;
      pagado_por: string;
      pagado_en: string;
    }>("SELECT seccion, nombre, pagado_por, pagado_en FROM checklist_pagos WHERE semana_inicio = $1", [
      inicioUtcIso,
    ]);

    const checklist: Record<string, { pagado_por?: string; pagado_en?: string }> = {};
    for (const r of checklistRows) {
      checklist[`${r.seccion}_${r.nombre}`] = {
        pagado_por: r.pagado_por,
        pagado_en: r.pagado_en,
      };
    }

    // 2. Canales de trabajadores registrados
    const canales = await query<{ discord_id: string; nombre: string }>(
      "SELECT discord_id, nombre FROM canales_trabajador"
    );
    const trabajadoresActivos: Record<string, { nombre: string }> = {};
    for (const c of canales) {
      trabajadoresActivos[c.discord_id] = { nombre: c.nombre };
    }

    // 3. Usuarios registrados para detectar jefes
    const usuarios = await query<{ username: string; rol: string }>(
      "SELECT username, rol FROM usuarios"
    );
    const usuariosDb: Record<string, { rol: string }> = {};
    for (const u of usuarios) {
      usuariosDb[u.username.toLowerCase()] = { rol: u.rol };
    }

    // 4. Calcular nómina por sección según permisos
    const data: Record<string, any> = {};
    for (const seccionKey of Object.keys(SECCIONES)) {
      const tieneAcceso =
        user.rol === "superadmin" ||
        user.permisos.includes("consolidado") ||
        user.permisos.includes(seccionKey);

      if (tieneAcceso) {
        data[seccionKey] = await calcularNominaParaSeccion(
          seccionKey,
          inicioUtcIso,
          finUtcIso,
          checklist,
          trabajadoresActivos,
          usuariosDb
        );
      } else {
        data[seccionKey] = [];
      }
    }

    // 5. Turnos activos en tiempo real (solo si semana actual offset == 0)
    if (offset === 0) {
      const turnos = await query<{
        discord_id: string;
        nombre: string;
        seccion: string;
        canal_id: string;
        hora_inicio: string;
      }>("SELECT discord_id, nombre, seccion, canal_id, hora_inicio FROM turnos_activos ORDER BY hora_inicio ASC");
      data["_turnos_activos"] = turnos;
    } else {
      data["_turnos_activos"] = [];
    }

    // 6. Lista de semanas disponibles (-7 a 0)
    const semanasDisponibles = [];
    for (let o = 0; o >= -7; o--) {
      const rango = obtenerRangoSemana(o);
      let label = "";
      if (o === 0) {
        label = `Semana Actual (${formatoFechaCorta(rango.inicioLocal)} - ${formatoFechaCorta(rango.finLocal)})`;
      } else if (o === -1) {
        label = `Semana Anterior (${formatoFechaCorta(rango.inicioLocal)} - ${formatoFechaCorta(rango.finLocal)})`;
      } else {
        label = `Hace ${-o} semanas (${formatoFechaCorta(rango.inicioLocal)} - ${formatoFechaCorta(rango.finLocal)})`;
      }

      semanasDisponibles.push({
        offset: o,
        label,
        rango: `${formatoFechaHora(rango.inicioLocal)} al ${formatoFechaHora(rango.finLocal)}`,
        es_actual: o === 0,
      });
    }

    data["_info_semana"] = {
      offset,
      inicio_local: formatoFechaHora(inicioLocal),
      fin_local: formatoFechaHora(finLocal),
      rango_texto: `${formatoFechaCorta(inicioLocal)} al ${formatoFechaHora(finLocal)}`,
      es_actual: offset === 0,
      semanas: semanasDisponibles,
    };

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error en /api/nomina:", error);
    return NextResponse.json({ error: error.message || "Error al calcular nómina" }, { status: 500 });
  }
}
