import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { TEMPLATE_HEADERS, type TemplateName } from "./workbook";

type Actor = { role: "Admin" | "AdminJurusan"; jurusanId: bigint | null };
type RowData = Record<string, string | number | Date | null>;

function text(value: RowData[string]) {
  return value === null || value === undefined
    ? ""
    : value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).trim();
}
function integer(value: RowData[string], label: string) {
  const parsed = Number(text(value));
  if (!Number.isInteger(parsed))
    throw new Error(`${label} harus berupa angka bulat.`);
  return parsed;
}
function year(value: RowData[string]) {
  const raw = text(value);
  return raw ? integer(value, "Tahun lulus") : null;
}

export async function readImportRows(
  file: File,
  name: TemplateName,
): Promise<RowData[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Workbook tidak memiliki worksheet.");
  const headers = sheet.getRow(1).values as Array<ExcelJS.CellValue>;
  const normalized = headers.slice(1).map((value) =>
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
  const expected = [...TEMPLATE_HEADERS[name]];
  const missing = expected.filter((header) => !normalized.includes(header));
  if (missing.length)
    throw new Error(`Kolom template tidak lengkap: ${missing.join(", ")}.`);

  const rows: RowData[] = [];
  sheet.eachRow((row, number) => {
    if (number === 1) return;
    const record: RowData = {};
    normalized.forEach((header, index) => {
      const value = row.getCell(index + 1).value;
      record[header] =
        value instanceof Date || typeof value === "number"
          ? value
          : value && typeof value === "object" && "text" in value
            ? String(value.text)
            : value == null
              ? null
              : String(value);
    });
    if (Object.values(record).some((value) => text(value) !== ""))
      rows.push(record);
  });
  return rows;
}

async function resolveJurusan(actor: Actor, kode: string) {
  const jurusan = await prisma.jurusan.findFirst({
    where: { kodeJurusan: kode },
  });
  if (!jurusan) throw new Error(`Kode jurusan ${kode} tidak ditemukan.`);
  if (actor.role === "AdminJurusan" && jurusan.id !== actor.jurusanId)
    throw new Error("Tidak boleh mengimpor data jurusan lain.");
  return jurusan;
}

export async function importRows(
  name: TemplateName,
  rows: RowData[],
  actor: Actor,
  selectedJurusanId?: bigint,
) {
  const errors: Array<{ row: number; message: string }> = [];
  let success = 0;
  for (let index = 0; index < rows.length; index++) {
    try {
      await importRow(name, rows[index], actor, selectedJurusanId);
      success++;
    } catch (error) {
      errors.push({
        row: index + 2,
        message:
          error instanceof Error ? error.message : "Kesalahan tidak dikenal.",
      });
    }
  }
  return { total: rows.length, success, failed: errors.length, errors };
}

async function importRow(
  name: TemplateName,
  row: RowData,
  actor: Actor,
  selectedJurusanId?: bigint,
) {
  if (name === "cpmk") {
    const kodeMk = text(row.kode_mk),
      indicator = text(row.indikator_capaian);
    if (!kodeMk || !indicator)
      throw new Error("kode_mk dan indikator_capaian wajib diisi.");
    const active = await prisma.semester.findFirst({
      where: { isActive: true },
      orderBy: { id: "desc" },
    });
    if (!active) throw new Error("Tidak ada semester aktif.");
    const course = await prisma.mataKuliah.findFirst({ where: { kodeMk } });
    if (!course) throw new Error(`Mata kuliah ${kodeMk} tidak ditemukan.`);
    if (actor.role === "AdminJurusan" && course.jurusanId !== actor.jurusanId)
      throw new Error("Mata kuliah berasal dari jurusan lain.");
    const opened = await prisma.mataKuliahSemester.findFirst({
      where: { mataKuliahId: course.id, semesterId: active.id },
    });
    if (!opened)
      throw new Error(
        `Mata kuliah ${kodeMk} belum dibuka pada semester aktif.`,
      );
    const existing = await prisma.cpMataKuliah.findFirst({
      where: { mataKuliahSemesterId: opened.id, indikatorCapaian: indicator },
    });
    if (!existing)
      await prisma.cpMataKuliah.create({
        data: { mataKuliahSemesterId: opened.id, indikatorCapaian: indicator },
      });
    return;
  }
  if (name === "jurusan") {
    const kode = text(row.kode_jurusan);
    if (!kode) throw new Error("kode_jurusan wajib diisi.");
    if (actor.role === "AdminJurusan") {
      const own = await resolveJurusan(actor, kode);
      await prisma.jurusan.update({
        where: { id: own.id },
        data: {
          namaJurusan: text(row.nama_jurusan) || own.namaJurusan,
          ketuaJurusan: text(row.ketua_jurusan) || own.ketuaJurusan,
        },
      });
    } else {
      const existing = await prisma.jurusan.findFirst({
        where: { kodeJurusan: kode },
      });
      const data = {
        kodeJurusan: kode,
        namaJurusan: text(row.nama_jurusan),
        ketuaJurusan: text(row.ketua_jurusan) || null,
      };
      if (!data.namaJurusan) throw new Error("nama_jurusan wajib diisi.");
      if (existing)
        await prisma.jurusan.update({ where: { id: existing.id }, data });
      else await prisma.jurusan.create({ data });
    }
    return;
  }

  if (name === "nim") {
    const username = text(row.username),
      nim = text(row.nim);
    if (!/^\d+$/.test(nim)) throw new Error("NIM wajib berupa angka.");
    const user = await prisma.user.findUnique({
      where: { username },
      include: { mahasiswa: true },
    });
    if (!user?.mahasiswa)
      throw new Error(`Mahasiswa ${username} tidak ditemukan.`);
    if (actor.role === "AdminJurusan" && user.jurusanId !== actor.jurusanId)
      throw new Error("Mahasiswa berasal dari jurusan lain.");
    await prisma.mahasiswa.update({
      where: { id: user.mahasiswa.id },
      data: { nim },
    });
    return;
  }

  if (name === "mata-kuliah") {
    const jurusan = await resolveJurusan(actor, text(row.kode_jurusan));
    const semester = await prisma.semester.findFirst({
      where: { kode: text(row.semester) },
    });
    if (!semester)
      throw new Error(`Semester ${text(row.semester)} tidak ditemukan.`);
    const kodeMk = text(row.kode_mk),
      namaMk = text(row.nama_mk);
    if (!kodeMk || !namaMk) throw new Error("kode_mk dan nama_mk wajib diisi.");
    const existing = await prisma.mataKuliah.findFirst({
      where: { jurusanId: jurusan.id, kodeMk },
    });
    const data = {
      jurusanId: jurusan.id,
      kodeMk,
      namaMk,
      sks: integer(row.sks, "SKS"),
      nilaiMinimum: integer(row.nilai_minimum, "Nilai minimum"),
      status: true,
    };
    const course = existing
      ? await prisma.mataKuliah.update({ where: { id: existing.id }, data })
      : await prisma.mataKuliah.create({ data });
    await prisma.mataKuliahSemester.upsert({
      where: {
        mataKuliahId_semesterId: {
          mataKuliahId: course.id,
          semesterId: semester.id,
        },
      },
      update: {},
      create: { mataKuliahId: course.id, semesterId: semester.id },
    });
    const schemeNames = text(row.nama_skema)
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const schemes = await prisma.skema.findMany({
      where: { jurusanId: jurusan.id, namaSkema: { in: schemeNames } },
    });
    const missingSchemes = schemeNames.filter(
      (name) => !schemes.some((scheme) => scheme.namaSkema === name),
    );
    if (missingSchemes.length)
      throw new Error(`Skema tidak ditemukan: ${missingSchemes.join(", ")}.`);
    for (const scheme of schemes)
      await prisma.skemaMataKuliah.upsert({
        where: {
          mataKuliahId_skemaId: { mataKuliahId: course.id, skemaId: scheme.id },
        },
        update: {},
        create: { mataKuliahId: course.id, skemaId: scheme.id },
      });
    return;
  }

  const username = text(row.username),
    password = text(row.password),
    fullName = text(row.nama_lengkap),
    email = text(row.email);
  if (!username || !password || !fullName)
    throw new Error("username, password, dan nama_lengkap wajib diisi.");
  const roleName = name === "mahasiswa" ? "Mahasiswa" : "Asesor";
  const role = await prisma.role.findUnique({ where: { role: roleName } });
  if (!role) throw new Error(`Role ${roleName} tidak ditemukan.`);
  const jurusan =
    name === "mahasiswa"
      ? await resolveJurusan(actor, text(row.kode_jurusan))
      : await prisma.jurusan.findUnique({
          where: {
            id:
              actor.role === "AdminJurusan"
                ? actor.jurusanId!
                : selectedJurusanId!,
          },
        });
  if (!jurusan) throw new Error("Jurusan untuk asesor belum dipilih.");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { username } });
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            roleId: role.id,
            jurusanId: jurusan.id,
            email: email || existing.email,
            ...(password ? { password: await bcrypt.hash(password, 12) } : {}),
          },
        })
      : await tx.user.create({
          data: {
            username,
            email: email || null,
            password: await bcrypt.hash(password, 12),
            roleId: role.id,
            jurusanId: jurusan.id,
          },
        });
    if (name === "asesor") {
      await tx.asesor.upsert({
        where: { userId: user.id },
        update: {
          name: fullName,
          email: email || null,
          jenisKelamin: text(row.jenis_kelamin) === "P" ? "P" : "L",
          noHp: text(row.no_hp) || null,
        },
        create: {
          userId: user.id,
          name: fullName,
          email: email || null,
          jenisKelamin: text(row.jenis_kelamin) === "P" ? "P" : "L",
          noHp: text(row.no_hp) || null,
        },
      });
    } else {
      const birth = new Date(text(row.tgl_lahir));
      if (Number.isNaN(birth.getTime()))
        throw new Error("tgl_lahir tidak valid.");
      await tx.mahasiswa.upsert({
        where: { userId: user.id },
        update: {
          name: fullName,
          email,
          jenisKelamin: text(row.jenis_kelamin) === "P" ? "P" : "L",
          tempatLahir: text(row.tempat_lahir) || "-",
          tanggalLahir: birth,
          noHp: text(row.no_hp) || "-",
          namaSekolah: text(row.nama_sekolah) || null,
          alamatSekolah: text(row.alamat_sekolah) || null,
          tahunLulusSekolah: year(row.tahun_lulus_sekolah),
          namaPt: text(row.nama_perguruan_tinggi) || null,
          prodiPt: text(row.prodi_pt) || null,
          programPt: text(row.program_pt) || null,
          tahunLulusPt: year(row.tahun_lulus_pt),
        },
        create: {
          userId: user.id,
          name: fullName,
          email,
          jenisKelamin: text(row.jenis_kelamin) === "P" ? "P" : "L",
          tempatLahir: text(row.tempat_lahir) || "-",
          tanggalLahir: birth,
          statusPerkawinan: "BelumKawin",
          kebangsaan: "Indonesia",
          alamatRumah: "-",
          kodePos: "-",
          noHp: text(row.no_hp) || "-",
          alamatKantor: "-",
          namaSekolah: text(row.nama_sekolah) || null,
          alamatSekolah: text(row.alamat_sekolah) || null,
          tahunLulusSekolah: year(row.tahun_lulus_sekolah),
          namaPt: text(row.nama_perguruan_tinggi) || null,
          prodiPt: text(row.prodi_pt) || null,
          programPt: text(row.program_pt) || null,
          tahunLulusPt: year(row.tahun_lulus_pt),
        },
      });
    }
  });
}
