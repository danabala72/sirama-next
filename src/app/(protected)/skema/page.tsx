import {
  EmptyRow,
  Notice,
  PageHeader,
  buttonClass,
  dangerClass,
  inputClass,
} from "@/components/admin-ui";
import { FormModal } from "@/components/form-modal";
import { requireManager } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";
import { deleteSkema, saveSkema } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; edit?: string }>;
}) {
  const a = await requireManager(),
    { notice, edit } = await searchParams;
  const scope =
    a.role === "AdminJurusan" ? { jurusanId: a.jurusanIdBigInt! } : undefined;
  const [rows, jurusan] = await Promise.all([
    prisma.skema.findMany({
      where: scope,
      include: {
        jurusan: true,
        _count: { select: { users: true, mataKuliah: true } },
      },
      orderBy: { namaSkema: "asc" },
    }),
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
      <div className="flex justify-end">
        <FormModal
          modalId="skema-form"
          key={current?.id.toString() ?? "new"}
          title={current ? "Edit Skema" : "Tambah Skema"}
          triggerLabel={current ? "Edit Skema" : "Tambah Skema"}
          initialOpen={Boolean(current)}
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
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
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
                  <div className="flex gap-2">
                    <Link href={`/skema?edit=${r.id}`} className={buttonClass}>
                      Edit
                    </Link>
                    <form action={deleteSkema}>
                      <input type="hidden" name="id" value={r.id.toString()} />
                      <button className={dangerClass}>Hapus aman</button>
                    </form>
                  </div>
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
import Link from "next/link";
