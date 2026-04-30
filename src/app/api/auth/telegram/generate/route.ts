import { NextResponse } from "next/server";
import { generateToken } from "@/lib/telegram-auth-store";

export async function POST() {
  const token = generateToken();
  return NextResponse.json({ token, botUsername: "Canonix_bot" });
}
