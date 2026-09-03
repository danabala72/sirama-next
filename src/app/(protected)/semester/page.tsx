import {
  EmptyRow,
  Notice,
  PageHeader,
  buttonClass,
  dangerClass,
  inputClass,
} from "@/components/admin-ui";
import { FormModal } from "@/components/form-modal";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteSemester,
  copySemesterOfferings,
  saveSemester,
  setActiveSemester,
} from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireUser(["Admin"]);
  const { notice } = await searchParams;
  const rows = await prisma.semester.findMany({
    include: { _count: { select: { mataKuliah: true } } },
    orderBy: { id: "desc" },
  });
  return (
    <>
      <PageHeader
        title="Semester"
        description="Hanya satu semester global yang aktif pada satu waktu."
      />
      <Notice text={notice} />
      <div className="flex justify-end">
        <FormModal modalId="semester-form" title="Tambah Semester" triggerLabel="Tambah Semester">
          <form action={saveSemester} className="grid gap-3 md:grid-cols-3">
            <input
              name="kode"
              placeholder="Kode (contoh: 2026-Ganjil)"
              className={inputClass}
              required
            />
            <input
              name="label"
              placeholder="Label semester"
              className={inputClass}
              required
            />
            <button className={buttonClass}>Tambah Semester</button>
          </form>
        </FormModal>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Kode</th>
              <th className="p-3">Label</th>
              <th className="p-3">MK</th>
              <th className="p-3">Status/Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id.toString()} className="border-t">
                <td className="p-3 font-semibold">{r.kode}</td>
                <td className="p-3">{r.label}</td>
                <td className="p-3">{r._count.mataKuliah}</td>
                <td className="flex gap-2 p-3">
                  {r.isActive ? (
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                      Aktif
                    </span>
                  ) : (
                    <>
                      <form action={setActiveSemester}>
                        <input
                          type="hidden"
                          name="id"
                          value={r.id.toString()}
                        />
                        <button className={buttonClass}>Aktifkan</button>
                      </form>
                      <form action={copySemesterOfferings}>
                        <input
                          type="hidden"
                          name="id"
                          value={r.id.toString()}
                        />
                        <button className={buttonClass}>Salin MK aktif</button>
                      </form>
                      <form action={deleteSemester}>
                        <input
                          type="hidden"
                          name="id"
                          value={r.id.toString()}
                        />
                        <button className={dangerClass}>Hapus aman</button>
                      </form>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <EmptyRow colSpan={4} />}
          </tbody>
        </table>
      </div>
    </>
  );
}
