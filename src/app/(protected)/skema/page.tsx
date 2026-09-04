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
import { requireManager } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";
import { deleteSkema, saveSkema } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    notice?: string;
    edit?: string;
    q?: string;
    page?: string;
    perPage?: string;
  }>;
}) {
  const a = await requireManager(),
    params = await searchParams,
    { notice, edit } = params,
    { q, page, perPage, skip, take } = readListParams(params);
  const scope = {
    ...(a.role === "AdminJurusan" ? { jurusanId: a.jurusanIdBigInt! } : {}),
    ...(q
      ? {
          OR: [
            { namaSkema: { contains: q } },
            { deskripsi: { contains: q } },
            { jurusan: { namaJurusan: { contains: q } } },
          ],
        }
      : {}),
  };
  const [rows, total, jurusan] = await Promise.all([
    prisma.skema.findMany({
      where: scope,
      include: {
        jurusan: true,
        _count: { select: { users: true, mataKuliah: true } },
      },
      orderBy: { namaSkema: "asc" },
      skip,
      take,
    }),
    prisma.skema.count({ where: scope }),
    prisma.jurusan.findMany({
      where: a.role === "AdminJurusan" ? { id: a.jurusanIdBigInt! } : undefined,
      orderBy: { namaJurusan: "asc" },
    }),
  ]);
  const current = edit
    ? rows.find((row) => row.id.toString() === edit)
    : undefined;
  return (
    <>
      <PageHeader
        title="Skema"
        description="Skema RPL dibatasi sesuai jurusan pengelola."
      />
      <Notice text={notice} />
      <div className="mb-3 grid gap-2 sm:flex sm:justify-end">
        <FormModal
          modalId="skema-form"
          key={current?.id.toString() ?? "new"}
          title={current ? "Edit Skema" : "Tambah Skema"}
          triggerLabel={current ? "Edit Skema" : "Tambah Skema"}
          initialOpen={Boolean(current)}
          triggerClassName="w-full sm:w-auto"
        >
          <form action={saveSkema} className="grid gap-3 md:grid-cols-4">
            <input
              type="hidden"
              name="id"
              value={current?.id.toString() ?? ""}
            />
            <select
              name="jurusanId"
              className={inputClass}
              defaultValue={current?.jurusanId.toString()}
              required
            >
              {jurusan.map((j) => (
                <option key={j.id.toString()} value={j.id.toString()}>
                  {j.namaJurusan}
                </option>
              ))}
            </select>
            <input
              name="namaSkema"
              defaultValue={current?.namaSkema}
              placeholder="Nama skema"
              className={inputClass}
              required
            />
            <input
              name="deskripsi"
              defaultValue={current?.deskripsi ?? ""}
              placeholder="Deskripsi"
              className={inputClass}
            />
            <button className={buttonClass}>
              {current ? "Simpan Perubahan" : "Tambah Skema"}
            </button>
          </form>
        </FormModal>
      </div>
      <SearchBox q={q} perPage={perPage} placeholder="Cari skema, deskripsi, atau jurusan..." />
      <div className="mt-4 grid gap-3 md:hidden">
        {rows.map((r) => (
          <section key={r.id.toString()} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-semibold text-slate-900">{r.namaSkema}</div>
            <div className="mt-1 text-xs text-slate-500">{r.deskripsi}</div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Jurusan</dt>
                <dd>{r.jurusan.namaJurusan}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Relasi</dt>
                <dd>{r._count.mataKuliah} MK · {r._count.users} pengguna</dd>
              </div>
            </dl>
            <div className="mt-3 grid gap-2">
              <Link href={`/skema?edit=${r.id}`} className={`${buttonClass} w-full`}>
                Edit
              </Link>
              <form action={deleteSkema}>
                <input type="hidden" name="id" value={r.id.toString()} />
                <button className={`${dangerClass} w-full`}>Hapus</button>
              </form>
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
              <th className="p-3">Skema</th>
              <th className="p-3">Jurusan</th>
              <th className="p-3">Relasi</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id.toString()} className="border-t">
                <td className="p-3">
                  <b>{r.namaSkema}</b>
                  <div className="text-xs text-slate-500">{r.deskripsi}</div>
                </td>
                <td className="p-3">{r.jurusan.namaJurusan}</td>
                <td className="p-3">
                  {r._count.mataKuliah} MK · {r._count.users} pengguna
                </td>
                <td className="p-3">
                  <div className="grid gap-2 sm:flex">
                    <Link href={`/skema?edit=${r.id}`} className={`${buttonClass} w-full sm:w-auto`}>
                      Edit
                    </Link>
                    <form action={deleteSkema}>
                      <input type="hidden" name="id" value={r.id.toString()} />
                      <button className={`${dangerClass} w-full sm:w-auto`}>Hapus</button>
                    </form>
                  </div>
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
import Link from "next/link";
