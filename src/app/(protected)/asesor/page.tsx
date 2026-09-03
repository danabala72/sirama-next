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
import { deleteAsesor, saveAsesor } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; edit?: string }>;
}) {
  const a = await requireManager(),
    { notice, edit } = await searchParams,
    scope =
      a.role === "AdminJurusan"
        ? { user: { jurusanId: a.jurusanIdBigInt! } }
        : undefined;
  const [rows, jurusan] = await Promise.all([
    prisma.asesor.findMany({
      where: scope,
      include: {
        user: { include: { jurusan: true } },
        _count: { select: { mahasiswaLinks: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.jurusan.findMany({
      where: a.role === "AdminJurusan" ? { id: a.jurusanIdBigInt! } : undefined,
    }),
  ]);
  const current = edit
    ? rows.find((row) => row.id.toString() === edit)
    : undefined;
  return (
    <>
      <PageHeader
        title="Asesor"
        description="Kelola akun asesor sesuai yurisdiksi jurusan."
      />
      <Notice text={notice} />
      <div className="flex justify-end">
        <FormModal
          modalId="asesor-form"
          key={current?.id.toString() ?? "new"}
          title={current ? "Edit Asesor" : "Tambah Asesor"}
          triggerLabel={current ? "Edit Asesor" : "Tambah Asesor"}
          initialOpen={Boolean(current)}
        >
          <form action={saveAsesor} className="grid gap-3 md:grid-cols-4">
            <input
              type="hidden"
              name="id"
              value={current?.id.toString() ?? ""}
            />
            <select
              name="jurusanId"
              className={inputClass}
              defaultValue={current?.user.jurusanId?.toString()}
            >
              {jurusan.map((j) => (
                <option key={j.id.toString()} value={j.id.toString()}>
                  {j.namaJurusan}
                </option>
              ))}
            </select>
            <input
              name="name"
              defaultValue={current?.name}
              placeholder="Nama asesor"
              className={inputClass}
              required
            />
            <input
              name="username"
              defaultValue={current?.user.username}
              placeholder="Username"
              className={inputClass}
              required
            />
            <input
              type="email"
              name="email"
              defaultValue={current?.email ?? ""}
              placeholder="Email"
              className={inputClass}
            />
            <input
              name="noHp"
              defaultValue={current?.noHp ?? ""}
              placeholder="No. HP"
              className={inputClass}
            />
            <select
              name="jenisKelamin"
              className={inputClass}
              defaultValue={current?.jenisKelamin ?? ""}
            >
              <option value="">Jenis kelamin</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
            <input
              type="password"
              name="password"
              placeholder={current ? "Password baru (opsional)" : "Password"}
              className={inputClass}
              required={!current}
            />
            <input
              type="password"
              name="passwordConfirmation"
              placeholder="Konfirmasi password"
              className={inputClass}
              required={!current}
            />
            <button className={buttonClass}>
              {current ? "Simpan Perubahan" : "Tambah Asesor"}
            </button>
          </form>
        </FormModal>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Nama</th>
              <th className="p-3">Akun</th>
              <th className="p-3">Jurusan</th>
              <th className="p-3">Mahasiswa</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id.toString()} className="border-t">
                <td className="p-3 font-semibold">{r.name}</td>
                <td className="p-3">
                  {r.user.username}
                  <br />
                  <span className="text-xs text-slate-500">{r.email}</span>
                </td>
                <td className="p-3">{r.user.jurusan?.namaJurusan ?? "-"}</td>
                <td className="p-3">{r._count.mahasiswaLinks}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Link href={`/asesor?edit=${r.id}`} className={buttonClass}>
                      Edit
                    </Link>
                    <form action={deleteAsesor}>
                      <input type="hidden" name="id" value={r.id.toString()} />
                      <button className={dangerClass}>Hapus aman</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <EmptyRow colSpan={5} />}
          </tbody>
        </table>
      </div>
    </>
  );
}
import Link from "next/link";
