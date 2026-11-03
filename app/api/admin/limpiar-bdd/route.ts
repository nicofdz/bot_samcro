import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user || user.rol !== "superadmin") {
      return NextResponse.json({ error: "Solo el SuperAdmin puede realizar esta acción" }, { status: 403 });
    }

    await query("DELETE FROM registros");
    await query("DELETE FROM pagos_realizados");
    await query("DELETE FROM turnos_activos");
    await query("DELETE FROM checklist_pagos");

    return NextResponse.json({
      success: true,
      mensaje: "Se borraron todos los registros y turnos manteniendo intactas las cuentas de usuario.",
    });
  } catch (error: any) {
    console.error("Error al limpiar base de datos:", error);
    return NextResponse.json({ error: error.message || "Error al limpiar base de datos" }, { status: 500 });
  }
}
