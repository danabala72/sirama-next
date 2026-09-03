import { requireUser } from "@/lib/auth";

export async function requireManager() {
  const session = await requireUser(["Admin", "AdminJurusan"]);
  if (session.role === "AdminJurusan" && !session.jurusanId)
    throw new Error("Admin Jurusan belum terhubung ke jurusan.");
  return {
    ...session,
    role: session.role as "Admin" | "AdminJurusan",
    jurusanIdBigInt: session.jurusanId ? BigInt(session.jurusanId) : null,
  };
}

export function scopedJurusanId(
  actor: Awaited<ReturnType<typeof requireManager>>,
  requested?: FormDataEntryValue | null,
) {
  if (actor.role === "AdminJurusan") return actor.jurusanIdBigInt!;
  if (!requested || !String(requested).trim())
    throw new Error("Jurusan wajib dipilih.");
  return BigInt(String(requested));
}

export function assertJurusan(
  actor: Awaited<ReturnType<typeof requireManager>>,
  jurusanId: bigint,
) {
  if (actor.role === "AdminJurusan" && actor.jurusanIdBigInt !== jurusanId)
    throw new Error("Anda tidak memiliki akses ke jurusan ini.");
}
