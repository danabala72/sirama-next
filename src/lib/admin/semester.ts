import { prisma } from "@/lib/prisma";

/** Global semester activation. Call only after requireUser(["Admin"]). */
export async function activateSemester(semesterId: bigint) {
  return prisma.$transaction(async (tx) => {
    const semester = await tx.semester.findUnique({
      where: { id: semesterId },
    });
    if (!semester) throw new Error("Semester tidak ditemukan.");

    await tx.semester.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
    return tx.semester.update({
      where: { id: semesterId },
      data: { isActive: true },
    });
  });
}

/** Copies current active offerings only when an admin explicitly asks for it. */
export async function copyActiveOfferingsToSemester(semesterId: bigint) {
  return prisma.$transaction(async (tx) => {
    const activeSemester = await tx.semester.findFirst({
      where: { isActive: true },
      orderBy: { id: "desc" },
    });
    if (!activeSemester)
      throw new Error("Tidak ada semester aktif untuk dijadikan sumber.");
    if (activeSemester.id === semesterId)
      throw new Error("Semester aktif tidak dapat disalin ke dirinya sendiri.");

    const target = await tx.semester.findUnique({ where: { id: semesterId } });
    if (!target) throw new Error("Semester tujuan tidak ditemukan.");

    const offerings = await tx.mataKuliahSemester.findMany({
      where: { semesterId: activeSemester.id, mataKuliah: { status: true } },
      select: { mataKuliahId: true },
    });
    if (offerings.length)
      await tx.mataKuliahSemester.createMany({
        data: offerings.map(({ mataKuliahId }) => ({
          mataKuliahId,
          semesterId,
        })),
        skipDuplicates: true,
      });
    return { target, count: offerings.length };
  });
}

export async function getActiveSemester() {
  const semesters = await prisma.semester.findMany({
    where: { isActive: true },
    orderBy: { id: "desc" },
  });
  if (!semesters.length) return null;

  // Read is deterministic even if legacy data accidentally contains >1 active row.
  return {
    semester: semesters[0],
    inconsistentActiveCount: Math.max(semesters.length - 1, 0),
  };
}
