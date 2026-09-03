import Link from "next/link";
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
import { deleteJurusan, saveJurusan } from "../admin-actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; edit?: string }>;
}) {
  const a = await requireManager();
  const { notice, edit } = await searchParams;
  const rows = await prisma.jurusan.findMany({
      where: a.role === "AdminJurusan" ? { id: a.jurusanIdBigInt! } : undefined,
      orderBy: { kodeJurusan: "asc" },
    }),
    current = edit ? rows.find((x) => x.id.toString() === edit) : undefined;
  return (
    <>
      <PageHeader
        title="Jurusan"
        description="Kelola program studi dan penanggung jawab jurusan."
      />
      <Notice text={notice} />
      {a.role === "Admin" && (
        <div className="flex justify-end">
          <FormModal
            modalId="jurusan-form"
            key={current?.id.toString() ?? "new"}
            title={current ? "Edit Jurusan" : "Tambah Jurusan"}
            triggerLabel={current ? "Edit Jurusan" : "Tambah Jurusan"}
            initialOpen={Boolean(current)}
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
      <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
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
                <td className="flex gap-2 p-3">
                  {a.role === "Admin" && (
                    <>
                      <Link
                        href={`/jurusan?edit=${r.id}`}
                        className={buttonClass}
                      >
                        Edit
                      </Link>
                      <form action={deleteJurusan}>
                        <input
                          type="hidden"
                          name="id"
                          value={r.id.toString()}
                        />
                        <button className={dangerClass}>Hapus aman</button>
                      </form>
                    </>
                  )}
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
