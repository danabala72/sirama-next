"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/lib/prisma";
import {
  assertJurusan,
  requireManager,
  scopedJurusanId,
} from "@/lib/admin/access";
import {
  activateSemester,
  copyActiveOfferingsToSemester,
} from "@/lib/admin/semester";
import { assignThreeAssessors } from "@/lib/admin/assessor-assignment";

const s = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const id = (fd: FormData, key = "id") => BigInt(s(fd, key));
function passwordFrom(fd: FormData) {
  const password = s(fd, "password");
  const confirmation = s(fd, "passwordConfirmation");
  if (password && password !== confirmation)
    throw new Error("Konfirmasi password tidak sama.");
  return password;
}
async function done(path: string, message: string): Promise<never> {
  revalidatePath(path.split("?")[0]);
  (await cookies()).set("sirama-toast", message, {
    path: "/",
    maxAge: 15,
    httpOnly: false,
    sameSite: "lax",
  });
  redirect(path);
}
async function fail(path: string, error: unknown): Promise<never> {
  if (isRedirectError(error)) throw error;
  const message = error instanceof Error ? error.message : "Operasi gagal.";
  (await cookies()).set("sirama-toast", `Error: ${message}`, {
    path: "/",
    maxAge: 15,
    httpOnly: false,
    sameSite: "lax",
  });
  redirect(path);
}

export async function saveJurusan(fd: FormData) {
  const path = "/jurusan";
  try {
    const a = await requireManager();
    if (a.role !== "Admin")
      throw new Error("Hanya Admin yang dapat mengubah jurusan.");
    const row = {
      kodeJurusan: s(fd, "kodeJurusan"),
      namaJurusan: s(fd, "namaJurusan"),
      ketuaJurusan: s(fd, "ketuaJurusan") || null,
    };
    if (!row.kodeJurusan || !row.namaJurusan)
      throw new Error("Kode dan nama wajib diisi.");
    const key = s(fd, "id");
    if (key)
      await prisma.jurusan.update({ where: { id: BigInt(key) }, data: row });
    else await prisma.jurusan.create({ data: row });
    await done(path, "Data jurusan tersimpan.");
  } catch (e) {
    await fail(path, e);
  }
}
export async function deleteJurusan(fd: FormData) {
  const path = "/jurusan";
  try {
    const a = await requireManager();
    if (a.role !== "Admin")
      throw new Error("Hanya Admin yang dapat menghapus jurusan.");
    const j = id(fd);
    const refs =
      (await prisma.user.count({ where: { jurusanId: j } })) +
      (await prisma.mataKuliah.count({ where: { jurusanId: j } })) +
      (await prisma.skema.count({ where: { jurusanId: j } }));
    if (refs)
      throw new Error(
        "Jurusan masih dipakai. Pindahkan data terkait dahulu agar data lama tidak hilang.",
      );
    await prisma.jurusan.delete({ where: { id: j } });
    await done(path, "Jurusan dihapus.");
  } catch (e) {
    await fail(path, e);
  }
}

export async function saveSkema(fd: FormData) {
  const path = "/skema";
  try {
    const a = await requireManager();
    const jurusanId = scopedJurusanId(a, fd.get("jurusanId"));
    const key = s(fd, "id");
    if (key) {
      const old = await prisma.skema.findUniqueOrThrow({
        where: { id: BigInt(key) },
      });
      assertJurusan(a, old.jurusanId);
    }
    const data = {
      jurusanId,
      namaSkema: s(fd, "namaSkema"),
      deskripsi: s(fd, "deskripsi") || null,
    };
    if (!data.namaSkema) throw new Error("Nama skema wajib diisi.");
    if (key) await prisma.skema.update({ where: { id: BigInt(key) }, data });
    else await prisma.skema.create({ data });
    await done(path, "Skema tersimpan.");
  } catch (e) {
    await fail(path, e);
  }
}
export async function deleteSkema(fd: FormData) {
  const path = "/skema";
  try {
    const a = await requireManager();
    const row = await prisma.skema.findUniqueOrThrow({
      where: { id: id(fd) },
      include: { _count: { select: { users: true, mataKuliah: true } } },
    });
    assertJurusan(a, row.jurusanId);
    if (row._count.users + row._count.mataKuliah)
      throw new Error("Skema masih terhubung ke pengguna atau mata kuliah.");
    await prisma.skema.delete({ where: { id: row.id } });
    await done(path, "Skema dihapus.");
  } catch (e) {
    await fail(path, e);
  }
}

