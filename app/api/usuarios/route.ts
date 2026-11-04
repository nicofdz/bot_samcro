import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { query, queryOne, ensurePerfilColumns, isPostgres } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.rol !== "superadmin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await ensurePerfilColumns();

    const rows = await query<{
      username: string;
      nombre: string | null;
      avatar_url: string | null;
      rol: string;
      permisos: string;
      debe_cambiar_password: number;
      discord_id: string | null;
      creado_en: string;
    }>("SELECT username, nombre, avatar_url, rol, permisos, debe_cambiar_password, discord_id, creado_en FROM usuarios ORDER BY username ASC");

    const usuarios = rows.map((u) => {
      let permisos: string[] = [];
      try {
        permisos = JSON.parse(u.permisos);
      } catch {
        permisos = [];
      }
      return {
        username: u.username,
        nombre: u.nombre || null,
        avatar_url: u.avatar_url || null,
        rol: u.rol,
        permisos,
        debe_cambiar_password: Boolean(u.debe_cambiar_password),
        discord_id: u.discord_id || null,
        creado_en: u.creado_en,
      };
    });

    return NextResponse.json(usuarios);
  } catch (error: any) {
    console.error("Error al listar usuarios:", error);
    return NextResponse.json({ error: error.message || "Error al obtener usuarios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.rol !== "superadmin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const username = (body.username || "").trim();
    const password = body.password || "";
    const rol = body.rol || "trabajador";
    const permisos = body.permisos || [];
    const nombre = (body.nombre || "").trim() || null;
    const discord_id = (body.discord_id || "").trim() || null;

    if (!username || !password) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const nowIso = new Date().toISOString();

    if (isPostgres()) {
      await query(
        `INSERT INTO usuarios (username, password_hash, rol, permisos, debe_cambiar_password, creado_en, nombre, discord_id)
         VALUES ($1, $2, $3, $4, 1, $5, $6, $7)
         ON CONFLICT (username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         rol = EXCLUDED.rol,
         permisos = EXCLUDED.permisos,
         debe_cambiar_password = EXCLUDED.debe_cambiar_password,
         nombre = COALESCE(EXCLUDED.nombre, usuarios.nombre),
         discord_id = COALESCE(EXCLUDED.discord_id, usuarios.discord_id)`,
        [username, passwordHash, rol, JSON.stringify(permisos), nowIso, nombre, discord_id]
      );
    } else {
      await query(
        `INSERT OR REPLACE INTO usuarios (username, password_hash, rol, permisos, debe_cambiar_password, creado_en, nombre, discord_id)
         VALUES ($1, $2, $3, $4, 1, $5, $6, $7)`,
        [username, passwordHash, rol, JSON.stringify(permisos), nowIso, nombre, discord_id]
      );
    }

    // Sincronizar en canales_trabajador de forma segura (sin depender de ON CONFLICT)
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
      } catch (errCanal) {
        console.warn("Aviso al sincronizar canal trabajador:", errCanal);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json({ error: error.message || "Error al crear usuario" }, { status: 500 });
  }
}
