import { prisma } from "@/lib/prisma";
import type { RoleName } from "@/lib/session";

type AssignmentActor = {
  role: Extract<RoleName, "Admin" | "AdminJurusan">;
  jurusanId: bigint | null;
};

/** Assigns exactly three distinct assessors without touching assessment rows. */
export async function assignThreeAssessors(
  actor: AssignmentActor,
  studentId: bigint,
  assessorIds: readonly bigint[],
) {
  const distinctIds = [...new Set(assessorIds.map(String))].map(BigInt);
  if (distinctIds.length !== 3) throw new Error("Satu mahasiswa wajib memiliki tepat tiga asesor berbeda.");
  if (actor.role === "AdminJurusan" && actor.jurusanId === null) throw new Error("Admin Jurusan belum terhubung ke jurusan.");

  return prisma.$transaction(async (tx) => {
    const student = await tx.mahasiswa.findUnique({
      where: { id: studentId },
      include: { user: { select: { jurusanId: true } } },
    });
    if (!student) throw new Error("Mahasiswa tidak ditemukan.");
    if (actor.role === "AdminJurusan" && student.user.jurusanId !== actor.jurusanId) {
      throw new Error("Admin Jurusan tidak memiliki akses ke mahasiswa dari jurusan lain.");
    }

    const assessors = await tx.asesor.findMany({
      where: { id: { in: distinctIds } },
      include: { user: { select: { jurusanId: true } } },
    });
    if (assessors.length !== 3) throw new Error("Salah satu profil asesor tidak ditemukan.");
    if (assessors.some((assessor) => assessor.user.jurusanId !== student.user.jurusanId)) {
      throw new Error("Ketiga asesor harus berasal dari jurusan yang sama dengan mahasiswa.");
    }

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

    return tx.asesorMahasiswa.findMany({ where: { mahasiswaId: studentId }, orderBy: { asesorId: "asc" } });
  });
}
