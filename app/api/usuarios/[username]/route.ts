import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { query, queryOne, isPostgres } from "@/lib/db";

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
    const nuevoUsername = typeof body.nuevo_username === "string" ? body.nuevo_username.trim() : username;
    const rol = body.rol || "trabajador";
    const permisos = body.permisos || [];
    const password = typeof body.password === "string" ? body.password.trim() : "";
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : null;
    const discord_id = typeof body.discord_id === "string" ? body.discord_id.trim() : null;
    const debeCambiarPassword = body.debe_cambiar_password !== undefined ? (body.debe_cambiar_password ? 1 : 0) : 1;

    const target = await queryOne("SELECT username FROM usuarios WHERE username = $1", [username]);
    if (!target) {
      return NextResponse.json({ error: "El usuario no existe" }, { status: 404 });
    }

    let usernameFinal = username;

    // Si se desea renombrar el username
    if (nuevoUsername && nuevoUsername.toLowerCase() !== username.toLowerCase()) {
      if (nuevoUsername.length < 3) {
        return NextResponse.json(
          { error: "El nombre de usuario debe tener al menos 3 caracteres" },
          { status: 400 }
        );
      }
      if (!/^[a-zA-Z0-9_.-]+$/.test(nuevoUsername)) {
        return NextResponse.json(
          { error: "El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos" },
          { status: 400 }
        );
      }

      const existe = await queryOne(
        "SELECT username FROM usuarios WHERE LOWER(username) = LOWER($1) AND LOWER(username) != LOWER($2)",
        [nuevoUsername, username]
      );
      if (existe) {
        return NextResponse.json(
          { error: "Ese nombre de usuario ya está en uso por otra cuenta" },
          { status: 400 }
        );
      }

      await query("UPDATE sesiones SET username = $1 WHERE username = $2", [nuevoUsername, username]);
      await query("UPDATE usuarios SET username = $1 WHERE username = $2", [nuevoUsername, username]);
      usernameFinal = nuevoUsername;
    }

    // Actualizar datos del usuario
    if (password) {
      const passwordHash = hashPassword(password);
      await query(
        `UPDATE usuarios
         SET rol = $1, permisos = $2, password_hash = $3, debe_cambiar_password = $4,
             nombre = $5, discord_id = $6
         WHERE username = $7`,
        [rol, JSON.stringify(permisos), passwordHash, debeCambiarPassword, nombre, discord_id, usernameFinal]
      );
    } else {
      await query(
        `UPDATE usuarios
         SET rol = $1, permisos = $2, nombre = $3, discord_id = $4
         WHERE username = $5`,
        [rol, JSON.stringify(permisos), nombre, discord_id, usernameFinal]
      );
    }

    // Si tiene nombre y discord_id asignados, sincronizar en canales_trabajador (sin depender de ON CONFLICT)
    if (nombre && discord_id) {
      try {
        const existeCanal = await queryOne(
          "SELECT discord_id FROM canales_trabajador WHERE discord_id = $1",
          [discord_id]
        );
        if (existeCanal) {
          await query("UPDATE canales_trabajador SET nombre = $1 WHERE discord_id = $2", [nombre, discord_id]);
        } else {
          await query(
            "INSERT INTO canales_trabajador (discord_id, nombre, canal_id) VALUES ($1, $2, 'web')",
            [discord_id, nombre]
          );
        }
      } catch (err) {
        console.warn("Aviso al sincronizar canales_trabajador:", err);
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Usuario @${usernameFinal} actualizado correctamente`,
      username: usernameFinal,
    });
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