export async function saveSemester(fd: FormData) {
  const path = "/semester";
  try {
    const a = await requireManager();
    if (a.role !== "Admin")
      throw new Error("Hanya Admin yang dapat mengubah semester.");
    const data = { kode: s(fd, "kode"), label: s(fd, "label") };
    if (!data.kode || !data.label)
      throw new Error("Kode dan label wajib diisi.");
    const key = s(fd, "id");
    if (key) await prisma.semester.update({ where: { id: BigInt(key) }, data });
    else await prisma.semester.create({ data });
    await done(path, "Semester tersimpan.");
  } catch (e) {
    await fail(path, e);
  }
}
export async function setActiveSemester(fd: FormData) {
  const path = "/semester";
  try {
    const a = await requireManager();
    if (a.role !== "Admin")
      throw new Error("Hanya Admin yang dapat mengaktifkan semester.");
    await activateSemester(id(fd));
    await done(path, "Semester aktif diperbarui.");
  } catch (e) {
    await fail(path, e);
  }
}
export async function copySemesterOfferings(fd: FormData) {
  const path = "/semester";
  try {
    const a = await requireManager();
    if (a.role !== "Admin")
      throw new Error("Hanya Admin yang dapat menyalin penawaran semester.");
    const result = await copyActiveOfferingsToSemester(id(fd));
    await done(
      path,
      `${result.count} mata kuliah disalin ke ${result.target.label}.`,
    );
  } catch (e) {
    await fail(path, e);
  }
}
export async function deleteSemester(fd: FormData) {
  const path = "/semester";
  try {
    const a = await requireManager();
    if (a.role !== "Admin")
      throw new Error("Hanya Admin yang dapat menghapus semester.");
    const row = await prisma.semester.findUniqueOrThrow({
      where: { id: id(fd) },
      include: { _count: { select: { mataKuliah: true } } },
    });
    if (row.isActive || row._count.mataKuliah)
      throw new Error("Semester aktif/terpakai tidak boleh dihapus.");
    await prisma.semester.delete({ where: { id: row.id } });
    await done(path, "Semester dihapus.");
  } catch (e) {
    await fail(path, e);
  }
}

