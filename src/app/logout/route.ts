import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

const PUBLIC_ORIGIN = process.env.PUBLIC_APP_URL || "https://sirama.pnb.ac.id";

export async function POST() {
  await destroySession();

  // Do not build the redirect from request.url: behind Tailscale/Cloudflare
  // it may contain the internal origin (0.0.0.0:3000).
  return NextResponse.redirect(new URL("/login", PUBLIC_ORIGIN), 303);
}
