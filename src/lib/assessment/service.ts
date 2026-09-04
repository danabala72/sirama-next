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
export async function getAssignedStudentProgress(
  assessorId: bigint,
): Promise<AssessmentProgress[]> {
  const assignments = await prisma.asesorMahasiswa.findMany({
    where: { asesorId: assessorId },
    include: {
      mahasiswa: {
        include: {
          user: true,
          mataKuliahPilihan: {
            include: {
              transferSks: {
                include: { penilaian: { where: { asesorId: assessorId } } },
              },
              transferNonformal: {
                include: { penilaian: { where: { asesorId: assessorId } } },
              },
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
      const formal = selectCanonicalTransfer(
        course.transferSks.map((transfer) => ({
          id: transfer.id,
          source: transfer,
          assessments: transfer.penilaian.map((assessment) => ({
            id: assessment.id,
            assessorId: assessment.asesorId,
            score: assessment.hasil,
            updatedAt: assessment.updatedAt,
          })),
        })),
        assessorId,
      );
      const nonformal = selectCanonicalTransfer(
        course.transferNonformal.map((transfer) => ({
          id: transfer.id,
          source: transfer,
          assessments: transfer.penilaian.map((assessment) => ({
            id: assessment.id,
            assessorId: assessment.asesorId,
            score: assessment.nilai,
            updatedAt: assessment.updatedAt,
          })),
        })),
        assessorId,
      );

      if (
        formal?.assessment?.score != null ||
        nonformal?.assessment?.score != null
      )
        assessedCourses++;
      duplicateTransfers +=
        (formal?.duplicateCount ?? 0) + (nonformal?.duplicateCount ?? 0);
      conflictingScores +=
        Number(formal?.hasConflictingScores) +
        Number(nonformal?.hasConflictingScores);
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
    if (!assignment)
      throw new Error("Mahasiswa tidak ditugaskan kepada asesor ini.");

    const course = await tx.mataKuliahPilihan.findFirst({
      where: { id: input.selectedCourseId, mahasiswaId: input.studentId },
      include: {
        transferSks: {
          include: { penilaian: { where: { asesorId: input.assessorId } } },
        },
        transferNonformal: {
          include: { penilaian: { where: { asesorId: input.assessorId } } },
        },
      },
    });
    if (!course)
      throw new Error(
        "Mata kuliah pilihan tidak ditemukan untuk mahasiswa ini.",
      );

    if (input.kind === "formal") {
      const canonical = selectCanonicalTransfer(
        course.transferSks.map((transfer) => ({
          id: transfer.id,
          source: transfer,
          assessments: transfer.penilaian.map((assessment) => ({
            id: assessment.id,
            assessorId: assessment.asesorId,
            score: assessment.hasil,
            updatedAt: assessment.updatedAt,
          })),
        })),
        input.assessorId,
      );
      const transfer =
        canonical?.transfer.source ??
        (await tx.transferSks.create({
          data: {
            mataKuliahPilihanId: course.id,
            kodeMkAsal: course.kodeMk ?? "",
            namaMkAsal: course.namaMk ?? "",
          },
        }));
      const existing = await tx.penilaianTransferSks.findFirst({
        where: { transferSksId: transfer.id, asesorId: input.assessorId },
      });
      return existing
        ? tx.penilaianTransferSks.update({
            where: { id: existing.id },
            data: {
              hasil: input.score,
              kesenjangan: input.gapAnalysis,
              catatanAsesor: input.assessorNote,
            },
          })
        : tx.penilaianTransferSks.create({
            data: {
              transferSksId: transfer.id,
              asesorId: input.assessorId,
              hasil: input.score,
              kesenjangan: input.gapAnalysis,
              catatanAsesor: input.assessorNote,
            },
          });
    }

    const canonical = selectCanonicalTransfer(
      course.transferNonformal.map((transfer) => ({
        id: transfer.id,
        source: transfer,
        assessments: transfer.penilaian.map((assessment) => ({
          id: assessment.id,
          assessorId: assessment.asesorId,
          score: assessment.nilai,
          updatedAt: assessment.updatedAt,
        })),
      })),
      input.assessorId,
    );
    const transfer =
      canonical?.transfer.source ??
      (await tx.transferSksNonformal.create({
        data: { mataKuliahPilihanId: course.id },
      }));
    const existing = await tx.penilaianTransferNonformal.findFirst({
      where: { transferNonformalId: transfer.id, asesorId: input.assessorId },
    });
    return existing
      ? tx.penilaianTransferNonformal.update({
          where: { id: existing.id },
          data: {
            nilai: input.score,
            kesenjangan: input.gapAnalysis,
            catatanAsesor: input.assessorNote,
          },
        })
      : tx.penilaianTransferNonformal.create({
          data: {
            transferNonformalId: transfer.id,
            asesorId: input.assessorId,
            nilai: input.score,
            kesenjangan: input.gapAnalysis,
            catatanAsesor: input.assessorNote,
          },
        });
  });
}

export async function getAssessmentReview(assessorId: bigint, studentId: bigint) {
  const assignment = await prisma.asesorMahasiswa.findFirst({
    where: { asesorId: assessorId, mahasiswaId: studentId },
    include: {
      mahasiswa: {
        include: {
          user: { include: { jurusan: true, skema: true } },
          mataKuliahPilihan: {
            include: {
              mataKuliahSemester: {
                include: { mataKuliah: true, semester: true },
              },
              attachments: { include: { attachment: true } },
              cpLevels: {
                include: {
                  cpMataKuliah: true,
                  penilaian: { where: { asesorId: assessorId } },
                },
              },
              transferSks: {
                include: {
                  cpmkItems: true,
                  penilaian: { where: { asesorId: assessorId } },
                },
              },
              transferNonformal: {
                include: { penilaian: { where: { asesorId: assessorId } } },
              },
            },
          },
        },
      },
    },
  });
  if (!assignment) throw new Error("Mahasiswa tidak ditugaskan kepada asesor ini.");

  const student = assignment.mahasiswa;
  return {
    student: {
      id: student.id.toString(),
      name: student.name,
      nim: student.nim,
      username: student.user.username,
      jurusan: student.user.jurusan?.namaJurusan ?? "-",
      skema: student.user.skema?.namaSkema ?? "-",
    },
    courses: student.mataKuliahPilihan.map((course) => {
      const formal = selectCanonicalTransfer(
        course.transferSks.map((transfer) => ({
          id: transfer.id,
          source: transfer,
          assessments: transfer.penilaian.map((assessment) => ({
            id: assessment.id,
            assessorId: assessment.asesorId,
            score: assessment.hasil,
            updatedAt: assessment.updatedAt,
          })),
        })),
        assessorId,
      );
      const nonformal = selectCanonicalTransfer(
        course.transferNonformal.map((transfer) => ({
          id: transfer.id,
          source: transfer,
          assessments: transfer.penilaian.map((assessment) => ({
            id: assessment.id,
            assessorId: assessment.asesorId,
            score: assessment.nilai,
            updatedAt: assessment.updatedAt,
          })),
        })),
        assessorId,
      );
      const formalAssessment = formal?.transfer.source.penilaian.find(
        (item) => item.id === formal.assessment?.id,
      );
      const nonformalAssessment = nonformal?.transfer.source.penilaian.find(
        (item) => item.id === nonformal.assessment?.id,
      );
      return {
        id: course.id.toString(),
        kode:
          course.mataKuliahSemester?.mataKuliah.kodeMk ?? course.kodeMk ?? "-",
        nama:
          course.mataKuliahSemester?.mataKuliah.namaMk ?? course.namaMk ?? "-",
        sks: course.mataKuliahSemester?.mataKuliah.sks ?? course.sks,
        semester: course.mataKuliahSemester?.semester.label ?? "Riwayat lama",
        attachments: course.attachments.map(({ attachment }) => ({
          id: attachment.id.toString(),
          label: attachment.label,
          fileName: attachment.fileName,
          filePath: attachment.filePath,
          fileType: attachment.fileType,
        })),
        cpmkAsal: formal?.transfer.source.cpmkItems.map((item) => item.cpmk) ?? [],
        competencies: course.cpLevels.map((level) => ({
          id: level.id.toString(),
          indicator: level.cpMataKuliah.indikatorCapaian,
          claimed: level.levelKompetensi,
          verification: level.penilaian[0]
            ? {
                valid: level.penilaian[0].valid,
                asli: level.penilaian[0].asli,
                terkini: level.penilaian[0].terkini,
                memadai: level.penilaian[0].memadai,
              }
            : null,
        })),
        formal: formalAssessment
          ? {
              score: formalAssessment.hasil,
              gapAnalysis: formalAssessment.kesenjangan ?? "",
              assessorNote: formalAssessment.catatanAsesor ?? "",
            }
          : null,
        nonformal: nonformalAssessment
          ? {
              score: nonformalAssessment.nilai,
              gapAnalysis: nonformalAssessment.kesenjangan ?? "",
              assessorNote: nonformalAssessment.catatanAsesor ?? "",
            }
          : null,
        duplicateCount:
          (formal?.duplicateCount ?? 0) + (nonformal?.duplicateCount ?? 0),
        hasConflict:
          Boolean(formal?.hasConflictingScores) ||
          Boolean(nonformal?.hasConflictingScores),
      };
    }),
  };
}

export async function saveCompetencyVerification(input: {
  assessorId: bigint;
  studentId: bigint;
  selectedCourseId: bigint;
  items: Array<{
    cpLevelId: bigint;
    valid: boolean;
    asli: boolean;
    terkini: boolean;
    memadai: boolean;
  }>;
}) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.asesorMahasiswa.findFirst({
      where: { asesorId: input.assessorId, mahasiswaId: input.studentId },
      select: { id: true },
    });
    if (!assignment) throw new Error("Mahasiswa tidak ditugaskan kepada asesor ini.");
    const validLevels = await tx.cpLevelKompetensi.findMany({
      where: {
        id: { in: input.items.map((item) => item.cpLevelId) },
        mataKuliahPilihanId: input.selectedCourseId,
        mataKuliahPilihan: { mahasiswaId: input.studentId },
      },
      select: { id: true },
    });
    if (validLevels.length !== input.items.length)
      throw new Error("Data CPMK tidak sesuai dengan mahasiswa atau mata kuliah.");
    for (const item of input.items) {
      await tx.penilaianCpKompetensi.upsert({
        where: {
          cpLevelKompetensiId_asesorId: {
            cpLevelKompetensiId: item.cpLevelId,
            asesorId: input.assessorId,
          },
        },
        update: {
          valid: item.valid,
          asli: item.asli,
          terkini: item.terkini,
          memadai: item.memadai,
        },
        create: {
          cpLevelKompetensiId: item.cpLevelId,
          asesorId: input.assessorId,
          valid: item.valid,
          asli: item.asli,
          terkini: item.terkini,
          memadai: item.memadai,
        },
      });
    }
  });
}
