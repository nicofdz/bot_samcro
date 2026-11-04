import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { queryOne } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!username || !password) {
      return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
    }

    const user = await queryOne<{
      username: string;
      nombre?: string | null;
      avatar_url?: string | null;
      password_hash: string;
      rol: string;
      permisos: string;
      debe_cambiar_password: number;
    }>("SELECT * FROM usuarios WHERE LOWER(username) = LOWER($1)", [username]);

    if (!user || !verifyPassword(user.password_hash, password)) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    const sessionId = await createSession(user.username);
    const cookieStore = await cookies();
    cookieStore.set("session_id", sessionId, {
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    let permisos: string[] = [];
    try {
      permisos = JSON.parse(user.permisos);
    } catch {
      permisos = [];
    }

    return NextResponse.json({
      username: user.username,
      nombre: user.nombre || null,
      avatar_url: user.avatar_url || null,
      rol: user.rol,
      permisos,
      debe_cambiar_password: Boolean(user.debe_cambiar_password),
    });
  } catch (error: any) {
    console.error("Error en /api/login:", error);
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 });
  }
}
