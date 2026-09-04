import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildAssessmentReport } from "@/lib/report/service";
import { workbookResponse } from "@/lib/excel/workbook";
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
  sheet.eachRow((row) => { row.font = { name: "Calibri", size: 8 }; });
  const logo = await readFile(path.join(process.cwd(), "public", "logo.png"));
  const logoId = workbook.addImage({ base64: `data:image/png;base64,${logo.toString("base64")}`, extension: "png" });
  sheet.addImage(logoId, { tl: { col: 5, row: 6 }, ext: { width: 65, height: 65 } });
  sheet.getCell("A1").value = kind === "formal"
    ? "FORMULIR REKAPITULASI HASIL ASESMEN UNTUK PROGRAM STUDI (FORMAL)"
    : kind === "nonformal"
      ? "FORMULIR REKAPITULASI HASIL ASESMEN UNTUK PROGRAM STUDI (NONFORMAL)"
      : "FORMULIR REKAPITULASI HASIL ASESMEN UNTUK PROGRAM STUDI";
  const finalReport = kind === "final";
  const lastColumn = finalReport ? "K" : "H";
  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getCell("A1").font = { bold: true, size: 12 };
  sheet.getCell("A1").alignment = { horizontal: "left" };
  const bio = [["Nama", report.student.name], ["Alamat", report.student.alamat ?? "-"], ["No HP", report.student.noHp ?? "-"], ["Email", report.student.email ?? "-"], ["Jenjang Pendidikan sebelumnya", "-"]];
  bio.forEach(([label, value], index) => {
    const row = index + 2;
    sheet.mergeCells(`A${row}:C${row}`);
    sheet.mergeCells(`E${row}:K${row}`);
    sheet.getCell(`A${row}`).value = label;
    sheet.getCell(`D${row}`).value = ":";
    sheet.getCell(`E${row}`).value = value;
    sheet.getRow(row).height = 17;
  });
  sheet.addRow([]);
  sheet.addRow(["No", "Kode Mata kuliah", "Matakuliah", "", "Skor", "Hasil asesmen", "", "", "Rata-rata Asesmen", "Skor Minimunm", "Status Diisi hasil rapat pleno"]);
  sheet.addRow(["", "", "sesuai dengan CP Prodi", "", "Mandiri", "Asesor RPL 1", "Asesor RPL 2", "Asesor RPL 3", "", "", ""]);
  sheet.getCell("C8").value = "Matakuliah";
  sheet.getCell("C9").value = "sesuai dengan CP Prodi";
  sheet.getCell("E8").value = "Skor";
  sheet.getCell("E9").value = "Mandiri";
  sheet.getCell("F8").value = "Hasil asesmen";
  sheet.getCell("F9").value = "Asesor RPL 1";
  sheet.getCell("G9").value = "Asesor RPL 2";
  sheet.getCell("H9").value = "Asesor RPL 3";
  if (finalReport) {
    sheet.getCell("I8").value = "Rata-rata\nAsesmen";
    sheet.getCell("J8").value = "Skor\nMinimum";
    sheet.getCell("K8").value = "Status\nDiisi hasil rapat pleno";
  }
  sheet.getCell("A8").value = "No";
  sheet.getCell("B8").value = "Kode Mata kuliah";
  for (let r = 8; r <= 9; r++) {
    for (let c = 1; c <= (finalReport ? 11 : 8); c++) {
      sheet.getCell(r, c).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
  }
  sheet.mergeCells("A8:A9"); sheet.mergeCells("B8:B9"); sheet.mergeCells("C8:D8"); sheet.mergeCells("C9:D9"); sheet.mergeCells("F8:H8"); if (finalReport) { sheet.mergeCells("I8:I9"); sheet.mergeCells("J8:J9"); sheet.mergeCells("K8:K9"); }
  for (let r = 8; r <= 9; r++) for (let c = 1; c <= (finalReport ? 11 : 8); c++) {
    const cell = sheet.getCell(r, c);
    cell.font = { bold: true };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  }
  if (!finalReport) for (const address of ["I8", "J8", "K8", "I9", "J9", "K9"]) sheet.getCell(address).value = null;
  report.rows.forEach((row, index) => {
    sheet.getRow(10 + index).values = kind === "final" ? [
      index + 1,
      row.courseCode,
      row.courseName,
      "",
      row.selfScore,
      ...row.assessorScores,
      row.average,
      kind === "final" ? 60 : "",
      "",
    ] : [index + 1, row.courseCode, row.courseName, "", row.selfScore, ...row.assessorScores];
  });
  for (let r = 10; r <= sheet.rowCount; r++) {
    sheet.mergeCells(`C${r}:D${r}`);
    for (let c = 1; c <= (kind === "final" ? 11 : 8); c++) {
      const cell = sheet.getCell(r, c);
      cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    }
  }
  const sign = sheet.rowCount + 2;
  sheet.mergeCells(`A${sign}:D${sign}`); sheet.getCell(`A${sign}`).value = `Badung, ${new Date().getFullYear()}`;
  sheet.mergeCells(`A${sign + 1}:D${sign + 1}`); sheet.getCell(`A${sign + 1}`).value = `Jurusan ${report.jurusan?.namaJurusan ?? "-"}`;
  sheet.mergeCells(`A${sign + 2}:D${sign + 2}`); sheet.getCell(`A${sign + 2}`).value = "Ketua,";
  sheet.pageSetup.orientation = "landscape";
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.getRow(7).height = 55;
  [6, 16, 28, 4, 12, 16, 16, 16, 14, 14, 24].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.getColumn(5).numFmt = "0.00";
  sheet.getColumn(6).numFmt = "0.00";
  sheet.getColumn(7).numFmt = "0.00";
  sheet.getColumn(8).numFmt = "0.00";
  sheet.getColumn(9).numFmt = "0.00";
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 9) row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  const safeName = report.student.name.replace(/[^a-zA-Z0-9_-]+/g, "_");
  return workbookResponse(workbook, `Rekap_Asesmen_${kind}_${safeName}.xlsx`);
}
