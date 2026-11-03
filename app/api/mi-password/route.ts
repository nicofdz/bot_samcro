import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { query } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const nuevaPassword = (body.nueva_password || "").trim();

    if (!nuevaPassword || nuevaPassword.length < 4) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 4 caracteres" },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(nuevaPassword);
    await query(
      "UPDATE usuarios SET password_hash = $1, debe_cambiar_password = 0 WHERE username = $2",
      [passwordHash, user.username]
    );

    return NextResponse.json({ success: true, mensaje: "Contraseña actualizada exitosamente" });
  } catch (error: any) {
    console.error("Error al cambiar contraseña:", error);
    return NextResponse.json({ error: error.message || "Error al cambiar contraseña" }, { status: 500 });
  }
}
