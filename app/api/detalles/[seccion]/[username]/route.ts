import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SECCIONES } from "@/lib/config";
import { query } from "@/lib/db";
import { obtenerRangoSemana } from "@/lib/nomina";

export async function GET(
  request: Request,
  context: { params: Promise<{ seccion: string; username: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { seccion, username } = await context.params;
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;

    const tieneConsolidado = user.rol === "superadmin" || user.permisos.includes("consolidado");

    if (seccion === "_todos") {
      if (!tieneConsolidado && !Object.keys(SECCIONES).some((s) => user.permisos.includes(s))) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    } else if (!tieneConsolidado && !user.permisos.includes(seccion)) {
      return NextResponse.json({ error: "No autorizado para esta sección" }, { status: 403 });
    }

    const { inicioUtc, finUtc } = obtenerRangoSemana(offset);
    const inicioUtcIso = inicioUtc.toISOString();
    const finUtcIso = finUtc.toISOString();

    let queryText = "";
    let params: any[] = [];

    if (seccion === "_todos") {
      const seccionesPermitidas = Object.keys(SECCIONES).filter(
        (s) => tieneConsolidado || user.permisos.includes(s)
      );
      const placeholders = seccionesPermitidas.map((_, i) => `$${i + 1}`).join(", ");
      const nextIdx = seccionesPermitidas.length + 1;
      queryText = `
        SELECT id, discord_id, nombre, seccion, tipo, horas, servicio_nombre, monto, comision, nota,
               foto_url, validado, validado_por, creado_en
        FROM registros
        WHERE seccion IN (${placeholders})
          AND creado_en >= $${nextIdx} AND creado_en < $${nextIdx + 1}
          AND (nombre = $${nextIdx + 2} OR discord_id = $${nextIdx + 2})
        ORDER BY creado_en DESC
      `;
      params = [...seccionesPermitidas, inicioUtcIso, finUtcIso, username];
    } else {
      queryText = `
        SELECT id, discord_id, nombre, seccion, tipo, horas, servicio_nombre, monto, comision, nota,
               foto_url, validado, validado_por, creado_en
        FROM registros
        WHERE seccion = $1
          AND creado_en >= $2 AND creado_en < $3
          AND (nombre = $4 OR discord_id = $4)
        ORDER BY creado_en DESC
      `;
      params = [seccion, inicioUtcIso, finUtcIso, username];
    }

    const registros = await query(queryText, params);

    // Si estamos en la semana actual, revisar si tiene un turno activo en curso
    if (offset === 0) {
      const turnosActivos = await query<{
        discord_id: string;
        nombre: string;
        seccion: string;
        canal_id: string;
        hora_inicio: string;
      }>(
        "SELECT discord_id, nombre, seccion, canal_id, hora_inicio FROM turnos_activos WHERE nombre = $1 OR discord_id = $1",
        [username]
      );

      if (turnosActivos.length > 0) {
        const ta = turnosActivos[0];
        const seccionNombre = SECCIONES[ta.seccion]?.nombre_visible || ta.seccion;
        registros.unshift({
          id: "activo",
          tipo: "horas",
          horas: 0,
          servicio_nombre: null,
          monto: 0,
          comision: 0,
          nota: `🟢 Turno activo en curso (${seccionNombre})`,
          foto_url: null,
          validado: 2,
          validado_por: null,
          creado_en: ta.hora_inicio,
          seccion: ta.seccion,
        });
      }
    }

    return NextResponse.json(registros);
  } catch (error: any) {
    console.error("Error en /api/detalles:", error);
    return NextResponse.json({ error: error.message || "Error al obtener detalles" }, { status: 500 });
  }
}