export async function saveMataKuliah(fd: FormData) {
  const path = "/mata-kuliah";
  try {
    const a = await requireManager();
    const jurusanId = scopedJurusanId(a, fd.get("jurusanId"));
    const key = s(fd, "id");
    if (key) {
      const old = await prisma.mataKuliah.findUniqueOrThrow({
        where: { id: BigInt(key) },
      });
      assertJurusan(a, old.jurusanId);
    }
    const data = {
      jurusanId,
      kodeMk: s(fd, "kodeMk"),
      namaMk: s(fd, "namaMk"),
      sks: Number(s(fd, "sks")),
      nilaiMinimum: s(fd, "nilaiMinimum")
        ? Number(s(fd, "nilaiMinimum"))
        : null,
      status: fd.get("status") === "on",
    };
    if (
      !data.kodeMk ||
      !data.namaMk ||
      !Number.isInteger(data.sks) ||
      data.sks < 1
    )
      throw new Error("Kode, nama, dan SKS valid wajib diisi.");
    const semesterIds = fd
      .getAll("semesterIds")
      .map(String)
      .filter(Boolean)
      .map(BigInt);
    if (!semesterIds.length)
      throw new Error("Pilih minimal satu semester penawaran.");
    const skemaIds = fd
      .getAll("skemaIds")
      .map(String)
      .filter(Boolean)
      .map(BigInt);
    const validSkema = await prisma.skema.count({
      where: { id: { in: skemaIds }, jurusanId },
    });
    if (validSkema !== skemaIds.length)
      throw new Error("Seluruh skema harus berasal dari jurusan mata kuliah.");
    const mk = key
      ? await prisma.mataKuliah.update({ where: { id: BigInt(key) }, data })
      : await prisma.mataKuliah.create({ data });
    const existingOfferings = await prisma.mataKuliahSemester.findMany({
      where: { mataKuliahId: mk.id },
      include: { _count: { select: { pilihan: true, capaian: true } } },
    });
    const removedOfferings = existingOfferings.filter(
      (offering) =>
        !semesterIds.some((semesterId) => semesterId === offering.semesterId),
    );
    if (
      removedOfferings.some(
        (offering) => offering._count.pilihan || offering._count.capaian,
      )
    )
      throw new Error(
        "Semester yang sudah memiliki pilihan mahasiswa atau CPMK tidak dapat dihapus dari penawaran.",
      );
    await prisma.$transaction([
      ...(removedOfferings.length
        ? [
            prisma.mataKuliahSemester.deleteMany({
              where: {
                id: { in: removedOfferings.map((offering) => offering.id) },
              },
            }),
          ]
        : []),
      ...semesterIds.map((semesterId) =>
        prisma.mataKuliahSemester.upsert({
          where: {
            mataKuliahId_semesterId: { mataKuliahId: mk.id, semesterId },
          },
          update: {},
          create: { mataKuliahId: mk.id, semesterId },
        }),
      ),
      prisma.skemaMataKuliah.deleteMany({
        where: { mataKuliahId: mk.id, skemaId: { notIn: skemaIds } },
      }),
      ...skemaIds.map((skemaId) =>
        prisma.skemaMataKuliah.upsert({
          where: { mataKuliahId_skemaId: { mataKuliahId: mk.id, skemaId } },
          update: {},
          create: { mataKuliahId: mk.id, skemaId },
        }),
      ),
    ]);
    await done(path, "Mata kuliah tersimpan.");
  } catch (e) {
    await fail(path, e);
  }
}
export async function deactivateMataKuliah(fd: FormData) {
  const path = "/mata-kuliah";
  try {
    const a = await requireManager();
    const row = await prisma.mataKuliah.findUniqueOrThrow({
      where: { id: id(fd) },
    });
    assertJurusan(a, row.jurusanId);
    await prisma.mataKuliah.update({
      where: { id: row.id },
      data: { status: false },
    });
    await done(path, "Mata kuliah dinonaktifkan tanpa menghapus riwayat.");
  } catch (e) {
    await fail(path, e);
  }
}

async function editableCpmkOffering(
  actor: Awaited<ReturnType<typeof requireManager>>,
  offeringId: bigint,
) {
  const offering = await prisma.mataKuliahSemester.findUniqueOrThrow({
    where: { id: offeringId },
    include: { mataKuliah: true, semester: true },
  });
  assertJurusan(actor, offering.mataKuliah.jurusanId);
  if (!offering.semester.isActive)
    throw new Error("CPMK hanya dapat diubah pada semester yang sedang aktif.");
  return offering;
}

