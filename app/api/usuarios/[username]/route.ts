import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

export async function PUT(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.rol !== "superadmin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { username } = await context.params;
    const body = await request.json();
    const rol = body.rol || "jefe";
    const permisos = body.permisos || [];
    const password = body.password;
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : null;
    const discord_id = typeof body.discord_id === "string" ? body.discord_id.trim() : null;

    const target = await queryOne("SELECT username FROM usuarios WHERE username = $1", [username]);
    if (!target) {
      return NextResponse.json({ error: "El usuario no existe" }, { status: 404 });
    }

    if (password && password.trim()) {
      const passwordHash = hashPassword(password.trim());
      await query(
        `UPDATE usuarios
         SET rol = $1, permisos = $2, password_hash = $3, debe_cambiar_password = 1,
             nombre = COALESCE($4, nombre), discord_id = COALESCE($5, discord_id)
         WHERE username = $6`,
        [rol, JSON.stringify(permisos), passwordHash, nombre, discord_id, username]
      );
    } else {
      await query(
        `UPDATE usuarios
         SET rol = $1, permisos = $2,
             nombre = COALESCE($3, nombre), discord_id = COALESCE($4, discord_id)
         WHERE username = $5`,
        [rol, JSON.stringify(permisos), nombre, discord_id, username]
      );
    }

    // Si tiene nombre y discord_id asignados, vincular en canales_trabajador
    if (nombre && discord_id) {
      try {
        await query(
          `INSERT INTO canales_trabajador (discord_id, nombre, canal_id)
           VALUES ($1, $2, 'web')
           ON CONFLICT (discord_id) DO UPDATE SET nombre = EXCLUDED.nombre`,
          [discord_id, nombre]
        );
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar usuario" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.rol !== "superadmin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { username } = await context.params;

    if (username.toLowerCase() === user.username.toLowerCase()) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
    }

    await query("DELETE FROM usuarios WHERE username = $1", [username]);
    await query("DELETE FROM sesiones WHERE username = $1", [username]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar usuario" }, { status: 500 });
  }
}
