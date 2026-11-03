import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (sessionId) {
    try {
      await deleteSession(sessionId);
    } catch (e) {
      console.error("Error al borrar sesión:", e);
    }
  }

  cookieStore.delete("session_id");
  return NextResponse.json({ success: true });
}
