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
    const anular = body.anular !== false; // true por defecto

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

    const nuevoEstado = anular ? -1 : 1;
    await query("UPDATE registros SET validado = $1, validado_por = $2 WHERE id = $3", [
      nuevoEstado,
      user.username,
      registroId,
    ]);

    const actualizado = await queryOne("SELECT * FROM registros WHERE id = $1", [registroId]);

    return NextResponse.json({ success: true, registro: actualizado });
  } catch (error: any) {
    console.error("Error al anular/restaurar registro:", error);
    return NextResponse.json({ error: error.message || "Error al procesar registro" }, { status: 500 });
  }
}
