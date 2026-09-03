import { requireUser } from "@/lib/auth";
export default async function AsesorDashboard() {
  const user = await requireUser(["Asesor"]);
  return (
    <section className="rounded-md border bg-white p-5">
      <h1 className="text-xl font-semibold">Dashboard Asesor</h1>
      <p className="mt-2 text-slate-500">
        Selamat datang, {user.username}. Buka menu Asesmen Transfer SKS untuk
        melihat mahasiswa yang ditugaskan.
      </p>
    </section>
  );
}
