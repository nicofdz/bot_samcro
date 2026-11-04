import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resolverIdentidadTrabajador } from "@/lib/trabajadores";
import { query } from "@/lib/db";
import { SECCIONES, PORCENTAJES_JEFE } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const seccion = body.seccion || "mecanica";
    const servicioNombre = (body.servicio_nombre || "").trim();
    const monto = Number(body.monto || 0);
    const nota = (body.nota || "").trim();
    const fotoBase64 = (body.foto_base64 || "").trim();

    if (!SECCIONES[seccion]) {
      return NextResponse.json({ error: "La sección seleccionada no es válida" }, { status: 400 });
    }

    if (!servicioNombre) {
      return NextResponse.json({ error: "Debes indicar el concepto o nombre del servicio" }, { status: 400 });
    }

    if (isNaN(monto) || monto <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a $0" }, { status: 400 });
    }

    if (!fotoBase64) {
      return NextResponse.json(
        { error: "Debes adjuntar o pegar la captura de pantalla del comprobante (Ctrl + V)" },
        { status: 400 }
      );
    }

    const trabajador = await resolverIdentidadTrabajador(user);

    // Calcular comisión según rango y sección
    const esJefe = user.rol === "superadmin" || user.rol === "jefe";
    const pct = esJefe
      ? (PORCENTAJES_JEFE[seccion] ?? SECCIONES[seccion].comision_servicio)
      : SECCIONES[seccion].comision_servicio;

    const comision = Math.round(monto * pct);
    const ahoraIso = new Date().toISOString();

    await query(
      `INSERT INTO registros (
         discord_id, nombre, seccion, tipo, horas, servicio_nombre,
         monto, comision, nota, foto_url, validado, validado_por, creado_en
       ) VALUES ($1, $2, $3, 'servicio', 0, $4, $5, $6, $7, $8, 1, $9, $10)`,
      [
        trabajador.discord_id,
        trabajador.nombre,
        seccion,
        servicioNombre,
        monto,
        comision,
        nota || "Registro web",
        fotoBase64,
        user.username,
        ahoraIso,
      ]
    );

    return NextResponse.json({
      success: true,
      mensaje: `Servicio registrado con éxito. Comisión calculada: $${comision.toLocaleString("es-CL")}`,
      trabajador: trabajador.nombre,
      monto,
      comision,
      seccion,
    });
  } catch (error: any) {
    console.error("Error al registrar servicio en bitácora:", error);
    return NextResponse.json({ error: error.message || "Error al registrar servicio" }, { status: 500 });
  }
}
