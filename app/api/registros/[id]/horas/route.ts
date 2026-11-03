import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const registroId = parseInt(id, 10);
    if (isNaN(registroId)) {
      return NextResponse.json({ error: "ID de registro inválido" }, { status: 400 });
    }

    const body = await request.json();
    const horasNuevasRaw = body.horas;

    if (horasNuevasRaw === undefined || horasNuevasRaw === null) {
      return NextResponse.json({ error: "Falta el campo 'horas'" }, { status: 400 });
    }

    const horasNuevas = Math.round(parseFloat(horasNuevasRaw) * 100) / 100;
    if (isNaN(horasNuevas) || horasNuevas < 0) {
      return NextResponse.json({ error: "Las horas deben ser un número positivo" }, { status: 400 });
    }

    const reg = await queryOne<{ id: number; seccion: string }>(
      "SELECT id, seccion FROM registros WHERE id = $1",
      [registroId]
    );

    if (!reg) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const tienePermiso =
      user.rol === "superadmin" ||
      user.permisos.includes("consolidado") ||
      user.permisos.includes(reg.seccion);

    if (!tienePermiso) {
      return NextResponse.json({ error: "No autorizado para esta sección" }, { status: 403 });
    }

    await query("UPDATE registros SET horas = $1 WHERE id = $2", [horasNuevas, registroId]);

    const actualizado = await queryOne("SELECT * FROM registros WHERE id = $1", [registroId]);

    return NextResponse.json({ success: true, registro: actualizado, horas: horasNuevas });
  } catch (error: any) {
    console.error("Error al editar horas:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar horas" }, { status: 500 });
  }
}