export async function saveCpmk(fd: FormData) {
  const path = "/mata-kuliah";
  try {
    const actor = await requireManager();
    const indicator = s(fd, "indikatorCapaian");
    if (!indicator) throw new Error("Indikator capaian wajib diisi.");

    const offeringId = id(fd, "mataKuliahSemesterId");
    const offering = await editableCpmkOffering(actor, offeringId);
    const key = s(fd, "id");
    if (key) {
      const current = await prisma.cpMataKuliah.findUniqueOrThrow({
        where: { id: BigInt(key) },
      });
      if (current.mataKuliahSemesterId !== offeringId)
        throw new Error("CPMK tidak sesuai dengan mata kuliah yang dipilih.");
      await prisma.cpMataKuliah.update({
        where: { id: current.id },
        data: { indikatorCapaian: indicator },
      });
    } else {
      const duplicate = await prisma.cpMataKuliah.findFirst({
        where: {
          mataKuliahSemesterId: offeringId,
          indikatorCapaian: indicator,
        },
      });
      if (duplicate) throw new Error("Indikator CPMK yang sama sudah tersedia.");
      await prisma.cpMataKuliah.create({
        data: {
          mataKuliahSemesterId: offeringId,
          indikatorCapaian: indicator,
        },
      });
    }
    await done(
      `${path}?cpmk=${offering.mataKuliahId.toString()}`,
      key ? "CPMK berhasil diperbarui." : "CPMK berhasil ditambahkan.",
    );
  } catch (e) {
    const courseId = s(fd, "mataKuliahId");
    await fail(`${path}${courseId ? `?cpmk=${courseId}` : ""}`, e);
  }
}

export async function deleteCpmk(fd: FormData) {
  const path = "/mata-kuliah";
  try {
    const actor = await requireManager();
    const row = await prisma.cpMataKuliah.findUniqueOrThrow({
      where: { id: id(fd) },
    });
    const offering = await editableCpmkOffering(
      actor,
      row.mataKuliahSemesterId,
    );
    await prisma.cpMataKuliah.delete({ where: { id: row.id } });
    await done(
      `${path}?cpmk=${offering.mataKuliahId.toString()}`,
      "CPMK berhasil dihapus.",
    );
  } catch (e) {
    const courseId = s(fd, "mataKuliahId");
    await fail(`${path}${courseId ? `?cpmk=${courseId}` : ""}`, e);
  }
}

async function roleId(name: string) {
  const role = await prisma.role.findUnique({ where: { role: name } });
  if (!role) throw new Error(`Role ${name} tidak ditemukan pada database.`);
  return role.id;
}
export async function saveAsesor(fd: FormData) {
    const path = "/asesor";
  try {
    const a = await requireManager();
    let jurusanId = scopedJurusanId(a, fd.get("jurusanId"));
    const key = s(fd, "id");
    if (key) {
      const old = await prisma.asesor.findUniqueOrThrow({
        where: { id: BigInt(key) },
        include: {
          user: true,
          _count: {
            select: {
              mahasiswaLinks: true,
              penilaianFormal: true,
              penilaianNonformal: true,
            },
          },
        },
      });
      assertJurusan(a, old.user.jurusanId!);
      jurusanId = old.user.jurusanId!;
    }
    const username = s(fd, "username"),
      email = s(fd, "email") || null,
      password = passwordFrom(fd);
    if (!username || !s(fd, "name"))
      throw new Error("Username dan nama wajib diisi.");
    if (key) {
      const old = await prisma.asesor.findUniqueOrThrow({
        where: { id: BigInt(key) },
      });
      await prisma.$transaction([
        prisma.user.update({
          where: { id: old.userId },
          data: {
            username,
            email,
            jurusanId,
            ...(password ? { password: await bcrypt.hash(password, 12) } : {}),
          },
        }),
        prisma.asesor.update({
          where: { id: old.id },
          data: {
            name: s(fd, "name"),
            email,
            noHp: s(fd, "noHp") || null,
            jenisKelamin: (s(fd, "jenisKelamin") || null) as "L" | "P" | null,
          },
        }),
      ]);
    } else {
      if (!password) throw new Error("Password wajib untuk akun baru.");
      await prisma.user.create({
        data: {
          roleId: await roleId("Asesor"),
          jurusanId,
          username,
          email,
          password: await bcrypt.hash(password, 12),
          asesor: {
            create: {
              name: s(fd, "name"),
              email,
              noHp: s(fd, "noHp") || null,
              jenisKelamin: (s(fd, "jenisKelamin") || null) as "L" | "P" | null,
            },
          },
        },
      });
    }
    await done(path, "Asesor tersimpan.");
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      await fail(path, new Error("Username atau email sudah digunakan."));
    await fail(path, e);
  }
}
export async function deleteAsesor(fd: FormData) {
  const path = "/asesor";
  try {
    const a = await requireManager();
    const row = await prisma.asesor.findUniqueOrThrow({
      where: { id: id(fd) },
      include: {
        user: true,
        _count: {
          select: {
            mahasiswaLinks: true,
            penilaianFormal: true,
            penilaianNonformal: true,
          },
        },
      },
    });
    assertJurusan(a, row.user.jurusanId!);
    if (
      row._count.mahasiswaLinks +
      row._count.penilaianFormal +
      row._count.penilaianNonformal
    )
      throw new Error(
        "Asesor memiliki penugasan/penilaian dan tidak boleh dihapus.",
      );
    await prisma.user.delete({ where: { id: row.userId } });
    await done(path, "Asesor dihapus.");
  } catch (e) {
    await fail(path, e);
  }
}

