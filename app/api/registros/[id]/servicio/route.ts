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
    const monto = body.monto !== undefined ? Number(body.monto) : undefined;
    const comision = body.comision !== undefined ? Number(body.comision) : undefined;
    const servicio_nombre = body.servicio_nombre ? String(body.servicio_nombre).trim() : undefined;

    const reg = await queryOne<{ id: number; seccion: string; tipo: string }>(
      "SELECT id, seccion, tipo FROM registros WHERE id = $1",
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

    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (monto !== undefined && !isNaN(monto) && monto >= 0) {
      updates.push(`monto = $${idx++}`);
      params.push(monto);
    }
    if (comision !== undefined && !isNaN(comision) && comision >= 0) {
      updates.push(`comision = $${idx++}`);
      params.push(comision);
    }
    if (servicio_nombre !== undefined && servicio_nombre.length > 0) {
      updates.push(`servicio_nombre = $${idx++}`);
      params.push(servicio_nombre);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
    }

    params.push(registroId);
    await query(`UPDATE registros SET ${updates.join(", ")} WHERE id = $${idx}`, params);

    const actualizado = await queryOne("SELECT * FROM registros WHERE id = $1", [registroId]);

    return NextResponse.json({ success: true, registro: actualizado });
  } catch (error: any) {
    console.error("Error al editar servicio:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar servicio" }, { status: 500 });
  }
}

