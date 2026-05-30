import { auth } from "./auth";
import { redirect } from "next/navigation";

// Use in server components / route handlers that require authentication.
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session;
}

// Returns null if not signed in — for optional auth checks.
export async function getSession() {
  return auth();
}
