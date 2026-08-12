import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;
  const redirectTo = redirect?.startsWith("/") ? redirect : "/admin";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Admin sign in</CardTitle>
          <CardDescription>
            Sign in with your admin account to manage courts and bookings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "not_admin" && (
            <p className="text-sm text-destructive" role="alert">
              Your account is signed in but is missing{" "}
              <code className="text-xs">app_metadata.role = &quot;admin&quot;</code>.
              Set that in the Supabase Dashboard, then try again.
            </p>
          )}
          <LoginForm redirectTo={redirectTo} />
        </CardContent>
      </Card>
    </div>
  );
}
