import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolverIdentidadTrabajador } from "@/lib/trabajadores";
import { query, queryOne } from "@/lib/db";
import { SECCIONES } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const accion = body.accion; // "iniciar" | "finalizar"
    const seccion = body.seccion || "mecanica";

    const trabajador = await resolverIdentidadTrabajador(user);

    if (accion === "iniciar") {
      if (!SECCIONES[seccion]) {
        return NextResponse.json({ error: "Sección no válida" }, { status: 400 });
      }

      // Verificar si ya tiene un turno abierto
      const turnoExistente = await queryOne<{ discord_id: string; seccion: string; hora_inicio: string }>(
        `SELECT discord_id, seccion, hora_inicio
         FROM turnos_activos
         WHERE discord_id = $1 OR LOWER(nombre) = LOWER($2)
         LIMIT 1`,
        [trabajador.discord_id, trabajador.nombre]
      );

      if (turnoExistente) {
        return NextResponse.json(
          {
            error: `Ya tienes un turno activo en la sección de ${SECCIONES[turnoExistente.seccion]?.nombre_visible || turnoExistente.seccion}.`,
            turno: turnoExistente,
          },
          { status: 400 }
        );
      }

      const ahoraIso = new Date().toISOString();

      await query(
        `INSERT INTO turnos_activos (discord_id, nombre, seccion, canal_id, hora_inicio)
         VALUES ($1, $2, $3, $4, $5)`,
        [trabajador.discord_id, trabajador.nombre, seccion, trabajador.canal_id || "web", ahoraIso]
      );

      return NextResponse.json({
        success: true,
        mensaje: `Turno iniciado en ${SECCIONES[seccion]?.nombre_visible || seccion}`,
        turno: {
          discord_id: trabajador.discord_id,
          nombre: trabajador.nombre,
          seccion,
          canal_id: trabajador.canal_id,
          hora_inicio: ahoraIso,
        },
      });
    } else if (accion === "finalizar") {
      // Buscar turno activo
      const turno = await queryOne<{
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

      if (!turno) {
        return NextResponse.json({ error: "No tienes ningún turno activo para finalizar" }, { status: 404 });
      }

      const inicioMs = new Date(turno.hora_inicio).getTime();
      const ahoraMs = Date.now();
      const diffHoras = (ahoraMs - inicioMs) / (1000 * 60 * 60);

      // Mínimo 0.01 horas para que no sea 0 si fue solo una prueba de pocos segundos
      const horasFinales = Math.max(0.01, Math.round(diffHoras * 100) / 100);
      const ahoraIso = new Date().toISOString();

      // Eliminar de turnos_activos
      await query(
        `DELETE FROM turnos_activos WHERE discord_id = $1 OR LOWER(nombre) = LOWER($2)`,
        [turno.discord_id, turno.nombre]
      );

      // Insertar en registros
      await query(
        `INSERT INTO registros (
           discord_id, nombre, seccion, tipo, horas, servicio_nombre,
           monto, comision, nota, foto_url, validado, validado_por, creado_en
         ) VALUES ($1, $2, $3, 'horas', $4, $5, 0, 0, $6, null, 1, $7, $8)`,
        [
          turno.discord_id,
          turno.nombre,
          turno.seccion,
          horasFinales,
          `Turno en vivo (${horasFinales}h)`,
          `Turno web finalizado (${horasFinales} hrs acumuladas)`,
          user.username,
          ahoraIso,
        ]
      );

      return NextResponse.json({
        success: true,
        horas: horasFinales,
        mensaje: `Turno finalizado con éxito. Se registraron ${horasFinales} horas en ${SECCIONES[turno.seccion]?.nombre_visible || turno.seccion}.`,
      });
    } else {
      return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error en bitácora turno:", error);
    return NextResponse.json({ error: error.message || "Error al procesar turno" }, { status: 500 });
  }
}

