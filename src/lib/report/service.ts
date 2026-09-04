import { prisma } from "@/lib/prisma";
import { selectCanonicalTransfer } from "@/lib/assessment/canonical";
import {
  calculateThreeAssessorScore,
  type AssessorScore,
  type ReportKind,
} from "./scores";

export type AssessmentReportRow = {
  selectedCourseId: string;
  semester: string;
  courseCode: string;
  courseName: string;
  selfScore: number | null;
  assessorScores: Array<number | null>;
  average: number | null;
  complete: boolean;
  duplicateTransfers: number;
  conflictingScores: boolean;
};

/**
 * Builds formal/nonformal/final exports from every transfer relation. It does
 * not filter by the currently active semester, so historical selections stay
 * visible after a semester change.
 */
export async function buildAssessmentReport(
  studentId: bigint,
  kind: ReportKind,
) {
  const student = await prisma.mahasiswa.findUnique({
    where: { id: studentId },
    include: {
      user: { include: { jurusan: true, skema: true } },
      asesorLinks: { include: { asesor: true }, orderBy: { asesorId: "asc" } },
      mataKuliahPilihan: {
        include: {
          mataKuliahSemester: { include: { semester: true, mataKuliah: true } },
          transferSks: { include: { penilaian: true } },
          transferNonformal: { include: { penilaian: true } },
        },
        orderBy: [{ mataKuliahSemesterId: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!student) throw new Error("Mahasiswa tidak ditemukan.");

  const catalog = await prisma.mataKuliahSemester.findMany({
    where: {
      semester: { isActive: true },
      mataKuliah: { status: true, jurusanId: student.user.jurusanId! },
    },
    include: { semester: true, mataKuliah: true },
    orderBy: [{ semesterId: "asc" }, { mataKuliah: { kodeMk: "asc" } }],
  });

  const assessorIds = student.asesorLinks
    .map((link) => link.asesorId)
    .slice(0, 3);
  const assessorNames = student.asesorLinks
    .map((link) => link.asesor.name)
    .slice(0, 3);

  const rows: AssessmentReportRow[] = student.mataKuliahPilihan.map(
    (course) => {
      const scores: AssessorScore[] = assessorIds.map((assessorId) => {
        const formal = selectCanonicalTransfer(
          course.transferSks.map((transfer) => ({
            id: transfer.id,
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
            assessments: transfer.penilaian.map((assessment) => ({
              id: assessment.id,
              assessorId: assessment.asesorId,
              score: assessment.nilai,
              updatedAt: assessment.updatedAt,
            })),
          })),
          assessorId,
        );
        return {
          assessorId,
          formal: formal?.assessment?.score ?? null,
          nonformal: nonformal?.assessment?.score ?? null,
        };
      });

      const result = calculateThreeAssessorScore(assessorIds, scores, kind);
      const formalSummary = selectCanonicalTransfer(
        course.transferSks.map((transfer) => ({
          id: transfer.id,
          assessments: transfer.penilaian.map((assessment) => ({
            id: assessment.id,
            assessorId: assessment.asesorId,
            score: assessment.hasil,
            updatedAt: assessment.updatedAt,
          })),
        })),
      );
      const nonformalSummary = selectCanonicalTransfer(
        course.transferNonformal.map((transfer) => ({
          id: transfer.id,
          assessments: transfer.penilaian.map((assessment) => ({
            id: assessment.id,
            assessorId: assessment.asesorId,
            score: assessment.nilai,
            updatedAt: assessment.updatedAt,
          })),
        })),
      );
      const master = course.mataKuliahSemester?.mataKuliah;

      return {
        selectedCourseId: course.id.toString(),
        semester: course.mataKuliahSemester?.semester.label ?? "Historis",
        courseCode: master?.kodeMk ?? course.kodeMk ?? "-",
        courseName: master?.namaMk ?? course.namaMk ?? "-",
        selfScore:
          course.nilaiAngka === null ? null : Number(course.nilaiAngka),
        assessorScores: result.assessorScores,
        average: result.average,
        complete: result.complete,
        duplicateTransfers:
          (formalSummary?.duplicateCount ?? 0) +
          (nonformalSummary?.duplicateCount ?? 0),
        conflictingScores: Boolean(
          formalSummary?.hasConflictingScores ||
          nonformalSummary?.hasConflictingScores,
        ),
      };
    },
  );

  const existingCodes = new Set(rows.map((row) => row.courseCode));
  for (const item of catalog) {
    if (existingCodes.has(item.mataKuliah.kodeMk)) continue;
    rows.push({
      selectedCourseId: `catalog-${item.id}`,
      semester: item.semester.label,
      courseCode: item.mataKuliah.kodeMk,
      courseName: item.mataKuliah.namaMk,
      selfScore: null,
      assessorScores: assessorIds.map(() => null),
      average: null,
      complete: false,
      duplicateTransfers: 0,
      conflictingScores: false,
    });
  }

  return {
    student: {
      id: student.id.toString(),
      nim: student.nim,
      name: student.name,
      alamat: student.alamatRumah,
      noHp: student.noHp,
      email: student.email,
      namaSekolah: student.namaSekolah,
    },
    jurusan: student.user.jurusan,
    skema: student.user.skema,
    assessorNames,
    assessorCount: assessorIds.length,
    kind,
    rows,
  };
}
