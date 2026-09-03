import {
  EmptyRow,
  Notice,
  PageHeader,
  buttonClass,
  dangerClass,
  inputClass,
} from "@/components/admin-ui";
import { FormModal } from "@/components/form-modal";
import { AssessorSelect } from "@/components/assessor-select";
import { requireManager } from "@/lib/admin/access";
import { prisma } from "@/lib/prisma";
import { deleteMahasiswa, saveMahasiswa } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; edit?: string }>;
}) {
  const a = await requireManager(),
    { notice, edit } = await searchParams,
    js = a.role === "AdminJurusan" ? a.jurusanIdBigInt! : undefined;
  const [rows, jurusan, skema, asesor] = await Promise.all([
    prisma.mahasiswa.findMany({
      where: js ? { user: { jurusanId: js } } : undefined,
      include: {
        user: { include: { jurusan: true, skema: true } },
        asesorLinks: { include: { asesor: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.jurusan.findMany({ where: js ? { id: js } : undefined }),
    prisma.skema.findMany({ where: js ? { jurusanId: js } : undefined }),
    prisma.asesor.findMany({
      where: js ? { user: { jurusanId: js } } : undefined,
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
      <div className="flex justify-end">
        <FormModal
          modalId="mahasiswa-form"
          key={current?.id.toString() ?? "new"}
          title={current ? "Edit Mahasiswa" : "Tambah Mahasiswa"}
          triggerLabel={current ? "Edit Mahasiswa" : "Tambah Mahasiswa"}
          initialOpen={Boolean(current)}
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
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
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
                  {r.asesorLinks.map((link) => link.asesor.name).join(", ") || "-"}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/mahasiswa?edit=${r.id}`}
                        className={buttonClass}
                      >
                        Edit
                      </Link>
                      <form action={deleteMahasiswa}>
                        <input
                          type="hidden"
                          name="id"
                          value={r.id.toString()}
                        />
                        <button className={dangerClass}>Hapus aman</button>
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
    </>
  );
}
import Link from "next/link";
