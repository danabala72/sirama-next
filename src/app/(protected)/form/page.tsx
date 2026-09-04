import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyRow, PageHeader, buttonClass, dangerClass, inputClass } from "@/components/admin-ui";
import { FinalizeStudentForm } from "@/components/finalize-student-form";
import { DynamicCpmkFields } from "@/components/dynamic-cpmk-fields";
import { prisma } from "@/lib/prisma";
import { FORM_TITLES, firstIncomplete, formCompletion, requireStudent } from "@/lib/student-form";
import { 
  deleteAttachment,
  deleteSelectedCourse,
  saveStep1,
  saveStep3,
  saveStep5,
  saveStep6,
  uploadStep2,
  uploadStep4,
} from "./form-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const labels: Record<string, string> = {
  ijazah: "Ijazah", transkrip: "Transkrip nilai", sertifikat: "Sertifikat",
  pengalaman: "Bukti pengalaman", lainnya: "Dokumen lainnya", cv: "CV", pernyataan: "Surat pernyataan",
};

function Field({ label, name, value, type = "text", required = false }: {
  label: string; name: string; value?: string | number | null; type?: string; required?: boolean;
}) {
  return <label className="grid gap-1 text-sm"><span className="font-semibold">{label}{required ? " *" : ""}</span>
    <input className={inputClass} type={type} name={name} defaultValue={value ?? ""} required={required} /></label>;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { student } = await requireStudent();
  const requested = Number((await searchParams).step ?? 1);
  const step = Number.isInteger(requested) && requested >= 1 && requested <= 6 ? requested : 1;
  const completion = await formCompletion(student.id);
  const incomplete = firstIncomplete(completion);
  if (student.isEditable && incomplete && step > incomplete) redirect(`/form?step=${incomplete}`);

  const [attachments, courses, offerings] = await Promise.all([
    prisma.attachment.findMany({ where: { mahasiswaId: student.id }, orderBy: { id: "desc" } }),
    prisma.mataKuliahPilihan.findMany({
      where: { mahasiswaId: student.id },
      include: {
        mataKuliahSemester: { include: { semester: true, mataKuliah: true, capaian: true } },
        attachments: { include: { attachment: true } },
        cpLevels: true,
        transferSks: { include: { cpmkItems: true }, orderBy: { id: "asc" } },
      }, orderBy: { id: "asc" },
    }),
    prisma.mataKuliahSemester.findMany({
      where: {
        semester: { isActive: true },
        pilihan: { none: { mahasiswaId: student.id } },
        mataKuliah: {
          status: true,
          ...(student.user.skemaId
            ? { jurusanId: student.user.jurusanId!, skema: { some: { skemaId: student.user.skemaId } } }
            : { jurusanId: student.user.jurusanId!, skema: { none: {} } }),
        },
      }, include: { semester: true, mataKuliah: true }, orderBy: [{ semesterId: "desc" }, { mataKuliah: { kodeMk: "asc" } }],
    }),
  ]);
  const locked = !student.isEditable;

  return <>
    <PageHeader title={`Formulir ${step} — ${FORM_TITLES[step - 1]}`} description={locked ? "Data sudah dikirim dan dikunci." : "Simpan langkah aktif sebelum melanjutkan ke formulir berikutnya."} />
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="Tahapan formulir">
      {FORM_TITLES.map((title, index) => {
        const number = index + 1;
        const accessible = locked || !incomplete || number <= incomplete;
        return accessible
          ? <Link key={title} href={`/form?step=${number}`} className={`${number === step ? buttonClass : "rounded-md border px-3 py-2 text-sm"}`}>{number}. {completion[index] ? "✓" : title}</Link>
          : <span key={title} className="cursor-not-allowed rounded-md border bg-slate-100 px-3 py-2 text-sm text-slate-400" title={`Selesaikan Formulir ${incomplete}`}>{number}. Terkunci</span>;
      })}
    </nav>
    {locked && <div className="mb-5 rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Pengajuan telah dikirim. Semua data hanya dapat dilihat.</div>}

    {step === 1 && <form action={saveStep1} className="grid gap-4 rounded-lg border bg-white p-5 md:grid-cols-2">
      <Field label="Nama lengkap" name="name" value={student.name} required />
      <Field label="Tempat lahir" name="tempatLahir" value={student.tempatLahir} required />
      <Field label="Tanggal lahir" name="tanggalLahir" type="date" value={student.tanggalLahir.toISOString().slice(0, 10)} required />
      <label className="grid gap-1 text-sm"><span className="font-semibold">Jenis kelamin *</span><select className={inputClass} name="jenisKelamin" defaultValue={student.jenisKelamin} required><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></label>
      <label className="grid gap-1 text-sm"><span className="font-semibold">Status perkawinan *</span><select className={inputClass} name="statusPerkawinan" defaultValue={student.statusPerkawinan} required><option value="BelumKawin">Belum Kawin</option><option value="Kawin">Kawin</option></select></label>
      <Field label="Kebangsaan" name="kebangsaan" value={student.kebangsaan} required />
      <Field label="Alamat rumah" name="alamatRumah" value={student.alamatRumah} required />
      <Field label="Kode pos" name="kodePos" value={student.kodePos} required />
      <Field label="Nomor HP" name="noHp" value={student.noHp} required />
      <Field label="Alamat kantor" name="alamatKantor" value={student.alamatKantor} required />
      <Field label="Email" name="email" type="email" value={student.email} required />
      <div className="md:col-span-2 border-t pt-3 font-semibold">Pendidikan</div>
      <Field label="Nama sekolah" name="namaSekolah" value={student.namaSekolah} />
      <Field label="Alamat sekolah" name="alamatSekolah" value={student.alamatSekolah} />
      <Field label="Tahun lulus sekolah" name="tahunLulusSekolah" type="number" value={student.tahunLulusSekolah} />
      <Field label="Nama perguruan tinggi" name="namaPt" value={student.namaPt} />
      <Field label="Program studi" name="prodiPt" value={student.prodiPt} />
      <Field label="Program pendidikan" name="programPt" value={student.programPt} />
      <Field label="Tahun lulus PT" name="tahunLulusPt" type="number" value={student.tahunLulusPt} />
      {!locked && <button className={buttonClass}>Simpan Formulir 1</button>}
    </form>}

    {step === 2 && <div className="grid gap-5">
      {!locked && <form action={uploadStep2} className="grid gap-3 rounded-lg border bg-white p-5 md:grid-cols-3">
        <select className={inputClass} name="label" required defaultValue=""><option value="" disabled>Pilih kategori</option>{Object.entries(labels).filter(([key]) => !["cv", "pernyataan"].includes(key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <input className={inputClass} type="file" name="files" accept="application/pdf" multiple required />
        <button className={buttonClass}>Upload PDF</button>
      </form>}
      <AttachmentTable attachments={attachments.filter((item) => !["cv", "pernyataan"].includes(item.label))} step={2} locked={locked} />
    </div>}

    {step === 3 && <div className="grid gap-5">
      {!locked && <form action={saveStep3} className="grid gap-3 rounded-lg border bg-white p-5 md:grid-cols-2">
        <label className="grid gap-1 text-sm md:col-span-2"><span className="font-semibold">Mata kuliah dan semester *</span><select className={inputClass} name="offeringId" required defaultValue=""><option value="" disabled>Pilih mata kuliah</option>{offerings.map((item) => <option key={item.id.toString()} value={item.id.toString()}>{item.semester.label} — {item.mataKuliah.kodeMk} {item.mataKuliah.namaMk}</option>)}</select></label>
        <Field label="Nilai angka" name="nilaiAngka" type="number" required />
        <label className="grid gap-1 text-sm"><span className="font-semibold">Nilai huruf *</span><select className={inputClass} name="nilaiHuruf" required defaultValue=""><option value="" disabled>Pilih</option>{["A","AB","B","BC","C","D","E"].map((grade) => <option key={grade}>{grade}</option>)}</select></label>
        <fieldset className="md:col-span-2"><legend className="mb-2 text-sm font-semibold">Lampiran bukti</legend>{attachments.filter((item) => !["cv", "pernyataan"].includes(item.label)).map((item) => <label key={item.id.toString()} className="mr-4 text-sm"><input type="checkbox" name="attachmentIds" value={item.id.toString()} /> {item.fileName}</label>)}</fieldset>
        <button className={buttonClass}>Tambah Mata Kuliah</button>
      </form>}
      <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Mata kuliah</th><th className="p-3">Semester</th><th className="p-3">Nilai</th><th className="p-3">Aksi</th></tr></thead><tbody>{courses.map((course) => <tr className="border-t" key={course.id.toString()}><td className="p-3"><b>{course.kodeMk}</b> {course.namaMk}</td><td className="p-3">{course.mataKuliahSemester?.semester.label ?? "Historis"}</td><td className="p-3">{course.nilaiAngka?.toString()} / {course.nilaiHuruf}</td><td className="p-3">{!locked && <form action={deleteSelectedCourse}><input type="hidden" name="id" value={course.id.toString()} /><button className={dangerClass}>Hapus</button></form>}</td></tr>)}{!courses.length && <EmptyRow colSpan={4} />}</tbody></table></div>
    </div>}

    {step === 4 && <div className="grid gap-5">
      {!locked && <form action={uploadStep4} className="grid gap-4 rounded-lg border bg-white p-5 md:grid-cols-2"><label className="grid gap-1 text-sm"><span className="font-semibold">CV (PDF) *</span><input className={inputClass} type="file" name="cv" accept="application/pdf" /></label><label className="grid gap-1 text-sm"><span className="font-semibold">Surat pernyataan (PDF) *</span><input className={inputClass} type="file" name="pernyataan" accept="application/pdf" /></label><button className={buttonClass}>Simpan Berkas</button></form>}
      <AttachmentTable attachments={attachments.filter((item) => ["cv", "pernyataan"].includes(item.label))} step={4} locked={locked} />
    </div>}

    {step === 5 && <form action={saveStep5} className="grid gap-4">{courses.map((course) => <section key={course.id.toString()} className="rounded-lg border bg-white p-5"><h2 className="font-bold">{course.kodeMk} — {course.namaMk}</h2>{course.mataKuliahSemester?.capaian.map((cp, index) => { const current = course.cpLevels.find((row) => row.cpMataKuliahId === cp.id)?.levelKompetensi; return <fieldset key={cp.id.toString()} className="mt-3 border-t pt-3" disabled={locked}><legend className="text-sm font-semibold">{index + 1}. {cp.indikatorCapaian}</legend><label className="mr-4 text-sm"><input type="radio" name={`cp_${course.id}_${cp.id}`} value="1" defaultChecked={current === true} required /> Mampu</label><label className="text-sm"><input type="radio" name={`cp_${course.id}_${cp.id}`} value="0" defaultChecked={current === false} required /> Belum mampu</label></fieldset>; })}</section>)}{!courses.length && <div className="rounded-lg bg-amber-50 p-4 text-amber-900">Belum ada mata kuliah pilihan.</div>}{!locked && courses.length > 0 && <button className={buttonClass}>Simpan Asesmen Mandiri</button>}</form>}

    {step === 6 && <div className="grid gap-5"><form action={saveStep6} className="grid gap-4">{courses.map((course) => { const transfer = course.transferSks[0]; return <section key={course.id.toString()} className="grid gap-3 rounded-lg border bg-white p-5 md:grid-cols-2"><h2 className="font-bold md:col-span-2">{course.kodeMk} — {course.namaMk}</h2><Field label="Kode MK asal" name={`code_${course.id}`} value={transfer?.kodeMkAsal ?? course.kodeMk} required /><Field label="Nama MK asal" name={`name_${course.id}`} value={transfer?.namaMkAsal ?? course.namaMk} required /><div className="md:col-span-2"><div className="mb-2 text-sm font-semibold">CPMK mata kuliah asal *</div><DynamicCpmkFields disabled={locked} name={`cpmk_${course.id}`} initialValues={transfer?.cpmkItems.map((item) => item.cpmk) ?? course.mataKuliahSemester?.capaian.map((item) => item.indikatorCapaian) ?? []} /></div></section>; })}{!locked && courses.length > 0 && <button className={buttonClass}>Simpan Transfer SKS</button>}</form>{!locked && <FinalizeStudentForm enabled={completion.every(Boolean)} />}</div>}
  </>;
}

function AttachmentTable({ attachments, step, locked }: { attachments: Array<{ id: bigint; label: string; fileName: string; fileSize: bigint }>; step: number; locked: boolean }) {
  return <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Kategori</th><th className="p-3">Nama berkas</th><th className="p-3">Ukuran</th><th className="p-3">Aksi</th></tr></thead><tbody>{attachments.map((item) => <tr className="border-t" key={item.id.toString()}><td className="p-3">{labels[item.label] ?? item.label}</td><td className="p-3">{item.fileName}</td><td className="p-3">{(Number(item.fileSize) / 1024 / 1024).toFixed(2)} MB</td><td className="p-3">{!locked && <form action={deleteAttachment}><input type="hidden" name="id" value={item.id.toString()} /><input type="hidden" name="step" value={step} /><button className={dangerClass}>Hapus</button></form>}</td></tr>)}{!attachments.length && <EmptyRow colSpan={4} />}</tbody></table></div>;
}


