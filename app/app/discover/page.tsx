import GameSwipeDeck from "@/components/GameSwipeDeck";
import { createClient } from "@/utils/supabase/server";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  return <GameSwipeDeck signedIn={Boolean(data.user)} />;
}
