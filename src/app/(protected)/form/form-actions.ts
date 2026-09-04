"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/lib/prisma";
import { firstIncomplete, formCompletion, requireStudent } from "@/lib/student-form";

const value = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const integer = (data: FormData, key: string) => {
  const raw = value(data, key);
  return raw ? Number(raw) : null;
};

async function finish(step: number, message: string): Promise<never> {
  revalidatePath("/form");
  (await cookies()).set("sirama-toast", message, {
    path: "/",
    maxAge: 15,
    httpOnly: false,
    sameSite: "lax",
  });
  redirect(`/form?step=${step}`);
}

async function reject(step: number, error: unknown): Promise<never> {
  if (isRedirectError(error)) throw error;
  const message = error instanceof Error ? error.message : "Data gagal disimpan.";
  (await cookies()).set("sirama-toast", `Error: ${message}`, {
    path: "/",
    maxAge: 15,
    httpOnly: false,
    sameSite: "lax",
  });
  redirect(`/form?step=${step}`);
}

async function editableStudent() {
  const context = await requireStudent();
  if (!context.student.isEditable)
    throw new Error("Data sudah dikunci dan tidak dapat diubah lagi.");
  return context.student;
}

export async function saveStep1(data: FormData) {
  try {
    const student = await editableStudent();
    const required = [
      "name", "tempatLahir", "tanggalLahir", "jenisKelamin",
      "statusPerkawinan", "kebangsaan", "alamatRumah", "kodePos",
      "noHp", "alamatKantor", "email",
    ];
    if (required.some((key) => !value(data, key)))
      throw new Error("Seluruh data wajib Formulir 1 harus diisi.");
    const email = value(data, "email");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Format email tidak valid.");
    const noHp = value(data, "noHp");
    if (!/^(\+62|62|0)8[1-9][0-9]{6,11}$/.test(noHp))
      throw new Error("Format nomor HP tidak valid.");
    const birth = new Date(value(data, "tanggalLahir"));
    if (Number.isNaN(birth.getTime())) throw new Error("Tanggal lahir tidak valid.");
    const schoolYear = integer(data, "tahunLulusSekolah");
    const universityYear = integer(data, "tahunLulusPt");
    for (const year of [schoolYear, universityYear])
      if (year !== null && (year < 1900 || year > 2100))
        throw new Error("Tahun lulus harus terdiri dari empat digit.");
    await prisma.$transaction([
      prisma.mahasiswa.update({
        where: { id: student.id },
        data: {
          name: value(data, "name"), tempatLahir: value(data, "tempatLahir"),
          tanggalLahir: birth, jenisKelamin: value(data, "jenisKelamin") as "L" | "P",
          statusPerkawinan: value(data, "statusPerkawinan") as "BelumKawin" | "Kawin",
          kebangsaan: value(data, "kebangsaan"), alamatRumah: value(data, "alamatRumah"),
          kodePos: value(data, "kodePos"), noHp, alamatKantor: value(data, "alamatKantor"),
          email, namaSekolah: value(data, "namaSekolah") || null,
          alamatSekolah: value(data, "alamatSekolah") || null,
          tahunLulusSekolah: schoolYear, namaPt: value(data, "namaPt") || null,
          prodiPt: value(data, "prodiPt") || null, programPt: value(data, "programPt") || null,
          tahunLulusPt: universityYear,
        },
      }),
      prisma.user.update({ where: { id: student.userId }, data: { email } }),
    ]);
    await finish(1, "Formulir 1 berhasil disimpan. Anda dapat melanjutkan.");
  } catch (error) { await reject(1, error); }
}

