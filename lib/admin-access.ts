import "server-only";
import { redirect } from "next/navigation";
import { currentUser } from "./auth";

// Each server-rendered page checks access before querying its data.
// Layouts render in parallel with pages and are not the data-access boundary.
export async function requireAdminPage() {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/praticien");
  return user;
}
