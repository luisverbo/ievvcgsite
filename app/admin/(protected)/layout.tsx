import { createClient } from "@/lib/supabase/server";
import AdminNav from "./AdminNav";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-night text-cream md:flex-row">
      <AdminNav email={user?.email} />
      <main className="flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
