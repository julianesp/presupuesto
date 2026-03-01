import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  // Si no está autenticado, redirigir a sign-in
  if (!userId) {
    redirect("/sign-in");
  }

  // Si está autenticado, redirigir a dashboard
  redirect("/dashboard");
}
