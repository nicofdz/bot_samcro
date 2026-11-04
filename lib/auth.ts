import crypto from "crypto";
import { cookies } from "next/headers";
import { query, queryOne, ensurePerfilColumns } from "./db";
import { esTrabajadorDeLaSemanaVigente } from "./trabajadorSemana";

export interface UserSession {
  username: string;
  nombre?: string | null;
  avatar_url?: string | null;
  rol: "superadmin" | "jefe" | "trabajador";
  permisos: string[];
  debe_cambiar_password: boolean;
  discord_id?: string | null;
  es_trabajador_semana?: boolean;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  return salt.toString("hex") + "$" + key.toString("hex");
}

export function verifyPassword(storedHash: string, password: string): boolean {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 2) return false;
    const salt = Buffer.from(parts[0], "hex");
    const key = Buffer.from(parts[1], "hex");
    const calculatedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
    return crypto.timingSafeEqual(key, calculatedKey);
  } catch {
    return false;
  }
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;
    if (!sessionId) return null;

    const nowIso = new Date().toISOString();
    const session = await queryOne<{ username: string; expira_en: string }>(
      "SELECT username, expira_en FROM sesiones WHERE session_id = $1 AND expira_en > $2",
      [sessionId, nowIso]
    );

    if (!session) return null;

    await ensurePerfilColumns();

    const user = await queryOne<{
      username: string;
      nombre: string | null;
      avatar_url: string | null;
      rol: "superadmin" | "jefe" | "trabajador";
      permisos: string;
      debe_cambiar_password: number;
      discord_id: string | null;
    }>("SELECT username, nombre, avatar_url, rol, permisos, debe_cambiar_password, discord_id FROM usuarios WHERE username = $1", [
      session.username,
    ]);

    if (!user) return null;

    let permisos: string[] = [];
    try {
      permisos = JSON.parse(user.permisos);
    } catch {
      permisos = [];
    }

    let esCampeon = false;
    try {
      esCampeon = await esTrabajadorDeLaSemanaVigente({
        username: user.username,
        nombre: user.nombre,
        discord_id: user.discord_id,
      });
    } catch {}

    return {
      username: user.username,
      nombre: user.nombre || null,
      avatar_url: user.avatar_url || null,
      rol: user.rol,
      permisos,
      debe_cambiar_password: Boolean(user.debe_cambiar_password),
      discord_id: user.discord_id || null,
      es_trabajador_semana: esCampeon,
    };
  } catch (error) {
    console.error("Error al obtener usuario actual:", error);
    return null;
  }
}

export async function createSession(username: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await query(
    "INSERT INTO sesiones (session_id, username, expira_en) VALUES ($1, $2, $3)",
    [sessionId, username, expiresAt]
  );

  return sessionId;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await query("DELETE FROM sesiones WHERE session_id = $1", [sessionId]);
}
