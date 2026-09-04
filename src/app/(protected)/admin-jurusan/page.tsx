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
import { deleteAdminJurusan, saveAdminJurusan } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; edit?: string; q?: string; page?: string; perPage?: string }>;
}) {
  await requireUser(["Admin"]);
  const params = await searchParams;
  const { notice, edit } = params;
  const { q, page, perPage, skip, take } = readListParams(params);
  const where = q
    ? {
        OR: [
          { nama: { contains: q } },
          { email: { contains: q } },
          { noHp: { contains: q } },
          { user: { username: { contains: q } } },
          { user: { email: { contains: q } } },
          { user: { jurusan: { namaJurusan: { contains: q } } } },
        ],
      }
    : {};
  const [rows, total, jurusan] = await Promise.all([
    prisma.adminJurusan.findMany({
      where,
      include: { user: { include: { jurusan: true } } },
      orderBy: { nama: "asc" },
      skip,
      take,
    }),
    prisma.adminJurusan.count({ where }),
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
      <div className="mb-3 grid gap-2 sm:flex sm:justify-end">
        <FormModal
          modalId="admin-jurusan-form"
          key={current?.id.toString() ?? "new"}
          title={current ? "Edit Admin Jurusan" : "Tambah Admin Jurusan"}
          triggerLabel={current ? "Edit Admin Jurusan" : "Tambah Admin Jurusan"}
          initialOpen={Boolean(current)}
          triggerClassName="w-full sm:w-auto"
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
      <SearchBox q={q} perPage={perPage} placeholder="Cari nama, username, email, HP, atau jurusan..." />
      <div className="mt-4 grid gap-3 md:hidden">
        {rows.map((r) => (
          <section key={r.id.toString()} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-semibold text-slate-900">{r.nama}</div>
            <div className="mt-1 text-sm text-slate-600">{r.user.username}</div>
            <div className="mt-1 text-xs text-slate-500">{r.email ?? "-"}</div>
            <div className="mt-3 text-sm">
              <span className="text-xs text-slate-500">Jurusan</span>
              <div>{r.user.jurusan?.namaJurusan ?? "-"}</div>
            </div>
            <div className="mt-3 grid gap-2">
              <Link href={`/admin-jurusan?edit=${r.id}`} className={`${buttonClass} w-full`}>
                Edit
              </Link>
              <form action={deleteAdminJurusan}>
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
                  <div className="grid gap-2 sm:flex">
                    <Link
                      href={`/admin-jurusan?edit=${r.id}`}
                      className={`${buttonClass} w-full sm:w-auto`}
                    >
                      Edit
                    </Link>
                    <form action={deleteAdminJurusan}>
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
