import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { obtenerRangoSemana } from "@/lib/nomina";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await request.json();
    const seccion = payload.seccion;
    const nombre = payload.nombre;
    const pagado = Boolean(payload.pagado ?? true);
    const offset = parseInt(payload.offset || "0", 10) || 0;

    if (!seccion || !nombre) {
      return NextResponse.json({ error: "Faltan parámetros requeridos (seccion, nombre)" }, { status: 400 });
    }

    const tienePermiso =
      user.rol === "superadmin" ||
      user.permisos.includes("consolidado") ||
      user.permisos.includes(seccion);

    if (!tienePermiso) {
      return NextResponse.json({ error: "No autorizado para esta sección" }, { status: 403 });
    }

    const { inicioUtc } = obtenerRangoSemana(offset);
    const semanaInicioIso = inicioUtc.toISOString();
    const clave = `${semanaInicioIso}_${seccion}_${nombre}`;
    const nowIso = new Date().toISOString();

    await query("DELETE FROM checklist_pagos WHERE clave = $1", [clave]);

    if (pagado) {
      await query(
        `INSERT INTO checklist_pagos (clave, semana_inicio, seccion, nombre, pagado, pagado_por, pagado_en)
         VALUES ($1, $2, $3, $4, 1, $5, $6)`,
        [clave, semanaInicioIso, seccion, nombre, user.username, nowIso]
      );
    }

    return NextResponse.json({ success: true, pagado, seccion, nombre });
  } catch (error: any) {
    console.error("Error en marcar-pagado:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar estado de pago" }, { status: 500 });
  }
}
