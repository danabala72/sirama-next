import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
export const ROLE_NAMES = [
  "Admin",
  "AdminJurusan",
  "Mahasiswa",
  "Asesor",
] as const;
export type RoleName = (typeof ROLE_NAMES)[number];
export type SessionUser = {
  userId: string;
  username: string;
  role: RoleName;
  jurusanId: string | null;
  skemaId: string | null;
};
const COOKIE_NAME = "sirama_session";
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error("SESSION_SECRET minimal 32 karakter.");
  return new TextEncoder().encode(value);
}
export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 28800,
  });
}
export async function readSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string" ||
      !ROLE_NAMES.includes(payload.role as RoleName)
    )
      return null;
    return payload as SessionUser;
  } catch {
    return null;
  }
}
export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}
export function homeForRole(role: RoleName) {
  return role === "Mahasiswa"
    ? "/form?step=1"
    : role === "Asesor"
      ? "/asesor/dashboard"
      : "/dashboard";
}
