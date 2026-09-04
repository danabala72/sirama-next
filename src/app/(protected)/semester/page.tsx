import {
  EmptyRow,
  Notice,
  Pagination,
  PageHeader,
  SearchBox,
  buttonClass,
  dangerClass,
  inputClass,
  readListParams,
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
  searchParams: Promise<{ notice?: string; q?: string; page?: string; perPage?: string }>;
}) {
  await requireUser(["Admin"]);
  const params = await searchParams;
  const { notice } = params;
  const { q, page, perPage, skip, take } = readListParams(params);
  const where = q
    ? { OR: [{ kode: { contains: q } }, { label: { contains: q } }] }
    : {};
  const [rows, total] = await Promise.all([
    prisma.semester.findMany({
      where,
      include: { _count: { select: { mataKuliah: true } } },
      orderBy: { id: "desc" },
      skip,
      take,
    }),
    prisma.semester.count({ where }),
  ]);
  return (
    <>
      <PageHeader
        title="Semester"
        description="Hanya satu semester global yang aktif pada satu waktu."
      />
      <Notice text={notice} />
      <div className="mb-3 grid gap-2 sm:flex sm:justify-end">
        <FormModal modalId="semester-form" title="Tambah Semester" triggerLabel="Tambah Semester" triggerClassName="w-full sm:w-auto">
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
      <SearchBox q={q} perPage={perPage} placeholder="Cari kode atau label semester..." />
      <div className="mt-4 grid gap-3 md:hidden">
        {rows.map((r) => (
          <section key={r.id.toString()} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-semibold text-slate-900">{r.kode}</div>
            <div className="mt-1 text-sm text-slate-600">{r.label}</div>
            <div className="mt-3 text-sm">
              <span className="text-xs text-slate-500">Mata kuliah</span>
              <div>{r._count.mataKuliah}</div>
            </div>
            <div className="mt-3">
              {r.isActive ? (
                <span className="inline-flex rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                  Aktif
                </span>
              ) : (
                <div className="grid gap-2">
                  <form action={setActiveSemester}>
                    <input type="hidden" name="id" value={r.id.toString()} />
                    <button className={`${buttonClass} w-full`}>Aktifkan</button>
                  </form>
                  <form action={copySemesterOfferings}>
                    <input type="hidden" name="id" value={r.id.toString()} />
                    <button className={`${buttonClass} w-full`}>Salin MK aktif</button>
                  </form>
                  <form action={deleteSemester}>
                    <input type="hidden" name="id" value={r.id.toString()} />
                    <button className={`${dangerClass} w-full`}>Hapus</button>
                  </form>
                </div>
              )}
            </div>
          </section>
        ))}
        {!rows.length && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Belum ada data.
          </div>
        )}
      </div>
      <div className="mt-4 hidden overflow-x-auto rounded-lg border bg-white md:block">
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
                <td className="p-3">
                  {r.isActive ? (
                    <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                      Aktif
                    </span>
                  ) : (
                    <div className="grid gap-2 sm:flex">
                      <form action={setActiveSemester}>
                        <input
                          type="hidden"
                          name="id"
                          value={r.id.toString()}
                        />
                        <button className={`${buttonClass} w-full sm:w-auto`}>Aktifkan</button>
                      </form>
                      <form action={copySemesterOfferings}>
                        <input
                          type="hidden"
                          name="id"
                          value={r.id.toString()}
                        />
                        <button className={`${buttonClass} w-full sm:w-auto`}>Salin MK aktif</button>
                      </form>
                      <form action={deleteSemester}>
                        <input
                          type="hidden"
                          name="id"
                          value={r.id.toString()}
                        />
                        <button className={`${dangerClass} w-full sm:w-auto`}>Hapus</button>
                      </form>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && <EmptyRow colSpan={4} />}
          </tbody>
        </table>
      </div>
      <Pagination page={page} perPage={perPage} total={total} q={q} />
    </>
  );
}