async function storePdf(studentId: bigint, file: File, label: string) {
  if (file.type !== "application/pdf") throw new Error("Berkas harus berformat PDF.");
  if (file.size > 50 * 1024 * 1024) throw new Error("Ukuran berkas maksimal 50 MB.");
  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.pdf`;
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return prisma.attachment.create({ data: {
    mahasiswaId: studentId, label, fileName: file.name,
    filePath: `uploads/${filename}`, fileType: "document",
    mimeType: file.type, fileSize: BigInt(file.size),
  }});
}

export async function uploadStep2(data: FormData) {
  try {
    const student = await editableStudent();
    const label = value(data, "label");
    const files = data.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    if (!label || !files.length) throw new Error("Kategori dan berkas wajib dipilih.");
    for (const file of files) await storePdf(student.id, file, label);
    await finish(2, `${files.length} berkas berhasil diunggah.`);
  } catch (error) { await reject(2, error); }
}

export async function deleteAttachment(data: FormData) {
  const step = Number(value(data, "step") || 2);
  try {
    const student = await editableStudent();
    const attachment = await prisma.attachment.findFirstOrThrow({
      where: { id: BigInt(value(data, "id")), mahasiswaId: student.id },
    });
    await prisma.attachment.delete({ where: { id: attachment.id } });
    await unlink(path.join(process.cwd(), "public", attachment.filePath)).catch(() => undefined);
    await finish(step, "Berkas berhasil dihapus.");
  } catch (error) { await reject(step, error); }
}

export async function saveStep3(data: FormData) {
  try {
    const student = await editableStudent();
    const offeringId = BigInt(value(data, "offeringId"));
    const offering = await prisma.mataKuliahSemester.findUniqueOrThrow({
      where: { id: offeringId }, include: { mataKuliah: { include: { skema: true } } },
    });
    if (offering.mataKuliah.jurusanId !== student.user.jurusanId)
      throw new Error("Mata kuliah tidak sesuai dengan jurusan Anda.");
    const allowed = !student.user.skemaId || !offering.mataKuliah.skema.length ||
      offering.mataKuliah.skema.some((item) => item.skemaId === student.user.skemaId);
    if (!allowed) throw new Error("Mata kuliah tidak sesuai dengan skema Anda.");
    const score = Number(value(data, "nilaiAngka"));
    if (!Number.isFinite(score) || score < 0 || score > 100)
      throw new Error("Nilai angka harus berada pada rentang 0–100.");
    const grade = value(data, "nilaiHuruf").toUpperCase();
    if (!["A", "AB", "B", "BC", "C", "D", "E"].includes(grade))
      throw new Error("Nilai huruf tidak valid.");
    const duplicate = await prisma.mataKuliahPilihan.findFirst({
      where: { mahasiswaId: student.id, mataKuliahSemesterId: offeringId },
    });
    if (duplicate) throw new Error("Mata kuliah ini sudah dipilih.");
    const selected = await prisma.mataKuliahPilihan.create({ data: {
      mahasiswaId: student.id, mataKuliahSemesterId: offering.id,
      kodeMk: offering.mataKuliah.kodeMk, namaMk: offering.mataKuliah.namaMk,
      sks: offering.mataKuliah.sks, nilaiAngka: score, nilaiHuruf: grade,
    }});
    const attachmentIds = data.getAll("attachmentIds").map(String).filter(Boolean).map(BigInt);
    const owned = await prisma.attachment.findMany({ where: { id: { in: attachmentIds }, mahasiswaId: student.id } });
    if (owned.length !== attachmentIds.length) throw new Error("Lampiran tidak valid.");
    if (attachmentIds.length) await prisma.mataKuliahAttachment.createMany({
      data: attachmentIds.map((attachmentId) => ({ mataKuliahPilihanId: selected.id, attachmentId })),
    });
    await finish(3, "Mata kuliah pilihan berhasil ditambahkan.");
  } catch (error) { await reject(3, error); }
}

export async function deleteSelectedCourse(data: FormData) {
  try {
    const student = await editableStudent();
    const row = await prisma.mataKuliahPilihan.findFirstOrThrow({
      where: { id: BigInt(value(data, "id")), mahasiswaId: student.id },
    });
    await prisma.mataKuliahPilihan.delete({ where: { id: row.id } });
    await finish(3, "Mata kuliah pilihan berhasil dihapus.");
  } catch (error) { await reject(3, error); }
}

export async function uploadStep4(data: FormData) {
  try {
    const student = await editableStudent();
    for (const label of ["cv", "pernyataan"] as const) {
      const file = data.get(label);
      if (!(file instanceof File) || !file.size) continue;
      const old = await prisma.attachment.findFirst({ where: { mahasiswaId: student.id, label } });
      if (old) {
        await prisma.attachment.delete({ where: { id: old.id } });
        await unlink(path.join(process.cwd(), "public", old.filePath)).catch(() => undefined);
      }
      await storePdf(student.id, file, label);
    }
    await finish(4, "CV dan surat pernyataan berhasil diperbarui.");
  } catch (error) { await reject(4, error); }
}

export async function saveStep5(data: FormData) {
  try {
    const student = await editableStudent();
    const courses = await prisma.mataKuliahPilihan.findMany({
      where: { mahasiswaId: student.id },
      include: { mataKuliahSemester: { include: { capaian: true } } },
    });
    const operations = courses.flatMap((course) =>
      (course.mataKuliahSemester?.capaian ?? []).map((cp) => {
        const raw = value(data, `cp_${course.id}_${cp.id}`);
        if (!raw) throw new Error("Semua indikator CPMK wajib dijawab.");
        return prisma.cpLevelKompetensi.upsert({
          where: { mataKuliahPilihanId_cpMataKuliahId: { mataKuliahPilihanId: course.id, cpMataKuliahId: cp.id } },
          update: { levelKompetensi: raw === "1" },
          create: { mataKuliahPilihanId: course.id, cpMataKuliahId: cp.id, levelKompetensi: raw === "1" },
        });
      }),
    );
    if (!operations.length) throw new Error("Belum ada CPMK yang dapat dinilai.");
    await prisma.$transaction(operations);
    await finish(5, "Asesmen mandiri berhasil disimpan.");
  } catch (error) { await reject(5, error); }
}

export async function saveStep6(data: FormData) {
  try {
    const student = await editableStudent();
    const courses = await prisma.mataKuliahPilihan.findMany({ where: { mahasiswaId: student.id } });
    await prisma.$transaction(async (tx) => {
      for (const course of courses) {
        const code = value(data, `code_${course.id}`);
        const name = value(data, `name_${course.id}`);
        const items = data.getAll(`cpmk_${course.id}`).map(String).map((item) => item.trim()).filter(Boolean);
        if (!code || !name || !items.length)
          throw new Error(`Data transfer untuk ${course.kodeMk ?? "mata kuliah"} belum lengkap.`);
        const existing = await tx.transferSks.findFirst({ where: { mataKuliahPilihanId: course.id }, orderBy: { id: "asc" } });
        const transfer = existing
          ? await tx.transferSks.update({ where: { id: existing.id }, data: { kodeMkAsal: code, namaMkAsal: name } })
          : await tx.transferSks.create({ data: { mataKuliahPilihanId: course.id, kodeMkAsal: code, namaMkAsal: name } });
        await tx.transferSksCpmk.deleteMany({ where: { transferSksId: transfer.id } });
        await tx.transferSksCpmk.createMany({ data: items.map((cpmk) => ({ transferSksId: transfer.id, cpmk })) });
      }
    });
    await finish(6, "Data transfer SKS berhasil disimpan.");
  } catch (error) { await reject(6, error); }
}

export async function finalizeStudent(data: FormData) {
  try {
    const student = await editableStudent();
    if (value(data, "confirmation") !== "yes")
      throw new Error("Konfirmasi penguncian wajib disetujui.");
    const completion = await formCompletion(student.id);
    const incomplete = firstIncomplete(completion);
    if (incomplete) throw new Error(`Formulir ${incomplete} belum lengkap.`);
    await prisma.mahasiswa.update({ where: { id: student.id }, data: { isEditable: false } });
    await finish(1, "Data berhasil dikirim dan dikunci permanen.");
  } catch (error) { await reject(6, error); }
}
