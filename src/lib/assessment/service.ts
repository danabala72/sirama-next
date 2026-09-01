import { prisma } from "@/lib/prisma";
import { selectCanonicalTransfer } from "./canonical";

export type AssessmentKind = "formal" | "nonformal";

export type AssessmentProgress = {
  studentId: string;
  name: string;
  nim: string | null;
  username: string;
  totalCourses: number;
  assessedCourses: number;
  pendingCourses: number;
  duplicateTransfers: number;
  conflictingScores: number;
};

/**
 * Lists only students explicitly assigned to an assessor. This avoids the
 * fragile nested whereHas chain used by Laravel and counts scores across all
 * duplicate transfer rows, including scores attached to older rows.
 */
export async function getAssignedStudentProgress(assessorId: bigint): Promise<AssessmentProgress[]> {
  const assignments = await prisma.asesorMahasiswa.findMany({
    where: { asesorId: assessorId },
    include: {
      mahasiswa: {
        include: {
          user: true,
          mataKuliahPilihan: {
            include: {
              transferSks: { include: { penilaian: { where: { asesorId: assessorId } } } },
              transferNonformal: { include: { penilaian: { where: { asesorId: assessorId } } } },
            },
          },
        },
      },
    },
    orderBy: { mahasiswa: { name: "asc" } },
  });

  return assignments.map(({ mahasiswa }) => {
    let assessedCourses = 0;
    let duplicateTransfers = 0;
    let conflictingScores = 0;

    for (const course of mahasiswa.mataKuliahPilihan) {
      const formal = selectCanonicalTransfer(course.transferSks.map((transfer) => ({
        id: transfer.id,
        source: transfer,
        assessments: transfer.penilaian.map((assessment) => ({
          id: assessment.id,
          assessorId: assessment.asesorId,
          score: assessment.hasil,
          updatedAt: assessment.updatedAt,
        })),
      })), assessorId);
      const nonformal = selectCanonicalTransfer(course.transferNonformal.map((transfer) => ({
        id: transfer.id,
        source: transfer,
        assessments: transfer.penilaian.map((assessment) => ({
          id: assessment.id,
          assessorId: assessment.asesorId,
          score: assessment.nilai,
          updatedAt: assessment.updatedAt,
        })),
      })), assessorId);

      if (formal?.assessment?.score != null || nonformal?.assessment?.score != null) assessedCourses++;
      duplicateTransfers += (formal?.duplicateCount ?? 0) + (nonformal?.duplicateCount ?? 0);
      conflictingScores += Number(formal?.hasConflictingScores) + Number(nonformal?.hasConflictingScores);
    }

    const totalCourses = mahasiswa.mataKuliahPilihan.length;
    return {
      studentId: mahasiswa.id.toString(),
      name: mahasiswa.name,
      nim: mahasiswa.nim,
      username: mahasiswa.user.username,
      totalCourses,
      assessedCourses,
      pendingCourses: totalCourses - assessedCourses,
      duplicateTransfers,
      conflictingScores,
    };
  });
}

type SaveAssessmentInput = {
  assessorId: bigint;
  studentId: bigint;
  selectedCourseId: bigint;
  kind: AssessmentKind;
  score: number;
  gapAnalysis: string;
  assessorNote: string;
};

/**
 * Saves an assessment without mutating or deleting legacy transfer rows.
 * A transfer row is created only when none exists; opening a review page is
 * strictly read-only. Existing score-bearing rows are selected canonically.
 */
export async function saveAssessment(input: SaveAssessmentInput) {
  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 100) {
    throw new Error("Nilai harus berada di antara 0 dan 100.");
  }

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.asesorMahasiswa.findFirst({
      where: { asesorId: input.assessorId, mahasiswaId: input.studentId },
      select: { id: true },
    });
    if (!assignment) throw new Error("Mahasiswa tidak ditugaskan kepada asesor ini.");

    const course = await tx.mataKuliahPilihan.findFirst({
      where: { id: input.selectedCourseId, mahasiswaId: input.studentId },
      include: {
        transferSks: { include: { penilaian: { where: { asesorId: input.assessorId } } } },
        transferNonformal: { include: { penilaian: { where: { asesorId: input.assessorId } } } },
      },
    });
    if (!course) throw new Error("Mata kuliah pilihan tidak ditemukan untuk mahasiswa ini.");

    if (input.kind === "formal") {
      const canonical = selectCanonicalTransfer(course.transferSks.map((transfer) => ({
        id: transfer.id,
        source: transfer,
        assessments: transfer.penilaian.map((assessment) => ({ id: assessment.id, assessorId: assessment.asesorId, score: assessment.hasil, updatedAt: assessment.updatedAt })),
      })), input.assessorId);
      const transfer = canonical?.transfer.source ?? await tx.transferSks.create({
        data: {
          mataKuliahPilihanId: course.id,
          kodeMkAsal: course.kodeMk ?? "",
          namaMkAsal: course.namaMk ?? "",
        },
      });
      const existing = await tx.penilaianTransferSks.findFirst({ where: { transferSksId: transfer.id, asesorId: input.assessorId } });
      return existing
        ? tx.penilaianTransferSks.update({ where: { id: existing.id }, data: { hasil: input.score, kesenjangan: input.gapAnalysis, catatanAsesor: input.assessorNote } })
        : tx.penilaianTransferSks.create({ data: { transferSksId: transfer.id, asesorId: input.assessorId, hasil: input.score, kesenjangan: input.gapAnalysis, catatanAsesor: input.assessorNote } });
    }

    const canonical = selectCanonicalTransfer(course.transferNonformal.map((transfer) => ({
      id: transfer.id,
      source: transfer,
      assessments: transfer.penilaian.map((assessment) => ({ id: assessment.id, assessorId: assessment.asesorId, score: assessment.nilai, updatedAt: assessment.updatedAt })),
    })), input.assessorId);
    const transfer = canonical?.transfer.source ?? await tx.transferSksNonformal.create({ data: { mataKuliahPilihanId: course.id } });
    const existing = await tx.penilaianTransferNonformal.findFirst({ where: { transferNonformalId: transfer.id, asesorId: input.assessorId } });
    return existing
      ? tx.penilaianTransferNonformal.update({ where: { id: existing.id }, data: { nilai: input.score, kesenjangan: input.gapAnalysis, catatanAsesor: input.assessorNote } })
      : tx.penilaianTransferNonformal.create({ data: { transferNonformalId: transfer.id, asesorId: input.assessorId, nilai: input.score, kesenjangan: input.gapAnalysis, catatanAsesor: input.assessorNote } });
  });
}
