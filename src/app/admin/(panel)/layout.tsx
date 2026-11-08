import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { ForceChangePassword } from "@/components/admin/force-change-password";

export const dynamic = "force-dynamic";
export const metadata = { title: "ایڈمن پینل" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  // security: an admin created with the initial password (or reset by the
  // Super Admin) MUST set a personal password before using the panel
  if (user.mustChangePassword) {
    return (
      <ForceChangePassword name={user.name} email={user.email} />
    );
  }
  return <AdminShell>{children}</AdminShell>;
}
