import Menu from "@/components/Menu";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoLink from "@/components/LogoLink";
import { Suspense } from "react";

// Dashboard loading skeleton for menu
function DashboardMenuSkeleton() {
  return (
    <div className="mt-8 p-6">
      <div className="flex flex-col gap-4">
        {Array(5)
          .fill(0)
          .map((_, idx) => (
            <div
              key={idx}
              className="h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl animate-pulse shadow-sm"
            ></div>
          ))}
      </div>
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* LEFT */}
      <div className="w-[20%] md:w-[18%] lg:w-[22%] xl:w-[20%] p-4 flex flex-col h-full">
        <div className="flex items-center justify-center gap-2 mb-4">
          <LogoLink />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<DashboardMenuSkeleton />}>
            <Menu />
          </Suspense>
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-[80%] md:w-[82%] lg:w-[78%] xl:w-[80%] bg-[#F7F8FA] h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
