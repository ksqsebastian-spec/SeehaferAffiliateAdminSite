import { redirect } from "next/navigation";

export default function HomePage() {
  // Auth disabled for development — go straight to admin
  redirect("/admin");
}
