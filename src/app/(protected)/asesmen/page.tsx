import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, FileSearch } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAssignedStudentProgress } from "@/lib/assessment/service";

export default async function AssessmentIndexPage() {
  const session = await requireUser(["Asesor"]);
  const assessor = await prisma.asesor.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { id: true, name: true },
  });

  if (!assessor) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-800">
        Akun ini memiliki role Asesor, tetapi profil asesor belum terhubung.
        Hubungi administrator.
      </div>
    );
  }

  const students = await getAssignedStudentProgress(assessor.id);
  const totalCourses = students.reduce(
    (total, item) => total + item.totalCourses,
    0,
  );
  const assessed = students.reduce(
    (total, item) => total + item.assessedCourses,
    0,
  );
  const conflicts = students.reduce(
    (total, item) => total + item.conflictingScores,
    0,
  );

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-[#285aae]">
          ASESMEN TRANSFER SKS
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Mahasiswa Bimbingan
        </h1>
        <p className="mt-1 text-sm text-slate-500">Asesor: {assessor.name}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary icon={FileSearch} label="Mahasiswa" value={students.length} />
        <Summary
          icon={CheckCircle2}
          label="MK sudah dinilai"
          value={assessed}
        />
        <Summary
          icon={Clock3}
          label="MK belum dinilai"
          value={Math.max(totalCourses - assessed, 0)}
        />
      </div>

      {conflicts > 0 && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="shrink-0" size={20} />
          <span>
            Ditemukan {conflicts} mata kuliah dengan nilai berbeda pada record
            duplikat. Data tidak dihapus; record tersebut ditandai untuk
            rekonsiliasi.
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3">Mahasiswa</th>
                <th className="px-4 py-3">NIM</th>
                <th className="px-4 py-3 text-center">Total MK</th>
                <th className="px-4 py-3 text-center">Sudah</th>
                <th className="px-4 py-3 text-center">Belum</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.studentId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <strong className="block text-slate-800">
                      {student.name}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {student.username}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {student.nim || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {student.totalCourses}
                  </td>
                  <td className="px-4 py-3 text-center text-emerald-700">
                    {student.assessedCourses}
                  </td>
                  <td className="px-4 py-3 text-center text-amber-700">
                    {student.pendingCourses}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/asesmen/${student.studentId}`}
                      className="inline-flex rounded-md bg-[#285aae] px-3 py-2 font-semibold text-white hover:bg-[#1d4e9a]"
                    >
                      Buka asesmen
                    </Link>
                  </td>
                </tr>
              ))}
              {!students.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Belum ada mahasiswa yang ditugaskan kepada asesor ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileSearch;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <span className="grid size-11 place-items-center rounded-lg bg-blue-50 text-[#285aae]">
        <Icon size={22} />
      </span>
      <span>
        <strong className="block text-2xl text-slate-900">{value}</strong>
        <small className="text-slate-500">{label}</small>
      </span>
    </div>
  );
}
