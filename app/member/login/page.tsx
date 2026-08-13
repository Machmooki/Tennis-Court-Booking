import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MemberLoginForm } from "@/components/member/login-form";
import { createClient } from "@/lib/supabase/server";

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirectTo = redirectParam?.startsWith("/")
    ? redirectParam
    : "/member/dashboard";

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect(redirectTo);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Sign in to view your wallet balance and booking history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MemberLoginForm redirectTo={redirectTo} />
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/member/register"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
