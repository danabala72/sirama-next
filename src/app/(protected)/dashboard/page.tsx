import { BookOpenCheck, GraduationCap, ShieldCheck, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export default async function DashboardPage() {
  const user = await requireUser(["Admin", "AdminJurusan"]);
  const scope =
    user.role === "AdminJurusan" && user.jurusanId
      ? { user: { jurusanId: BigInt(user.jurusanId) } }
      : {};
  const [mahasiswa, asesor, jurusan, mataKuliah] = await Promise.all([
    prisma.mahasiswa.count({ where: scope }),
    prisma.asesor.count(),
    prisma.jurusan.count(),
    prisma.mataKuliah.count({
      where:
        user.role === "AdminJurusan" && user.jurusanId
          ? { jurusanId: BigInt(user.jurusanId) }
          : {},
    }),
  ]);
  const cards = [
    ["Mahasiswa", mahasiswa, Users],
    ["Asesor", asesor, ShieldCheck],
    ["Jurusan", jurusan, GraduationCap],
    ["Mata Kuliah", mataKuliah, BookOpenCheck],
  ] as const;
  return (
    <section className="space-y-4">
      <div className="rounded-md border bg-white p-5">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ringkasan data Sistem Rekrutmen Mahasiswa RPL
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="rounded-md border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                {label}
              </span>
              <span className="rounded-md bg-blue-50 p-2 text-[#285aae]">
                <Icon size={20} />
              </span>
            </div>
            <strong className="mt-4 block text-3xl">
              {value.toLocaleString("id-ID")}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
