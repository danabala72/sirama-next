import ExcelJS from "exceljs";

export const TEMPLATE_HEADERS = {
  mahasiswa: ["kode_jurusan", "username", "password", "nama_lengkap", "email", "jenis_kelamin", "tempat_lahir", "tgl_lahir", "no_hp", "nama_sekolah", "alamat_sekolah", "tahun_lulus_sekolah", "nama_perguruan_tinggi", "prodi_pt", "program_pt", "tahun_lulus_pt"],
  nim: ["username", "nama", "nim"],
  asesor: ["username", "password", "nama_lengkap", "email", "jenis_kelamin", "no_hp"],
  jurusan: ["kode_jurusan", "nama_jurusan", "ketua_jurusan"],
  "mata-kuliah": ["kode_jurusan", "kode_mk", "nama_mk", "semester", "sks", "nilai_minimum", "nama_skema"],
  cpmk: ["kode_mk", "indikator_capaian"],
} as const;

export type TemplateName = keyof typeof TEMPLATE_HEADERS;

export async function workbookResponse(workbook: ExcelJS.Workbook, filename: string) {
  const value = await workbook.xlsx.writeBuffer();
  return new Response(value as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename.replaceAll('"', "")}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function styleHeader(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF285AAE" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF1D4E9A" } } };
  });
}

export function makeTemplate(name: TemplateName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIRAMA Next";
  const sheet = workbook.addWorksheet("Template");
  sheet.addRow([...TEMPLATE_HEADERS[name]]);
  styleHeader(sheet.getRow(1));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${sheet.getColumn(TEMPLATE_HEADERS[name].length).letter}1` };
  sheet.columns.forEach((column) => { column.width = 22; });
  return workbook;
}
