import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { query, ensurePerfilColumns } from "@/lib/db";

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
      creado_en: string;
    }>("SELECT username, nombre, avatar_url, rol, permisos, debe_cambiar_password, creado_en FROM usuarios ORDER BY username ASC");

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
    const rol = body.rol || "jefe";
    const permisos = body.permisos || [];

    if (!username || !password) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const passwordHash = hashPassword(password);
    const nowIso = new Date().toISOString();

    await query(
      `INSERT INTO usuarios (username, password_hash, rol, permisos, debe_cambiar_password, creado_en)
       VALUES ($1, $2, $3, $4, 1, $5)
       ON CONFLICT (username) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       rol = EXCLUDED.rol,
       permisos = EXCLUDED.permisos,
       debe_cambiar_password = EXCLUDED.debe_cambiar_password`,
      [username, passwordHash, rol, JSON.stringify(permisos), nowIso]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json({ error: error.message || "Error al crear usuario" }, { status: 500 });
  }
}
