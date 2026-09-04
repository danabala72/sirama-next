import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const FORM_TITLES = [
  "Rincian Data Peserta",
  "Upload File Pendukung",
  "Pengisian Mata Kuliah",
  "Daftar Riwayat Hidup",
  "Asesmen Mandiri",
  "Transfer SKS Pendidikan Formal",
] as const;

export async function requireStudent() {
  const session = await requireUser(["Mahasiswa"]);
  const student = await prisma.mahasiswa.findUnique({
    where: { userId: BigInt(session.userId) },
    include: { user: { include: { jurusan: true, skema: true } } },
  });
  if (!student) redirect("/forbidden");
  return { session, student };
}

function filled(value: string | null | undefined) {
  const normalized = value?.trim();
  return Boolean(normalized && normalized !== "-");
}

export async function formCompletion(studentId: bigint) {
  const student = await prisma.mahasiswa.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      attachments: true,
      mataKuliahPilihan: {
        include: {
          cpLevels: true,
          mataKuliahSemester: { include: { capaian: true } },
          transferSks: { include: { cpmkItems: true } },
        },
      },
    },
  });
  const step1 = [
    student.name,
    student.tempatLahir,
    student.kebangsaan,
    student.alamatRumah,
    student.kodePos,
    student.noHp,
    student.alamatKantor,
    student.email,
  ].every(filled);
  const step2 = student.attachments.some(
    (item) => !["cv", "pernyataan"].includes(item.label),
  );
  const step3 = student.mataKuliahPilihan.length > 0;
  const step4 = ["cv", "pernyataan"].every((label) =>
    student.attachments.some((item) => item.label === label),
  );
  const requiredCps = student.mataKuliahPilihan.reduce(
    (sum, item) => sum + (item.mataKuliahSemester?.capaian.length ?? 0),
    0,
  );
  const completedCps = student.mataKuliahPilihan.reduce(
    (sum, item) => sum + item.cpLevels.filter((cp) => cp.levelKompetensi !== null).length,
    0,
  );
  const step5 = requiredCps > 0 && completedCps >= requiredCps;
  const step6 =
    student.mataKuliahPilihan.length > 0 &&
    student.mataKuliahPilihan.every((item) => {
      const transfer = item.transferSks[0];
      return Boolean(
        transfer?.kodeMkAsal.trim() &&
          transfer.namaMkAsal.trim() &&
          transfer.cpmkItems.length,
      );
    });
  return [step1, step2, step3, step4, step5, step6];
}

export function firstIncomplete(completion: readonly boolean[]) {
  const index = completion.findIndex((value) => !value);
  return index === -1 ? null : index + 1;
}
