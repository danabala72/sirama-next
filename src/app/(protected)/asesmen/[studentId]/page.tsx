import Link from "next/link";
import { AlertTriangle, ArrowLeft, FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { Notice, buttonClass, inputClass } from "@/components/admin-ui";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAssessmentReview } from "@/lib/assessment/service";
import { saveAssessmentAction, saveCompetencyAction } from "../actions";

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const session = await requireUser(["Asesor"]);
  const { studentId } = await params;
  const { notice } = await searchParams;
  if (!/^\d+$/.test(studentId)) notFound();
  const assessor = await prisma.asesor.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { id: true, name: true },
  });
  if (!assessor) notFound();
  let review: Awaited<ReturnType<typeof getAssessmentReview>>;
  try {
    review = await getAssessmentReview(assessor.id, BigInt(studentId));
  } catch {
    notFound();
  }

  return <section className="space-y-4">
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <Link href="/asesmen" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#285aae]"><ArrowLeft size={16}/> Kembali</Link>
      <h1 className="text-2xl font-bold text-slate-900">Review Asesmen</h1>
      <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
        <span><b>Mahasiswa:</b> {review.student.name}</span>
        <span><b>NIM:</b> {review.student.nim ?? "-"}</span>
        <span><b>Jurusan:</b> {review.student.jurusan}</span>
        <span><b>Skema:</b> {review.student.skema}</span>
      </div>
    </div>
    <Notice text={notice}/>
    {!review.courses.length && <div className="rounded-lg border bg-white p-8 text-center text-slate-500">Mahasiswa belum memilih mata kuliah.</div>}
    {review.courses.map((course, index) => <details key={course.id} open={index === 0} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none bg-slate-50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><span className="text-xs font-semibold text-[#285aae]">{course.kode} · {course.semester}</span><h2 className="font-bold text-slate-900">{course.nama}</h2></div>
          <div className="flex gap-2 text-xs"><span className="rounded bg-slate-200 px-2 py-1">{course.sks ?? "-"} SKS</span>{course.formal?.score != null&&<span className="rounded bg-blue-100 px-2 py-1 text-blue-700">Formal {course.formal.score}</span>}{course.nonformal?.score != null&&<span className="rounded bg-emerald-100 px-2 py-1 text-emerald-700">Nonformal {course.nonformal.score}</span>}</div>
        </div>
      </summary>
      <div className="space-y-5 p-5">
        {course.hasConflict&&<div className="flex gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={18}/><span>Ada nilai berbeda pada record duplikat. Nilai canonical ditampilkan dan data lama tidak dihapus.</span></div>}
        <section><h3 className="mb-2 font-semibold">Bukti Mahasiswa</h3><div className="grid gap-2 sm:grid-cols-2">{course.attachments.map(file=><div key={file.id} className="flex items-center gap-2 rounded border p-3 text-sm"><FileText size={18} className="text-[#285aae]"/><span><b className="block">{file.label}</b><small className="text-slate-500">{file.fileName}</small></span></div>)}{!course.attachments.length&&<p className="text-sm text-slate-500">Tidak ada lampiran pada mata kuliah ini.</p>}</div></section>
        {!!course.cpmkAsal.length&&<section><h3 className="mb-2 font-semibold">CPMK Mata Kuliah Asal</h3><ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">{course.cpmkAsal.map((item,i)=><li key={i}>{item}</li>)}</ol></section>}
        {!!course.competencies.length&&<form action={saveCompetencyAction} className="overflow-x-auto"><input type="hidden" name="studentId" value={review.student.id}/><input type="hidden" name="courseId" value={course.id}/><h3 className="mb-2 font-semibold">Verifikasi CPMK</h3><table className="w-full min-w-[650px] text-sm"><thead className="bg-slate-50"><tr><th className="p-2 text-left">Indikator CPMK</th><th className="p-2">Klaim</th><th className="p-2">Valid</th><th className="p-2">Asli</th><th className="p-2">Terkini</th><th className="p-2">Memadai</th></tr></thead><tbody>{course.competencies.map(cp=><tr key={cp.id} className="border-t"><td className="p-2"><input type="hidden" name="cpLevelId" value={cp.id}/>{cp.indicator}</td><td className="p-2 text-center">{cp.claimed===true?"Ya":cp.claimed===false?"Tidak":"-"}</td>{(["valid","asli","terkini","memadai"] as const).map(key=><td key={key} className="p-2 text-center"><input type="checkbox" name={`${key}_${cp.id}`} defaultChecked={cp.verification?.[key]??false}/></td>)}</tr>)}</tbody></table><button className={`${buttonClass} mt-3`}>Simpan Verifikasi CPMK</button></form>}
        <div className="grid gap-4 xl:grid-cols-2"><AssessmentForm kind="formal" studentId={review.student.id} courseId={course.id} value={course.formal}/><AssessmentForm kind="nonformal" studentId={review.student.id} courseId={course.id} value={course.nonformal}/></div>
      </div>
    </details>)}
  </section>;
}

function AssessmentForm({kind,studentId,courseId,value}:{kind:"formal"|"nonformal";studentId:string;courseId:string;value:{score:number|null;gapAnalysis:string;assessorNote:string}|null}){
  const label=kind==="formal"?"Formal":"Nonformal";
  return <form action={saveAssessmentAction} className="space-y-3 rounded-lg border border-slate-200 p-4"><input type="hidden" name="studentId" value={studentId}/><input type="hidden" name="courseId" value={courseId}/><input type="hidden" name="kind" value={kind}/><h3 className="font-bold text-slate-900">Penilaian {label}</h3><label className="block text-sm font-medium">Analisis Kesenjangan<textarea name="gapAnalysis" defaultValue={value?.gapAnalysis} className={`${inputClass} mt-1 min-h-24`} required minLength={5}/></label><label className="block text-sm font-medium">Nilai (0–100)<input type="number" name="score" min="0" max="100" defaultValue={value?.score??""} className={`${inputClass} mt-1`} required/></label><label className="block text-sm font-medium">Catatan Asesor<textarea name="assessorNote" defaultValue={value?.assessorNote} className={`${inputClass} mt-1 min-h-24`} required minLength={5}/></label><button className={buttonClass}>Simpan Penilaian {label}</button></form>;
}
