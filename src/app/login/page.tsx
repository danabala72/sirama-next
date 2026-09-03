import { GraduationCap, ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#eef3fb] p-5">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(27,66,130,0.2)] md:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden min-h-[620px] overflow-hidden bg-[#214b97] p-12 text-white md:flex md:flex-col md:justify-between">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
          <div className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full bg-[#5f8edb]/30" />
          <div className="relative">
            <div className="mb-8 grid h-16 w-16 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <GraduationCap size={38} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-100">
              Politeknik Negeri Bali
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">
              Sistem Rekrutmen Mahasiswa RPL
            </h1>
            <p className="mt-5 max-w-md leading-7 text-blue-100">
              Pengelolaan formulir, asesmen transfer SKS, dan hasil rekognisi
              dalam satu sistem.
            </p>
          </div>
          <div className="relative flex items-center gap-3 text-sm text-blue-100">
            <ShieldCheck size={20} />
            <span>Akses aman sesuai peran pengguna</span>
          </div>
        </div>
        <div className="flex min-h-[560px] items-center px-7 py-12 sm:px-12 md:min-h-[620px]">
          <div className="w-full">
            <div className="mb-9 md:hidden">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#214b97] text-white">
                <GraduationCap size={32} />
              </div>
              <p className="text-sm font-semibold text-[#285aae]">
                Politeknik Negeri Bali
              </p>
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#285aae]">
              SIRAMA
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Selamat datang
            </h2>
            <p className="mb-8 mt-3 text-sm leading-6 text-slate-500">
              Masuk menggunakan akun SIRAMA Anda untuk melanjutkan.
            </p>
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
