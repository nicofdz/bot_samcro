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
 * Obtiene la lista completa de canales de trabajadores registrados (para dropdowns de asignación).
 * Sincroniza e incluye automáticamente a cualquier trabajador que tenga registros en la base de datos
 * pero que no estuviera previamente en la tabla canales_trabajador (como Kimbo DaCosta).
 */
export async function obtenerCanalesTrabajadores(): Promise<CanalTrabajador[]> {
  try {
    // 1. Auto-sincronizar trabajadores que existen en 'registros' pero faltan en 'canales_trabajador'
    try {
      await query(`
        INSERT INTO canales_trabajador (discord_id, nombre, canal_id)
        SELECT DISTINCT r.discord_id, r.nombre, 'discord'
        FROM registros r
        WHERE r.discord_id IS NOT NULL 
          AND r.discord_id != '' 
          AND r.nombre IS NOT NULL 
          AND r.nombre != ''
          AND NOT EXISTS (
            SELECT 1 FROM canales_trabajador c WHERE c.discord_id = r.discord_id
          )
      `);
    } catch (syncErr) {
      console.warn("Aviso al auto-sincronizar canales desde registros:", syncErr);
    }

    // 2. Obtener lista desde canales_trabajador
    const rows = await query<CanalTrabajador>(
      "SELECT discord_id, nombre, canal_id FROM canales_trabajador ORDER BY nombre ASC"
    );

    // 3. Fallback adicional en caso de que la inserción no haya completado
    const mapa = new Map<string, CanalTrabajador>();
    for (const r of rows) {
      mapa.set(r.discord_id, r);
    }

    try {
      const desdeRegistros = await query<{ discord_id: string; nombre: string }>(
        `SELECT DISTINCT discord_id, nombre 
         FROM registros 
         WHERE discord_id IS NOT NULL AND discord_id != '' AND nombre IS NOT NULL AND nombre != ''`
      );
      for (const dr of desdeRegistros) {
        if (!mapa.has(dr.discord_id)) {
          mapa.set(dr.discord_id, {
            discord_id: dr.discord_id,
            nombre: dr.nombre,
            canal_id: "discord",
          });
        }
      }
    } catch {}

    const resultadoFinal = Array.from(mapa.values());
    resultadoFinal.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return resultadoFinal;
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
    } else {
      // Si tiene discord_id pero no estaba en canales_trabajador, registrarlo de inmediato
      const nombreFinal = (user.nombre && user.nombre.trim()) || user.username;
      try {
        await query(
          "INSERT INTO canales_trabajador (discord_id, nombre, canal_id) VALUES ($1, $2, 'web')",
          [user.discord_id, nombreFinal]
        );
      } catch {}
      return {
        discord_id: user.discord_id,
        nombre: nombreFinal,
        canal_id: "web",
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
    const existeCanal = await queryOne(
      "SELECT discord_id FROM canales_trabajador WHERE discord_id = $1",
      [discordIdFinal]
    );
    if (existeCanal) {
      await query("UPDATE canales_trabajador SET nombre = $1 WHERE discord_id = $2", [nombreFinal, discordIdFinal]);
    } else {
      await query(
        "INSERT INTO canales_trabajador (discord_id, nombre, canal_id) VALUES ($1, $2, 'web')",
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

