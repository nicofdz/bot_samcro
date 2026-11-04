import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, queryOne, ensurePerfilColumns, isPostgres } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    await ensurePerfilColumns();

    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : null;
    const avatar_url = typeof body.avatar_url === "string" ? body.avatar_url : null;
    const discord_id = typeof body.discord_id === "string" ? body.discord_id.trim() : null;
    const nuevoUsername = typeof body.nuevo_username === "string" ? body.nuevo_username.trim() : user.username;

    let usernameFinal = user.username;

    // Si cambia de username
    if (nuevoUsername && nuevoUsername.toLowerCase() !== user.username.toLowerCase()) {
      if (nuevoUsername.length < 3) {
        return NextResponse.json(
          { error: "El nombre de usuario debe tener al menos 3 caracteres" },
          { status: 400 }
        );
      }

      // Validar que no tenga caracteres conflictivos
      if (!/^[a-zA-Z0-9_.-]+$/.test(nuevoUsername)) {
        return NextResponse.json(
          { error: "El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos" },
          { status: 400 }
        );
      }

      // Verificar si ya existe otro usuario con ese username
      const existe = await queryOne(
        "SELECT username FROM usuarios WHERE LOWER(username) = LOWER($1) AND LOWER(username) != LOWER($2)",
        [nuevoUsername, user.username]
      );

      if (existe) {
        return NextResponse.json(
          { error: "Ese nombre de usuario ya está registrado por otro miembro" },
          { status: 400 }
        );
      }

      // Actualizar en sesiones
      await query("UPDATE sesiones SET username = $1 WHERE username = $2", [nuevoUsername, user.username]);

      // Actualizar en usuarios
      await query("UPDATE usuarios SET username = $1 WHERE username = $2", [nuevoUsername, user.username]);

      usernameFinal = nuevoUsername;
    }

    // Actualizar nombre, avatar_url y discord_id (si se proveyó)
    if (discord_id) {
      await query(
        "UPDATE usuarios SET nombre = $1, avatar_url = $2, discord_id = $3 WHERE username = $4",
        [nombre, avatar_url, discord_id, usernameFinal]
      );

      // Sincronizar en canales_trabajador
      if (nombre) {
        try {
          if (isPostgres()) {
            await query(
              `INSERT INTO canales_trabajador (discord_id, nombre, canal_id)
               VALUES ($1, $2, 'web')
               ON CONFLICT (discord_id) DO UPDATE SET nombre = EXCLUDED.nombre`,
              [discord_id, nombre]
            );
          } else {
            await query(
              `INSERT OR REPLACE INTO canales_trabajador (discord_id, nombre, canal_id)
               VALUES ($1, $2, 'web')`,
              [discord_id, nombre]
            );
          }
        } catch {}
      }
    } else {
      await query(
        "UPDATE usuarios SET nombre = $1, avatar_url = $2 WHERE username = $3",
        [nombre, avatar_url, usernameFinal]
      );
    }

    const updated = await queryOne<{
      username: string;
      nombre: string | null;
      avatar_url: string | null;
      rol: "superadmin" | "jefe" | "trabajador";
      permisos: string;
      debe_cambiar_password: number;
      discord_id: string | null;
    }>("SELECT username, nombre, avatar_url, rol, permisos, debe_cambiar_password, discord_id FROM usuarios WHERE username = $1", [
      usernameFinal,
    ]);

    if (!updated) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    let permisos: string[] = [];
    try {
      permisos = JSON.parse(updated.permisos);
    } catch {
      permisos = [];
    }

    return NextResponse.json({
      username: updated.username,
      nombre: updated.nombre,
      avatar_url: updated.avatar_url,
      rol: updated.rol,
      permisos,
      debe_cambiar_password: Boolean(updated.debe_cambiar_password),
      discord_id: updated.discord_id || null,
    });
  } catch (error: any) {
    console.error("Error al actualizar perfil en /api/me:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar perfil" }, { status: 500 });
  }
}
