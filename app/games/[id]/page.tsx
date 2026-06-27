import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function GameByIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();

  const { data: game } = await supabase
    .from("games")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (!game?.slug) notFound();
  redirect(`/game/${game.slug}`);
}
