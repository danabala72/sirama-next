import {
  EmptyRow,
  Notice,
  Pagination,
  PageHeader,
  SearchBox,
  buttonClass,
  inputClass,
  readListParams,
} from "@/components/admin-ui";
import { CpmkManagerModal } from "@/components/cpmk-manager-modal";
import { FormModal, ModalEditButton } from "@/components/form-modal";
import { StatusToggleButton } from "@/components/status-toggle-button";
import { TemplateImportForm } from "@/components/template-import-form";
import { requireManager } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";
import {
  deleteCpmkInline,
  getCpmkItems,
  saveCpmkInline,
  saveMataKuliah,
  toggleMataKuliahStatus,
} from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; q?: string; page?: string; perPage?: string }>;
}) {
  const a = await requireManager(),
    params = await searchParams,
    { notice } = params,
    { q, page, perPage, skip, take } = readListParams(params),
    where = {
      ...(a.role === "AdminJurusan" ? { jurusanId: a.jurusanIdBigInt! } : {}),
      ...(q
        ? {
            OR: [
              { kodeMk: { contains: q } },
              { namaMk: { contains: q } },
              { jurusan: { namaJurusan: { contains: q } } },
              { semester: { some: { semester: { kode: { contains: q } } } } },
              { semester: { some: { semester: { label: { contains: q } } } } },
              { skema: { some: { skema: { namaSkema: { contains: q } } } } },
            ],
          }
        : {}),
    };
  const [rows, total, jurusan, semester, skema] = await Promise.all([
    prisma.mataKuliah.findMany({
      where,
      include: {
        jurusan: true,
        semester: { include: { semester: true, capaian: { orderBy: { id: "asc" } } } },
        skema: { include: { skema: true } },
      },
      orderBy: { kodeMk: "asc" },
      skip,
      take,
    }),
    prisma.mataKuliah.count({ where }),
    prisma.jurusan.findMany({
      where: a.role === "AdminJurusan" ? { id: a.jurusanIdBigInt! } : undefined,
    }),
    prisma.semester.findMany({ orderBy: { id: "desc" } }),
    prisma.skema.findMany({
      where: a.role === "AdminJurusan" ? { jurusanId: a.jurusanIdBigInt! } : undefined,
      orderBy: { namaSkema: "asc" },
    }),
  ]);
  return (
    <>
      <PageHeader
        title="Mata Kuliah"
        description="Pilih semester penawaran untuk setiap mata kuliah. Riwayat yang sudah dipakai tidak dapat dihapus."
      />
      <Notice text={notice} />
      <div className="mb-3 grid gap-2 sm:flex sm:justify-end">
        <FormModal
          modalId="mata-kuliah-import"
          title="Import Mata Kuliah"
          triggerLabel="Import Mata Kuliah"
          dialogClassName="max-w-xl"
          triggerClassName="w-full sm:w-auto"
        >
          <TemplateImportForm
            name="mata-kuliah"
            title="Import Mata Kuliah"
            description="Gunakan kode jurusan, kode semester, dan nama skema sesuai data master."
          />
        </FormModal>
        <FormModal
          modalId="mata-kuliah-form"
          title="Tambah Mata Kuliah"
          triggerLabel="Tambah Mata Kuliah"
          triggerClassName="w-full sm:w-auto"
        >
          <form action={saveMataKuliah} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="id" value="" />
            <select name="jurusanId" className={inputClass}>
              {jurusan.map((j) => (
                <option key={j.id.toString()} value={j.id.toString()}>
                  {j.namaJurusan}
                </option>
              ))}
            </select>
            <input
              name="kodeMk"
              placeholder="Kode MK"
              className={inputClass}
              required
            />
            <input
              name="namaMk"
              placeholder="Nama mata kuliah"
              className={inputClass}
              required
            />
            <input
              type="number"
              min="1"
              name="sks"
              placeholder="SKS"
              className={inputClass}
              required
            />
            <input
              type="number"
              name="nilaiMinimum"
              placeholder="Nilai minimum"
              className={inputClass}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="status" defaultChecked /> Aktif
            </label>
            <fieldset>
              <legend className="mb-1 text-xs font-semibold">
                Ditawarkan pada semester
              </legend>
              {semester.map((x) => (
                <label key={x.id.toString()} className="mr-3 text-sm">
                  <input
                    type="checkbox"
                    name="semesterIds"
                    value={x.id.toString()}
                  />{" "}
                  {x.label}
                  {x.isActive ? " (aktif)" : ""}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-xs font-semibold">Skema</legend>
              {skema.map((x) => (
                <label key={x.id.toString()} className="mr-3 text-sm">
                  <input
                    type="checkbox"
                    name="skemaIds"
                    value={x.id.toString()}
                  />{" "}
                  {x.namaSkema}
                </label>
              ))}
            </fieldset>
            <button className={buttonClass}>Simpan Mata Kuliah</button>
          </form>
        </FormModal>
      </div>
      <SearchBox q={q} perPage={perPage} placeholder="Cari kode, nama MK, jurusan, semester, atau skema..." />
      <div className="mt-4 grid gap-3 md:hidden">
        {rows.map((r) => {
          const activeOffering = r.semester.find(
            (item) => item.semester.isActive,
          );

          return (
            <section key={r.id.toString()} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#285aae]">{r.kodeMk}</div>
                  <div className="mt-1 font-semibold text-slate-900">{r.namaMk}</div>
                </div>
                <span className={`shrink-0 rounded px-2 py-1 text-xs ${r.status ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {r.status ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Jurusan</dt>
                  <dd>{r.jurusan.namaJurusan}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">SKS</dt>
                  <dd>{r.sks}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Semester</dt>
                  <dd>{r.semester.map((x) => x.semester.label).join(", ") || "-"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Skema</dt>
                  <dd>{r.skema.map((x) => x.skema.namaSkema).join(", ") || "-"}</dd>
                </div>
              </dl>
              <div className="mt-3 grid gap-2">
                <StatusToggleButton
                  id={r.id.toString()}
                  active={r.status}
                  action={toggleMataKuliahStatus}
                />
                <ModalEditButton
                  modalId="mata-kuliah-form"
                  className="w-full"
                  values={{
                    id: r.id.toString(),
                    jurusanId: r.jurusanId.toString(),
                    kodeMk: r.kodeMk,
                    namaMk: r.namaMk,
                    sks: r.sks.toString(),
                    nilaiMinimum: r.nilaiMinimum?.toString() ?? "",
                    status: r.status,
                    semesterIds: r.semester.map((item) =>
                      item.semesterId.toString(),
                    ),
                    skemaIds: r.skema.map((item) => item.skemaId.toString()),
                  }}
                />
                <CpmkManagerModal
                  courseId={r.id.toString()}
                  kodeMk={r.kodeMk}
                  namaMk={r.namaMk}
                  activeOffering={
                    activeOffering
                      ? {
                          id: activeOffering.id.toString(),
                          label: activeOffering.semester.label,
                          capaian: activeOffering.capaian.map((item) => ({
                            id: item.id.toString(),
                            indikatorCapaian: item.indikatorCapaian,
                          })),
                        }
                      : undefined
                  }
                  history={r.semester
                    .filter(
                      (item) => !item.semester.isActive && item.capaian.length,
                    )
                    .map((offering) => ({
                      id: offering.id.toString(),
                      label: offering.semester.label,
                      capaian: offering.capaian.map((item) => ({
                        id: item.id.toString(),
                        indikatorCapaian: item.indikatorCapaian,
                      })),
                    }))}
                  saveAction={saveCpmkInline}
                  deleteAction={deleteCpmkInline}
                  reloadAction={getCpmkItems}
                />
              </div>
            </section>
          );
        })}
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
              <th className="p-3">Kode/Nama</th>
              <th className="p-3">Jurusan</th>
              <th className="p-3">SKS</th>
              <th className="p-3">Semester/Skema</th>
              <th className="p-3">Status</th>
              <th className="w-[332px] p-3 sm:w-[360px]">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const activeOffering = r.semester.find(
                (item) => item.semester.isActive,
              );

              return (
              <tr key={r.id.toString()} className="border-t">
                <td className="p-3">
                  <b>{r.kodeMk}</b>
                  <div>{r.namaMk}</div>
                </td>
                <td className="p-3">{r.jurusan.namaJurusan}</td>
                <td className="p-3">{r.sks}</td>
                <td className="p-3 text-xs">
                  {r.semester.map((x) => x.semester.label).join(", ") || "-"}
                  <br />
                  {r.skema.map((x) => x.skema.namaSkema).join(", ") || "-"}
                </td>
                <td className="p-3">{r.status ? "Aktif" : "Nonaktif"}</td>
                <td className="p-3">
                  <div className="grid min-w-[308px] grid-cols-[96px_64px_116px] items-center gap-2 sm:min-w-[340px] sm:grid-cols-[112px_72px_128px]">
                    <StatusToggleButton
                      id={r.id.toString()}
                      active={r.status}
                      action={toggleMataKuliahStatus}
                    />
                    <ModalEditButton
                      modalId="mata-kuliah-form"
                      className="w-full"
                      values={{
                        id: r.id.toString(),
                        jurusanId: r.jurusanId.toString(),
                        kodeMk: r.kodeMk,
                        namaMk: r.namaMk,
                        sks: r.sks.toString(),
                        nilaiMinimum: r.nilaiMinimum?.toString() ?? "",
                        status: r.status,
                        semesterIds: r.semester.map((item) =>
                          item.semesterId.toString(),
                        ),
                        skemaIds: r.skema.map((item) =>
                          item.skemaId.toString(),
                        ),
                      }}
                    />
                    <CpmkManagerModal
                      courseId={r.id.toString()}
                      kodeMk={r.kodeMk}
                      namaMk={r.namaMk}
                      activeOffering={
                        activeOffering
                          ? {
                              id: activeOffering.id.toString(),
                              label: activeOffering.semester.label,
                              capaian: activeOffering.capaian.map((item) => ({
                                id: item.id.toString(),
                                indikatorCapaian: item.indikatorCapaian,
                              })),
                            }
                          : undefined
                      }
                      history={r.semester
                        .filter(
                          (item) =>
                            !item.semester.isActive && item.capaian.length,
                        )
                        .map((offering) => ({
                          id: offering.id.toString(),
                          label: offering.semester.label,
                          capaian: offering.capaian.map((item) => ({
                            id: item.id.toString(),
                            indikatorCapaian: item.indikatorCapaian,
                          })),
                        }))}
                      saveAction={saveCpmkInline}
                      deleteAction={deleteCpmkInline}
                      reloadAction={getCpmkItems}
                    />
                  </div>
                </td>
              </tr>
              );
            })}
            {!rows.length && <EmptyRow colSpan={6} />}
          </tbody>
        </table>
      </div>
      <Pagination page={page} perPage={perPage} total={total} q={q} />
    </>
  );
}