export async function saveAdminJurusan(fd: FormData) {
  const path = "/admin-jurusan";
  try {
    const a = await requireManager();
    if (a.role !== "Admin")
      throw new Error("Hanya Admin yang dapat mengelola Admin Jurusan.");
    const jurusanId = scopedJurusanId(a, fd.get("jurusanId")),
      username = s(fd, "username"),
      email = s(fd, "email") || null,
      password = passwordFrom(fd),
      key = s(fd, "id"),
      profile = {
        nama: s(fd, "nama"),
        email,
        noHp: s(fd, "noHp") || null,
        jenisKelamin: (s(fd, "jenisKelamin") || null) as "L" | "P" | null,
      };
    if (!username || !profile.nama || (!key && !password))
      throw new Error("Username, nama, dan password akun baru wajib diisi.");
    if (key) {
      const old = await prisma.adminJurusan.findUniqueOrThrow({
        where: { id: BigInt(key) },
      });
      await prisma.$transaction([
        prisma.user.update({
          where: { id: old.userId },
          data: {
            jurusanId,
            username,
            email,
            ...(password ? { password: await bcrypt.hash(password, 12) } : {}),
          },
        }),
        prisma.adminJurusan.update({ where: { id: old.id }, data: profile }),
      ]);
    } else
      await prisma.user.create({
        data: {
          roleId: await roleId("AdminJurusan"),
          jurusanId,
          username,
          email,
          password: await bcrypt.hash(password, 12),
          adminJurusan: { create: profile },
        },
      });
    await done(path, "Admin Jurusan tersimpan.");
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      await fail(path, new Error("Username atau email sudah digunakan."));
    await fail(path, e);
  }
}
export async function deleteAdminJurusan(fd: FormData) {
  const path = "/admin-jurusan";
  try {
    const a = await requireManager();
    if (a.role !== "Admin")
      throw new Error("Hanya Admin yang dapat menghapus Admin Jurusan.");
    const row = await prisma.adminJurusan.findUniqueOrThrow({
      where: { id: id(fd) },
    });
    await prisma.user.delete({ where: { id: row.userId } });
    await done(path, "Admin Jurusan dihapus.");
  } catch (e) {
    await fail(path, e);
  }
}

