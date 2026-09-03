import ExcelJS from "exceljs";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildAssessmentReport } from "@/lib/report/service";
import { styleHeader, workbookResponse } from "@/lib/excel/workbook";
import type { ReportKind } from "@/lib/report/scores";

const REPORT_KINDS = new Set<ReportKind>(["final", "formal", "nonformal"]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  const session = await readSession();
  if (!session)
    return Response.json({ message: "Silakan login." }, { status: 401 });
  const { id, kind: rawKind } = await context.params;
  if (!/^\d+$/.test(id) || !REPORT_KINDS.has(rawKind as ReportKind))
    return Response.json(
      { message: "Parameter laporan tidak valid." },
      { status: 400 },
    );
  const studentId = BigInt(id),
    kind = rawKind as ReportKind;

  const student = await prisma.mahasiswa.findUnique({
    where: { id: studentId },
    include: { user: true },
  });
  if (!student)
    return Response.json(
      { message: "Mahasiswa tidak ditemukan." },
      { status: 404 },
    );
  const allowed =
    session.role === "Admin" ||
    (session.role === "AdminJurusan" &&
      session.jurusanId === student.user.jurusanId?.toString()) ||
    (session.role === "Mahasiswa" &&
      session.userId === student.userId.toString()) ||
    (session.role === "Asesor" &&
      Boolean(
        await prisma.asesorMahasiswa.findFirst({
          where: {
            mahasiswaId: studentId,
            asesor: { userId: BigInt(session.userId) },
          },
        }),
      ));
  if (!allowed)
    return Response.json(
      { message: "Tidak memiliki akses ke laporan mahasiswa ini." },
      { status: 403 },
    );

  const report = await buildAssessmentReport(studentId, kind);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIRAMA Next";
  const sheet = workbook.addWorksheet(`Asesmen ${kind}`);
  sheet.addRow(["REKAPITULASI ASESMEN", kind.toUpperCase()]);
  sheet.mergeCells("A1:J1");
  sheet.getCell("A1").font = {
    bold: true,
    size: 16,
    color: { argb: "FFFFFFFF" },
  };
  sheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF214B97" },
  };
  sheet.getCell("A1").alignment = { horizontal: "center" };
  sheet.addRow(["Nama", report.student.name]);
  sheet.addRow(["NIM", report.student.nim ?? "-"]);
  sheet.addRow(["Jurusan", report.jurusan?.namaJurusan ?? "-"]);
  sheet.addRow(["Skema", report.skema?.namaSkema ?? "-"]);
  sheet.addRow(["Asesor", report.assessorNames.join("; ") || "-"]);
  sheet.addRow([]);
  const header = sheet.addRow([
    "No",
    "Semester",
    "Kode MK",
    "Mata Kuliah",
    "Nilai Mandiri",
    "Asesor 1",
    "Asesor 2",
    "Asesor 3",
    "Rata-rata",
    "Status",
  ]);
  styleHeader(header);
  report.rows.forEach((row, index) =>
    sheet.addRow([
      index + 1,
      row.semester,
      row.courseCode,
      row.courseName,
      row.selfScore,
      ...row.assessorScores,
      row.average,
      row.complete ? "Lengkap" : "Belum lengkap",
    ]),
  );
  sheet.views = [{ state: "frozen", ySplit: 8 }];
  [6, 16, 16, 36, 15, 12, 12, 12, 14, 16].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.getColumn(5).numFmt = "0.00";
  sheet.getColumn(6).numFmt = "0.00";
  sheet.getColumn(7).numFmt = "0.00";
  sheet.getColumn(8).numFmt = "0.00";
  sheet.getColumn(9).numFmt = "0.00";
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 8) row.alignment = { vertical: "middle", wrapText: true };
  });

  const safeName = report.student.name.replace(/[^a-zA-Z0-9_-]+/g, "_");
  return workbookResponse(workbook, `Rekap_Asesmen_${kind}_${safeName}.xlsx`);
}
