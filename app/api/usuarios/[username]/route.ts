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

    const target = await queryOne("SELECT username FROM usuarios WHERE username = $1", [username]);
    if (!target) {
      return NextResponse.json({ error: "El usuario no existe" }, { status: 404 });
    }

    if (password && password.trim()) {
      const passwordHash = hashPassword(password.trim());
      await query(
        "UPDATE usuarios SET rol = $1, permisos = $2, password_hash = $3 WHERE username = $4",
        [rol, JSON.stringify(permisos), passwordHash, username]
      );
    } else {
      await query(
        "UPDATE usuarios SET rol = $1, permisos = $2 WHERE username = $3",
        [rol, JSON.stringify(permisos), username]
      );
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
