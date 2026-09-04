"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  saveAssessment,
  saveCompetencyVerification,
  type AssessmentKind,
} from "@/lib/assessment/service";

async function assessorIdentity() {
  const session = await requireUser(["Asesor"]);
  const assessor = await prisma.asesor.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { id: true },
  });
  if (!assessor) throw new Error("Profil asesor tidak ditemukan.");
  return assessor.id;
}

function returnTo(studentId: string, message: string): never {
  revalidatePath(`/asesmen/${studentId}`);
  revalidatePath("/asesmen");
  redirect(`/asesmen/${studentId}?notice=${encodeURIComponent(message)}`);
}

export async function saveAssessmentAction(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  let message: string;
  try {
    const scoreText = String(formData.get("score") ?? "").trim();
    const gapAnalysis = String(formData.get("gapAnalysis") ?? "").trim();
    const assessorNote = String(formData.get("assessorNote") ?? "").trim();
    const kind = String(formData.get("kind")) as AssessmentKind;
    if (!studentId || !["formal", "nonformal"].includes(kind))
      throw new Error("Permintaan asesmen tidak valid.");
    if (scoreText === "") throw new Error("Nilai wajib diisi.");
    if (gapAnalysis.length < 5)
      throw new Error("Analisis kesenjangan minimal 5 karakter.");
    await saveAssessment({
      assessorId: await assessorIdentity(),
      studentId: BigInt(studentId),
      selectedCourseId: BigInt(String(formData.get("courseId"))),
      kind,
      score: Number(scoreText),
      gapAnalysis,
      assessorNote,
    });
    message = `Penilaian ${kind} berhasil disimpan.`;
  } catch (error) {
    message = `Error: ${error instanceof Error ? error.message : "Penilaian gagal disimpan."}`;
  }
  returnTo(studentId || "0", message);
}

export async function saveCompetencyAction(formData: FormData) {
  const studentId = String(formData.get("studentId") ?? "");
  let message: string;
  try {
    const ids = formData.getAll("cpLevelId").map(String);
    await saveCompetencyVerification({
      assessorId: await assessorIdentity(),
      studentId: BigInt(studentId),
      selectedCourseId: BigInt(String(formData.get("courseId"))),
      items: ids.map((value) => ({
        cpLevelId: BigInt(value),
        valid: formData.get(`valid_${value}`) === "on",
        asli: formData.get(`asli_${value}`) === "on",
        terkini: formData.get(`terkini_${value}`) === "on",
        memadai: formData.get(`memadai_${value}`) === "on",
      })),
    });
    message = "Verifikasi CPMK berhasil disimpan.";
  } catch (error) {
    message = `Error: ${error instanceof Error ? error.message : "Verifikasi CPMK gagal."}`;
  }
  returnTo(studentId || "0", message);
}
