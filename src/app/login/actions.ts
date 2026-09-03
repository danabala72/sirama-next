"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authenticate } from "@/lib/auth";
import { createSession, homeForRole } from "@/lib/session";
export type LoginState = { error?: string };
const schema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});
export async function loginAction(
  _: LoginState,
  data: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    username: data.get("username"),
    password: data.get("password"),
  });
  if (!parsed.success) return { error: "Username dan password wajib diisi." };
  const user = await authenticate(parsed.data.username, parsed.data.password);
  if (!user) return { error: "Username/email atau password tidak sesuai." };
  await createSession(user);
  redirect(homeForRole(user.role));
}
