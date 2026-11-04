import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// Finalizar o descartar un turno activo (especialmente turnos colgados)
export async function DELETE(
  request: Request,
  context: { params: Promise<{ discord_id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { discord_id } = await context.params;

    const turno = await queryOne(
      "SELECT * FROM turnos_activos WHERE discord_id = $1",
      [discord_id]
    );

    if (!turno) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
    }

    const tienePermiso =
      user.rol === "superadmin" ||
      user.permisos.includes("consolidado") ||
      user.permisos.includes(turno.seccion);

    if (!tienePermiso) {
      return NextResponse.json({ error: "No autorizado para esta sección" }, { status: 403 });
    }

    // Eliminar de turnos_activos
    await query("DELETE FROM turnos_activos WHERE discord_id = $1", [discord_id]);

    return NextResponse.json({
      success: true,
      mensaje: `Turno de ${turno.nombre} finalizado correctamente.`,
    });
  } catch (error: any) {
    console.error("Error al finalizar turno:", error);
    return NextResponse.json({ error: error.message || "Error al finalizar turno" }, { status: 500 });
  }
}

