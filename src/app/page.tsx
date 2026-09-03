import { redirect } from "next/navigation";
import { homeForRole, readSession } from "@/lib/session";
export default async function Home() {
  const session = await readSession();
  if (!session) redirect("/login");
  redirect(homeForRole(session.role));
}
