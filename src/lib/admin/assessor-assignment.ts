import { prisma } from "@/lib/prisma";
import type { RoleName } from "@/lib/session";

type AssignmentActor = {
  role: Extract<RoleName, "Admin" | "AdminJurusan">;
  jurusanId: bigint | null;
};

/** Assigns distinct assessors without touching assessment rows. */
export async function assignThreeAssessors(
  actor: AssignmentActor,
  studentId: bigint,
  assessorIds: readonly bigint[],
) {
  const distinctIds = [...new Set(assessorIds.map(String))].map(BigInt);
  if (!distinctIds.length)
    throw new Error("Pilih minimal satu asesor untuk mahasiswa.");
  if (actor.role === "AdminJurusan" && actor.jurusanId === null)
    throw new Error("Admin Jurusan belum terhubung ke jurusan.");

  return prisma.$transaction(async (tx) => {
    const student = await tx.mahasiswa.findUnique({
      where: { id: studentId },
      include: { user: { select: { jurusanId: true } } },
    });
    if (!student) throw new Error("Mahasiswa tidak ditemukan.");
    if (
      actor.role === "AdminJurusan" &&
      student.user.jurusanId !== actor.jurusanId
    ) {
      throw new Error(
        "Admin Jurusan tidak memiliki akses ke mahasiswa dari jurusan lain.",
      );
    }

    const assessors = await tx.asesor.findMany({
      where: { id: { in: distinctIds } },
      include: { user: { select: { jurusanId: true } } },
    });
    if (assessors.length !== distinctIds.length)
      throw new Error("Salah satu profil asesor tidak ditemukan.");
    // Pivot penugasan boleh diganti; seluruh nilai historis pada penilaian_* tetap utuh.
    await tx.asesorMahasiswa.deleteMany({
      where: { mahasiswaId: studentId, asesorId: { notIn: distinctIds } },
    });
    for (const asesorId of distinctIds) {
      await tx.asesorMahasiswa.upsert({
        where: { mahasiswaId_asesorId: { mahasiswaId: studentId, asesorId } },
        update: {},
        create: { mahasiswaId: studentId, asesorId },
      });
    }

    return tx.asesorMahasiswa.findMany({
      where: { mahasiswaId: studentId },
      orderBy: { asesorId: "asc" },
    });
  });
}
