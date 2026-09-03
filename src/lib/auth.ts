import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readSession, type RoleName } from "@/lib/session";
export async function authenticate(username: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { OR: [{ username }, { email: username }] },
    include: { role: true },
  });
  if (!user) return null;
  const hash = user.password.startsWith("$2y$")
    ? `$2a$${user.password.slice(4)}`
    : user.password;
  if (!(await bcrypt.compare(password, hash))) return null;
  return {
    userId: user.id.toString(),
    username: user.username,
    role: user.role.role as RoleName,
    jurusanId: user.jurusanId?.toString() ?? null,
    skemaId: user.skemaId?.toString() ?? null,
  };
}
export async function requireUser(roles?: RoleName[]) {
  const session = await readSession();
  if (!session) redirect("/login");
  if (roles && !roles.includes(session.role)) redirect("/forbidden");
  return session;
}
