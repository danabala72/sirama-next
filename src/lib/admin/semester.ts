import { prisma } from "@/lib/prisma";

/** Global semester activation. Call only after requireUser(["Admin"]). */
export async function activateSemester(semesterId: bigint) {
  return prisma.$transaction(async (tx) => {
    const semester = await tx.semester.findUnique({ where: { id: semesterId } });
    if (!semester) throw new Error("Semester tidak ditemukan.");

    await tx.semester.updateMany({ where: { isActive: true }, data: { isActive: false } });
    return tx.semester.update({ where: { id: semesterId }, data: { isActive: true } });
  });
}

export async function getActiveSemester() {
  const semesters = await prisma.semester.findMany({
    where: { isActive: true },
    orderBy: { id: "desc" },
  });
  if (!semesters.length) return null;

  // Read is deterministic even if legacy data accidentally contains >1 active row.
  return { semester: semesters[0], inconsistentActiveCount: Math.max(semesters.length - 1, 0) };
}
