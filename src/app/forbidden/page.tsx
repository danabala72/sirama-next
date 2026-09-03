import Link from "next/link";
export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <div className="text-center">
        <p className="text-7xl font-black text-emerald-600">403</p>
        <h1 className="mt-3 text-2xl font-bold">Akses tidak diizinkan</h1>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white"
        >
          Kembali
        </Link>
      </div>
    </main>
  );
}
