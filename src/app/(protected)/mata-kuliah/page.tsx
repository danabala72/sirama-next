import {
  EmptyRow,
  Notice,
  PageHeader,
  buttonClass,
  dangerClass,
  inputClass,
} from "@/components/admin-ui";
import { FormModal, ModalEditButton } from "@/components/form-modal";
import { requireManager } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";
import { deactivateMataKuliah, saveMataKuliah } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const a = await requireManager(),
    { notice } = await searchParams,
    where =
      a.role === "AdminJurusan" ? { jurusanId: a.jurusanIdBigInt! } : undefined;
  const [rows, jurusan, semester, skema] = await Promise.all([
    prisma.mataKuliah.findMany({
      where,
      include: {
        jurusan: true,
        semester: { include: { semester: true } },
        skema: { include: { skema: true } },
      },
      orderBy: { kodeMk: "asc" },
    }),
    prisma.jurusan.findMany({
      where: a.role === "AdminJurusan" ? { id: a.jurusanIdBigInt! } : undefined,
    }),
    prisma.semester.findMany({ orderBy: { id: "desc" } }),
    prisma.skema.findMany({
      where,
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
      <div className="flex justify-end">
        <FormModal
          modalId="mata-kuliah-form"
          title="Tambah Mata Kuliah"
          triggerLabel="Tambah Mata Kuliah"
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
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Kode/Nama</th>
              <th className="p-3">Jurusan</th>
              <th className="p-3">SKS</th>
              <th className="p-3">Semester/Skema</th>
              <th className="p-3">Status</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
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
                  <div className="flex gap-2">
                    <ModalEditButton
                      modalId="mata-kuliah-form"
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
                    {r.status && (
                      <form action={deactivateMataKuliah}>
                        <input
                          type="hidden"
                          name="id"
                          value={r.id.toString()}
                        />
                        <button className={dangerClass}>Nonaktifkan</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <EmptyRow colSpan={6} />}
          </tbody>
        </table>
      </div>
    </>
  );
}
