import { NextResponse } from "next/server";
import { logger } from "@/lib/logging";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("token");
  logger.api.info("User logged out");
  return response;
}
