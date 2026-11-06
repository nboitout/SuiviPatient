import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import WorkspaceShell from "@/components/WorkspaceShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/praticien");
  return <WorkspaceShell mode="admin" fullName={user.fullName}>{children}</WorkspaceShell>;
}
