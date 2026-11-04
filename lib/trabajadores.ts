import { query, queryOne, isPostgres } from "./db";

export interface CanalTrabajador {
  discord_id: string;
  nombre: string;
  canal_id?: string | null;
}

export interface IdentidadTrabajador {
  discord_id: string;
  nombre: string;
  canal_id: string;
  esDiscordOriginal: boolean;
}

/**
 * Obtiene la lista completa de canales de trabajadores registrados (para dropdowns de asignación)
 */
export async function obtenerCanalesTrabajadores(): Promise<CanalTrabajador[]> {
  try {
    const rows = await query<CanalTrabajador>(
      "SELECT discord_id, nombre, canal_id FROM canales_trabajador ORDER BY nombre ASC"
    );
    return rows;
  } catch (error) {
    console.error("Error al obtener canales de trabajadores:", error);
    return [];
  }
}

/**
 * Resuelve la identidad canónica del trabajador para asegurar que turnos y registros
 * queden enlazados exactamente al mismo canal y nombre de Discord que ya tienen,
 * garantizando cero duplicidad de información en la nómina.
 */
export async function resolverIdentidadTrabajador(user: {
  username: string;
  nombre?: string | null;
  discord_id?: string | null;
}): Promise<IdentidadTrabajador> {
  // 1. Si el usuario ya tiene discord_id asignado, buscar en canales_trabajador
  if (user.discord_id) {
    const c = await queryOne<CanalTrabajador>(
      "SELECT discord_id, nombre, canal_id FROM canales_trabajador WHERE discord_id = $1",
      [user.discord_id]
    );
    if (c) {
      return {
        discord_id: c.discord_id,
        nombre: c.nombre,
        canal_id: c.canal_id || "web",
        esDiscordOriginal: true,
      };
    }
  }

  // 2. Si tiene nombre completo asignado en su perfil, buscar coincidencia exacta o insensible a mayúsculas
  if (user.nombre && user.nombre.trim()) {
    const c = await queryOne<CanalTrabajador>(
      "SELECT discord_id, nombre, canal_id FROM canales_trabajador WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1",
      [user.nombre]
    );
    if (c) {
      // Guardar el discord_id encontrado en su usuario para futuras consultas
      try {
        await query("UPDATE usuarios SET discord_id = $1 WHERE username = $2", [c.discord_id, user.username]);
      } catch {}
      return {
        discord_id: c.discord_id,
        nombre: c.nombre,
        canal_id: c.canal_id || "web",
        esDiscordOriginal: true,
      };
    }
  }

  // 3. Buscar por coincidencia con su username (reemplazando guiones bajos por espacios o match exacto)
  const usernameClean = user.username.replace(/_/g, " ").trim();
  const cPorUsername = await queryOne<CanalTrabajador>(
    "SELECT discord_id, nombre, canal_id FROM canales_trabajador WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) OR LOWER(TRIM(nombre)) = LOWER(TRIM($2)) LIMIT 1",
    [user.username, usernameClean]
  );
  if (cPorUsername) {
    try {
      await query("UPDATE usuarios SET discord_id = $1, nombre = COALESCE(nombre, $2) WHERE username = $3", [
        cPorUsername.discord_id,
        cPorUsername.nombre,
        user.username,
      ]);
    } catch {}
    return {
      discord_id: cPorUsername.discord_id,
      nombre: cPorUsername.nombre,
      canal_id: cPorUsername.canal_id || "web",
      esDiscordOriginal: true,
    };
  }

  // 4. Si no se encontró en canales_trabajador, registrarlo para que figure en la nómina
  const nombreFinal = (user.nombre && user.nombre.trim()) || user.username;
  const discordIdFinal = user.discord_id || `web_${user.username.toLowerCase()}`;

  try {
    if (isPostgres()) {
      await query(
        `INSERT INTO canales_trabajador (discord_id, nombre, canal_id)
         VALUES ($1, $2, 'web')
         ON CONFLICT (discord_id) DO UPDATE SET nombre = EXCLUDED.nombre`,
        [discordIdFinal, nombreFinal]
      );
    } else {
      await query(
        `INSERT OR REPLACE INTO canales_trabajador (discord_id, nombre, canal_id)
         VALUES ($1, $2, 'web')`,
        [discordIdFinal, nombreFinal]
      );
    }
  } catch (err) {
    console.warn("Aviso al auto-registrar canal de trabajador:", err);
  }

  return {
    discord_id: discordIdFinal,
    nombre: nombreFinal,
    canal_id: "web",
    esDiscordOriginal: false,
  };
}
