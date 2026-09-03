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
import { deleteAdminJurusan, saveAdminJurusan } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; edit?: string }>;
}) {
  await requireUser(["Admin"]);
  const { notice, edit } = await searchParams;
  const [rows, jurusan] = await Promise.all([
    prisma.adminJurusan.findMany({
      include: { user: { include: { jurusan: true } } },
      orderBy: { nama: "asc" },
    }),
    prisma.jurusan.findMany({ orderBy: { namaJurusan: "asc" } }),
  ]);
  const current = edit
    ? rows.find((row) => row.id.toString() === edit)
    : undefined;
  return (
    <>
      <PageHeader
        title="Admin Jurusan"
        description="Setiap admin hanya dapat mengelola data pada jurusan akunnya."
      />
      <Notice text={notice} />
      <div className="flex justify-end">
        <FormModal
          modalId="admin-jurusan-form"
          key={current?.id.toString() ?? "new"}
          title={current ? "Edit Admin Jurusan" : "Tambah Admin Jurusan"}
          triggerLabel={current ? "Edit Admin Jurusan" : "Tambah Admin Jurusan"}
          initialOpen={Boolean(current)}
        >
          <form action={saveAdminJurusan} className="grid gap-3 md:grid-cols-4">
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
              name="nama"
              defaultValue={current?.nama}
              placeholder="Nama admin"
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
              {current ? "Simpan Perubahan" : "Tambah Admin"}
            </button>
          </form>
        </FormModal>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">Nama</th>
              <th className="p-3">Username</th>
              <th className="p-3">Jurusan</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id.toString()} className="border-t">
                <td className="p-3 font-semibold">{r.nama}</td>
                <td className="p-3">{r.user.username}</td>
                <td className="p-3">{r.user.jurusan?.namaJurusan ?? "-"}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin-jurusan?edit=${r.id}`}
                      className={buttonClass}
                    >
                      Edit
                    </Link>
                    <form action={deleteAdminJurusan}>
                      <input type="hidden" name="id" value={r.id.toString()} />
                      <button className={dangerClass}>Hapus</button>
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
