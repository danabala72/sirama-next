import Link from "next/link";
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
import { TemplateImportForm } from "@/components/template-import-form";
import { requireManager } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";
import { deleteJurusan, saveJurusan } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; edit?: string; q?: string; page?: string; perPage?: string }>;
}) {
  const a = await requireManager();
  const params = await searchParams;
  const { notice, edit } = params;
  const { q, page, perPage, skip, take } = readListParams(params);
  const where = {
    ...(a.role === "AdminJurusan" ? { id: a.jurusanIdBigInt! } : {}),
    ...(q
      ? {
          OR: [
            { kodeJurusan: { contains: q } },
            { namaJurusan: { contains: q } },
            { ketuaJurusan: { contains: q } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.jurusan.findMany({
      where,
      orderBy: { kodeJurusan: "asc" },
      skip,
      take,
    }),
    prisma.jurusan.count({ where }),
  ]);
  const current = edit ? rows.find((x) => x.id.toString() === edit) : undefined;
  return (
    <>
      <PageHeader
        title="Jurusan"
        description="Kelola program studi dan penanggung jawab jurusan."
      />
      <Notice text={notice} />
      {a.role === "Admin" && (
        <div className="mb-3 grid gap-2 sm:flex sm:justify-end">
          <FormModal
            modalId="jurusan-import"
            title="Import Jurusan"
            triggerLabel="Import Jurusan"
            dialogClassName="max-w-xl"
            triggerClassName="w-full sm:w-auto"
          >
            <TemplateImportForm
              name="jurusan"
              title="Import Jurusan"
              description="Buat atau perbarui data jurusan dari template Excel."
            />
          </FormModal>
          <FormModal
            modalId="jurusan-form"
            key={current?.id.toString() ?? "new"}
            title={current ? "Edit Jurusan" : "Tambah Jurusan"}
            triggerLabel={current ? "Edit Jurusan" : "Tambah Jurusan"}
            initialOpen={Boolean(current)}
            triggerClassName="w-full sm:w-auto"
          >
            <form action={saveJurusan} className="grid gap-3 md:grid-cols-4">
              <input
                type="hidden"
                name="id"
                value={current?.id.toString() ?? ""}
              />
              <input
                name="kodeJurusan"
                defaultValue={current?.kodeJurusan}
                placeholder="Kode jurusan"
                className={inputClass}
                required
              />
              <input
                name="namaJurusan"
                defaultValue={current?.namaJurusan}
                placeholder="Nama jurusan"
                className={inputClass}
                required
              />
              <input
                name="ketuaJurusan"
                defaultValue={current?.ketuaJurusan ?? ""}
                placeholder="Ketua jurusan"
                className={inputClass}
              />
              <button className={buttonClass}>
                {current ? "Simpan Perubahan" : "Tambah Jurusan"}
              </button>
            </form>
          </FormModal>
        </div>
      )}
      <SearchBox q={q} perPage={perPage} placeholder="Cari kode, nama, atau ketua jurusan..." />
      <div className="mt-4 grid gap-3 md:hidden">
        {rows.map((r) => (
          <section key={r.id.toString()} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-[#285aae]">{r.kodeJurusan}</div>
            <div className="mt-1 font-semibold text-slate-900">{r.namaJurusan}</div>
            <div className="mt-3 text-sm">
              <span className="text-xs text-slate-500">Ketua</span>
              <div>{r.ketuaJurusan ?? "-"}</div>
            </div>
            {a.role === "Admin" && (
              <div className="mt-3 grid gap-2">
                <Link href={`/jurusan?edit=${r.id}`} className={`${buttonClass} w-full`}>
                  Edit
                </Link>
                <form action={deleteJurusan}>
                  <input type="hidden" name="id" value={r.id.toString()} />
                  <button className={`${dangerClass} w-full`}>Hapus</button>
                </form>
              </div>
            )}
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
              <th className="p-3">Nama</th>
              <th className="p-3">Ketua</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id.toString()} className="border-t">
                <td className="p-3 font-semibold">{r.kodeJurusan}</td>
                <td className="p-3">{r.namaJurusan}</td>
                <td className="p-3">{r.ketuaJurusan ?? "-"}</td>
                <td className="p-3">
                  {a.role === "Admin" && (
                    <div className="grid gap-2 sm:flex">
                      <Link
                        href={`/jurusan?edit=${r.id}`}
                        className={`${buttonClass} w-full sm:w-auto`}
                      >
                        Edit
                      </Link>
                      <form action={deleteJurusan}>
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
