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
import { deleteAsesor, saveAsesor } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; edit?: string; q?: string; page?: string; perPage?: string }>;
}) {
  const a = await requireManager(),
    params = await searchParams,
    { notice, edit } = params,
    { q, page, perPage, skip, take } = readListParams(params),
    scope = {
      ...(a.role === "AdminJurusan"
        ? { user: { jurusanId: a.jurusanIdBigInt! } }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { email: { contains: q } },
              { noHp: { contains: q } },
              { user: { username: { contains: q } } },
              { user: { email: { contains: q } } },
              { user: { jurusan: { namaJurusan: { contains: q } } } },
            ],
          }
        : {}),
    };
  const [rows, total, jurusan] = await Promise.all([
    prisma.asesor.findMany({
      where: scope,
      include: {
        user: { include: { jurusan: true } },
        _count: { select: { mahasiswaLinks: true } },
      },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.asesor.count({ where: scope }),
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
      <div className="mb-3 grid gap-2 sm:flex sm:justify-end">
        <FormModal
          modalId="asesor-import"
          title="Import Asesor"
          triggerLabel="Import Asesor"
          dialogClassName="max-w-xl"
          triggerClassName="w-full sm:w-auto"
        >
          <TemplateImportForm
            name="asesor"
            title="Import Asesor"
            description="Buat atau perbarui akun asesor dari template Excel."
            requireJurusan={a.role === "Admin"}
            jurusanOptions={jurusan.map((j) => ({
              id: j.id.toString(),
              name: j.namaJurusan,
            }))}
          />
        </FormModal>
        <FormModal
          modalId="asesor-form"
          key={current?.id.toString() ?? "new"}
          title={current ? "Edit Asesor" : "Tambah Asesor"}
          triggerLabel={current ? "Edit Asesor" : "Tambah Asesor"}
          initialOpen={Boolean(current)}
          triggerClassName="w-full sm:w-auto"
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
      <SearchBox q={q} perPage={perPage} placeholder="Cari nama, akun, email, HP, atau jurusan..." />
      <div className="mt-4 grid gap-3 md:hidden">
        {rows.map((r) => (
          <section key={r.id.toString()} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="font-semibold text-slate-900">{r.name}</div>
            <div className="mt-1 text-sm text-slate-600">{r.user.username}</div>
            <div className="mt-1 text-xs text-slate-500">{r.email ?? "-"}</div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Jurusan</dt>
                <dd>{r.user.jurusan?.namaJurusan ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Mahasiswa</dt>
                <dd>{r._count.mahasiswaLinks}</dd>
              </div>
            </dl>
            <div className="mt-3 grid gap-2">
              <Link href={`/asesor?edit=${r.id}`} className={`${buttonClass} w-full`}>
                Edit
              </Link>
              <form action={deleteAsesor}>
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
                  <div className="grid gap-2 sm:flex">
                    <Link href={`/asesor?edit=${r.id}`} className={`${buttonClass} w-full sm:w-auto`}>
                      Edit
                    </Link>
                    <form action={deleteAsesor}>
                      <input type="hidden" name="id" value={r.id.toString()} />
                      <button className={`${dangerClass} w-full sm:w-auto`}>Hapus</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <EmptyRow colSpan={5} />}
          </tbody>
        </table>
      </div>
      <Pagination page={page} perPage={perPage} total={total} q={q} />
    </>
  );
}
import Link from "next/link";