export async function saveMahasiswa(fd: FormData) {
  const path = "/mahasiswa";
  try {
    const a = await requireManager();
    const jurusanId = scopedJurusanId(a, fd.get("jurusanId")),
      username = s(fd, "username"),
      email = s(fd, "email"),
      password = passwordFrom(fd),
      name = s(fd, "name"),
      nim = s(fd, "nim") || null,
      key = s(fd, "id"),
      skemaId = s(fd, "skemaId") ? BigInt(s(fd, "skemaId")) : null;
    const asesorIds = fd.getAll("asesorIds").map(String).filter(Boolean).map(BigInt);
    if (!username || !email || !name || (!key && !password))
      throw new Error(
        "Username, email, nama, dan password akun baru wajib diisi.",
      );
    if (!asesorIds.length) throw new Error("Pilih minimal satu asesor.");
    let mahasiswaId: bigint;
    if (skemaId) {
      const valid = await prisma.skema.findFirst({
        where: { id: skemaId, jurusanId },
      });
      if (!valid)
        throw new Error("Skema tidak sesuai dengan jurusan mahasiswa.");
    }
    if (key) {
      const old = await prisma.mahasiswa.findUniqueOrThrow({
        where: { id: BigInt(key) },
        include: {
          user: true,
          _count: { select: { mataKuliahPilihan: true, asesorLinks: true } },
        },
      });
      assertJurusan(a, old.user.jurusanId!);
      if (
        old.user.jurusanId !== jurusanId &&
        old._count.mataKuliahPilihan + old._count.asesorLinks > 0
      )
        throw new Error(
          "Mahasiswa yang sudah memiliki MK/asesor tidak boleh dipindah jurusan.",
        );
      await prisma.$transaction([
        prisma.user.update({
          where: { id: old.userId },
          data: {
            jurusanId,
            skemaId,
            username,
            email,
            ...(password ? { password: await bcrypt.hash(password, 12) } : {}),
          },
        }),
        prisma.mahasiswa.update({
          where: { id: old.id },
          data: {
            nim,
            name,
            email,
            noHp: s(fd, "noHp") || old.noHp,
            jenisKelamin: (s(fd, "jenisKelamin") || old.jenisKelamin) as
              "L" | "P",
          },
        }),
      ]);
      mahasiswaId = old.id;
    } else {
      const user = await prisma.user.create({
        include: { mahasiswa: true },
        data: {
          roleId: await roleId("Mahasiswa"),
          jurusanId,
          skemaId,
          username,
          email,
          password: await bcrypt.hash(password, 12),
          mahasiswa: {
            create: {
              nim,
              name,
              email,
              tempatLahir: "-",
              tanggalLahir: new Date("1970-01-01T00:00:00Z"),
              jenisKelamin: (s(fd, "jenisKelamin") || "L") as "L" | "P",
              kebangsaan: "Indonesia",
              alamatRumah: "-",
              kodePos: "-",
              noHp: s(fd, "noHp") || "-",
              alamatKantor: "-",
            },
          },
        },
      });
      mahasiswaId = user.mahasiswa!.id;
    }
    if (asesorIds.length)
      await assignThreeAssessors(
        { role: a.role, jurusanId: a.jurusanIdBigInt },
        mahasiswaId,
        asesorIds,
      );
    await done(path, "Mahasiswa tersimpan.");
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      await fail(path, new Error("Username atau email sudah digunakan."));
    await fail(path, e);
  }
}
export async function deleteMahasiswa(fd: FormData) {
  const path = "/mahasiswa";
  try {
    const a = await requireManager();
    const row = await prisma.mahasiswa.findUniqueOrThrow({
      where: { id: id(fd) },
      include: {
        user: true,
        _count: { select: { mataKuliahPilihan: true, asesorLinks: true } },
      },
    });
    assertJurusan(a, row.user.jurusanId!);
    if (row._count.mataKuliahPilihan || row._count.asesorLinks)
      throw new Error(
        "Mahasiswa memiliki pilihan MK, penugasan, atau nilai; akun tidak boleh dihapus.",
      );
    await prisma.user.delete({ where: { id: row.userId } });
    await done(path, "Mahasiswa dihapus.");
  } catch (e) {
    await fail(path, e);
  }
}

export async function assignAssessors(fd: FormData) {
  const path = "/mahasiswa";
  try {
    const a = await requireManager();
    await assignThreeAssessors(
      { role: a.role, jurusanId: a.jurusanIdBigInt },
      id(fd, "mahasiswaId"),
      fd.getAll("asesorIds").map(String).filter(Boolean).map(BigInt),
    );
    await done(path, "Tepat tiga asesor berhasil ditugaskan.");
  } catch (e) {
    await fail(path, e);
  }
}
