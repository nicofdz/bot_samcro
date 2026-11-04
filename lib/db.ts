import fs from "fs";
import path from "path";
import { Pool } from "pg";

let pgPool: Pool | null = null;
let sqliteDb: any = null;

const DATABASE_URL = process.env.DATABASE_URL;

// Rutas posibles de samcro.db
const posiblesRutasDb = [
  path.resolve(process.cwd(), "samcro.db"),
  path.resolve(process.cwd(), "..", "samcro.db"),
];

function getSqliteDb() {
  if (!sqliteDb) {
    let dbPath = posiblesRutasDb.find((p) => fs.existsSync(p));
    if (!dbPath) {
      dbPath = posiblesRutasDb[1]; // fallback al directorio padre
    }

    try {
      const Database = require("better-sqlite3");
      sqliteDb = new Database(dbPath);

      // Asegurar que existan tablas turnos_activos y checklist_pagos
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS turnos_activos (
            discord_id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            seccion TEXT NOT NULL,
            canal_id TEXT NOT NULL,
            hora_inicio TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS checklist_pagos (
            clave TEXT PRIMARY KEY,
            semana_inicio TEXT NOT NULL,
            seccion TEXT NOT NULL,
            nombre TEXT NOT NULL,
            pagado INTEGER DEFAULT 1,
            pagado_por TEXT,
            pagado_en TEXT NOT NULL
        );
      `);
      console.log(`✅ Conectado a SQLite local: ${dbPath}`);
    } catch (e) {
      console.error("Error al inicializar SQLite local con better-sqlite3:", e);
    }
  }
  return sqliteDb;
}

function getPgPool(): Pool {
  if (!pgPool) {
    let conn = DATABASE_URL!;
    if (conn.startsWith("postgres://")) {
      conn = conn.replace("postgres://", "postgresql://");
    }
    const isLocalhost = conn.includes("localhost") || conn.includes("127.0.0.1");

    pgPool = new Pool({
      connectionString: conn,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pgPool;
}

export function isPostgres(): boolean {
  return Boolean(DATABASE_URL && DATABASE_URL.trim().length > 0);
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  if (isPostgres()) {
    const p = getPgPool();
    const res = await p.query(text, params);
    return res.rows;
  } else {
    const db = getSqliteDb();
    if (!db) return [];

    // Reemplaza $1, $2, ... por ? para SQLite
    const sqliteSql = text.replace(/\$\d+/g, "?");
    try {
      const stmt = db.prepare(sqliteSql);
      if (text.trim().toUpperCase().startsWith("SELECT")) {
        const rows = stmt.all(...params);
        return rows as T[];
      } else {
        stmt.run(...params);
        return [] as T[];
      }
    } catch (errRun) {
      console.error("Error en query SQLite:", sqliteSql, params, errRun);
      throw errRun;
    }
  }
}

export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

let migrationPerfilRan = false;

export async function ensurePerfilColumns(): Promise<void> {
  if (migrationPerfilRan) return;
  try {
    if (isPostgres()) {
      await query(`
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nombre TEXT;
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS discord_id TEXT;
        CREATE TABLE IF NOT EXISTS canales_trabajador (
          discord_id TEXT PRIMARY KEY,
          nombre TEXT NOT NULL,
          canal_id TEXT
        );
        CREATE TABLE IF NOT EXISTS registros (
          id SERIAL PRIMARY KEY,
          discord_id TEXT,
          nombre TEXT NOT NULL,
          seccion TEXT NOT NULL,
          tipo TEXT NOT NULL,
          horas REAL DEFAULT 0,
          servicio_nombre TEXT,
          monto REAL DEFAULT 0,
          comision REAL DEFAULT 0,
          nota TEXT,
          foto_url TEXT,
          validado INTEGER DEFAULT 1,
          validado_por TEXT,
          creado_en TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS trabajador_semana (
          semana_inicio TEXT PRIMARY KEY,
          semana_fin TEXT NOT NULL,
          discord_id TEXT,
          nombre TEXT NOT NULL,
          username TEXT,
          avatar_url TEXT,
          horas REAL DEFAULT 0,
          ventas REAL DEFAULT 0,
          servicios INTEGER DEFAULT 0,
          puntos REAL DEFAULT 0,
          otorgado_automatico INTEGER DEFAULT 1,
          creado_en TEXT NOT NULL
        );
      `);
    } else {
      const db = getSqliteDb();
      if (db) {
        try {
          db.exec("ALTER TABLE usuarios ADD COLUMN nombre TEXT;");
        } catch {}
        try {
          db.exec("ALTER TABLE usuarios ADD COLUMN avatar_url TEXT;");
        } catch {}
        try {
          db.exec("ALTER TABLE usuarios ADD COLUMN discord_id TEXT;");
        } catch {}
        try {
          db.exec(`
            CREATE TABLE IF NOT EXISTS canales_trabajador (
              discord_id TEXT PRIMARY KEY,
              nombre TEXT NOT NULL,
              canal_id TEXT
            );
            CREATE TABLE IF NOT EXISTS registros (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              discord_id TEXT,
              nombre TEXT NOT NULL,
              seccion TEXT NOT NULL,
              tipo TEXT NOT NULL,
              horas REAL DEFAULT 0,
              servicio_nombre TEXT,
              monto REAL DEFAULT 0,
              comision REAL DEFAULT 0,
              nota TEXT,
              foto_url TEXT,
              validado INTEGER DEFAULT 1,
              validado_por TEXT,
              creado_en TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS trabajador_semana (
              semana_inicio TEXT PRIMARY KEY,
              semana_fin TEXT NOT NULL,
              discord_id TEXT,
              nombre TEXT NOT NULL,
              username TEXT,
              avatar_url TEXT,
              horas REAL DEFAULT 0,
              ventas REAL DEFAULT 0,
              servicios INTEGER DEFAULT 0,
              puntos REAL DEFAULT 0,
              otorgado_automatico INTEGER DEFAULT 1,
              creado_en TEXT NOT NULL
            );
          `);
        } catch {}
      }
    }
    migrationPerfilRan = true;
  } catch (err) {
    console.error("Error asegurando columnas de perfil y tablas:", err);
  }
}
