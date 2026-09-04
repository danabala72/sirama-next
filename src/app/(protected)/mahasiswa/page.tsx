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
import { AssessorSelect } from "@/components/assessor-select";
import { TemplateImportForm } from "@/components/template-import-form";
import { requireManager } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";
import { deleteMahasiswa, saveMahasiswa } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; edit?: string; q?: string; page?: string; perPage?: string }>;
}) {
  const a = await requireManager(),
    params = await searchParams,
    { notice, edit } = params,
    { q, page, perPage, skip, take } = readListParams(params),
    js = a.role === "AdminJurusan" ? a.jurusanIdBigInt! : undefined,
    where = {
      ...(js ? { user: { jurusanId: js } } : {}),
      ...(q
        ? {
            OR: [
              { nim: { contains: q } },
              { name: { contains: q } },
              { email: { contains: q } },
              { noHp: { contains: q } },
              { user: { username: { contains: q } } },
              { user: { email: { contains: q } } },
              { user: { jurusan: { namaJurusan: { contains: q } } } },
              { user: { skema: { namaSkema: { contains: q } } } },
            ],
          }
        : {}),
    };
  const [rows, total, jurusan, skema, asesor] = await Promise.all([
    prisma.mahasiswa.findMany({
      where,
      include: {
        user: { include: { jurusan: true, skema: true } },
        asesorLinks: { include: { asesor: true }, orderBy: { asesorId: "asc" } },
      },
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    prisma.mahasiswa.count({ where }),
    prisma.jurusan.findMany({ where: js ? { id: js } : undefined }),
    prisma.skema.findMany({ where: js ? { jurusanId: js } : undefined }),
    prisma.asesor.findMany({
      include: { user: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const current = edit
    ? rows.find((row) => row.id.toString() === edit)
    : undefined;
  return (
    <>
      <PageHeader
        title="Mahasiswa"
        description="Buat akun, tugaskan asesor, dan pertahankan seluruh riwayat nilai."
      />
      <Notice text={notice} />
      <div className="mb-3 grid gap-2 sm:flex sm:justify-end">
        <FormModal
          modalId="mahasiswa-import"
          title="Import Mahasiswa"
          triggerLabel="Import Mahasiswa"
          dialogClassName="max-w-xl"
          triggerClassName="w-full sm:w-auto"
        >
          <TemplateImportForm
            name="mahasiswa"
            title="Import Mahasiswa"
            description="Buat atau perbarui akun mahasiswa dari template Excel."
          />
        </FormModal>
        <FormModal
          modalId="nim-import"
          title="Import NIM"
          triggerLabel="Import NIM"
          dialogClassName="max-w-xl"
          triggerClassName="w-full sm:w-auto"
        >
          <TemplateImportForm
            name="nim"
            title="Import NIM"
            description="Isi NIM mahasiswa berdasarkan username yang sudah ada."
          />
        </FormModal>
        <FormModal
          modalId="mahasiswa-form"
          key={current?.id.toString() ?? "new"}
          title={current ? "Edit Mahasiswa" : "Tambah Mahasiswa"}
          triggerLabel={current ? "Edit Mahasiswa" : "Tambah Mahasiswa"}
          initialOpen={Boolean(current)}
          triggerClassName="w-full sm:w-auto"
        >
          <form action={saveMahasiswa} className="grid gap-3 md:grid-cols-4">
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
            <select
              name="skemaId"
              className={inputClass}
              defaultValue={current?.user.skemaId?.toString() ?? ""}
            >
              <option value="">Pilih skema</option>
              {skema.map((x) => (
                <option key={x.id.toString()} value={x.id.toString()}>
                  {x.namaSkema}
                </option>
              ))}
            </select>
            <input
              name="nim"
              defaultValue={current?.nim ?? ""}
              placeholder="NIM"
              className={inputClass}
            />
            <input
              name="name"
              defaultValue={current?.name}
              placeholder="Nama mahasiswa"
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
              defaultValue={current?.email}
              placeholder="Email"
              className={inputClass}
              required
            />
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
            <input
              name="noHp"
              defaultValue={current?.noHp ?? ""}
              placeholder="No. HP"
              className={inputClass}
            />
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" name="isEditable" defaultChecked={current?.isEditable ?? true} />
              Izinkan mahasiswa mengedit formulir
            </label>
            <select
              name="jenisKelamin"
              className={inputClass}
              defaultValue={current?.jenisKelamin ?? "L"}
            >
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
            <fieldset className="md:col-span-4">
              <legend className="mb-1 text-sm font-semibold">
                Pilih asesor
              </legend>
              <AssessorSelect
                assessors={asesor.map((x) => ({ id: x.id.toString(), name: x.name, jurusanId: x.user.jurusanId?.toString() ?? null }))}
                selected={current?.asesorLinks.map((link) => link.asesorId.toString())}
                jurusanId={current?.user.jurusanId?.toString()}
              />
            </fieldset>
            <button className={buttonClass}>
              {current ? "Simpan Perubahan" : "Tambah Mahasiswa"}
            </button>
          </form>
        </FormModal>
      </div>
      <SearchBox q={q} perPage={perPage} placeholder="Cari NIM, nama, akun, email, HP, jurusan, atau skema..." />
      <div className="mt-4 grid gap-3 md:hidden">
        {rows.map((r) => (
          <section key={r.id.toString()} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-[#285aae]">{r.nim ?? "Belum ada NIM"}</div>
            <div className="mt-1 font-semibold text-slate-900">{r.name}</div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Jurusan/Skema</dt>
                <dd>{r.user.jurusan?.namaJurusan ?? "-"}</dd>
                <dd className="text-xs text-slate-500">{r.user.skema?.namaSkema ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Asesor</dt>
                <dd>
                  {r.asesorLinks.length ? (
                    <ol className="list-decimal space-y-1 pl-5">
                      {r.asesorLinks.map((link) => (
                        <li key={link.asesorId.toString()}>{link.asesor.name}</li>
                      ))}
                    </ol>
                  ) : (
                    "-"
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-3 grid gap-2">
              <details className="relative">
                <summary className="cursor-pointer list-none rounded border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50">Laporan</summary>
                <div className="mt-1 grid gap-1 rounded border border-slate-200 bg-white p-1 text-sm shadow-sm">
                  <Link href={`/api/mahasiswa/${r.id}/laporan/final`} className="rounded px-3 py-2 text-center hover:bg-slate-50">Final</Link>
                  <Link href={`/api/mahasiswa/${r.id}/laporan/formal`} className="rounded px-3 py-2 text-center hover:bg-slate-50">Formal</Link>
                  <Link href={`/api/mahasiswa/${r.id}/laporan/nonformal`} className="rounded px-3 py-2 text-center hover:bg-slate-50">Nonformal</Link>
                </div>
              </details>
              <Link href={`/mahasiswa?edit=${r.id}${q ? `&q=${encodeURIComponent(q)}` : ""}${page > 1 ? `&page=${page}` : ""}${perPage !== 10 ? `&perPage=${perPage}` : ""}`} className={`${buttonClass} w-full`}>
                Edit
              </Link>
              <form action={deleteMahasiswa}>
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
              <th className="p-3">NIM/Nama</th>
              <th className="p-3">Jurusan/Skema</th>
              <th className="p-3">Asesor</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              return (
                <tr key={r.id.toString()} className="border-t align-top">
                  <td className="p-3">
                    <b>{r.nim ?? "Belum ada NIM"}</b>
                    <div>{r.name}</div>
                  </td>
                  <td className="p-3">
                    {r.user.jurusan?.namaJurusan ?? "-"}
                    <br />
                    <span className="text-xs">
                      {r.user.skema?.namaSkema ?? "-"}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.asesorLinks.length ? (
                      <ol className="list-decimal space-y-1 pl-5">
                        {r.asesorLinks.map((link) => (
                          <li key={link.asesorId.toString()}>{link.asesor.name}</li>
                        ))}
                      </ol>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3">
                    <div className="grid gap-2 sm:flex">
                      <details className="relative">
                        <summary className="cursor-pointer list-none rounded border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50">Laporan</summary>
                        <div className="absolute right-0 z-10 mt-1 grid min-w-32 gap-1 rounded border border-slate-200 bg-white p-1 text-sm shadow-sm">
                          <Link href={`/api/mahasiswa/${r.id}/laporan/final`} className="rounded px-3 py-2 text-center hover:bg-slate-50">Final</Link>
                          <Link href={`/api/mahasiswa/${r.id}/laporan/formal`} className="rounded px-3 py-2 text-center hover:bg-slate-50">Formal</Link>
                          <Link href={`/api/mahasiswa/${r.id}/laporan/nonformal`} className="rounded px-3 py-2 text-center hover:bg-slate-50">Nonformal</Link>
                        </div>
                      </details>
                      <Link
                        href={`/mahasiswa?edit=${r.id}${q ? `&q=${encodeURIComponent(q)}` : ""}${page > 1 ? `&page=${page}` : ""}${perPage !== 10 ? `&perPage=${perPage}` : ""}`}
                        className={`${buttonClass} w-full sm:w-auto`}
                      >
                        Edit
                      </Link>
                      <form action={deleteMahasiswa}>
                        <input
                          type="hidden"
                          name="id"
                          value={r.id.toString()}
                        />
                        <button className={`${dangerClass} w-full sm:w-auto`}>Hapus</button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <EmptyRow colSpan={4} />}
          </tbody>
        </table>
      </div>
      <Pagination page={page} perPage={perPage} total={total} q={q} />
    </>
  );
}
import Link from "next/link";

