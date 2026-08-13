import { redirect } from "next/navigation";

/** Keeps pre-unified-authentication bookmarks working. */
export default function LoginPage() {
  redirect("/member/login");
}
