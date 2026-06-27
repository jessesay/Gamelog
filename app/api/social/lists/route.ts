import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { safeServerError } from "@/lib/serverError";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return NextResponse.json({ lists: [] });

  const { data, error } = await supabase
    .from("game_lists")
    .select("*, list_items(id, games(*))")
    .eq("user_id", userResult.user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: safeServerError(error, "Could not load your lists.") }, { status: 500 });
  return NextResponse.json({ lists: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return NextResponse.json({ error: "Sign in to manage lists." }, { status: 401 });

  const body = await request.json();

  if (body.mode === "add-to-default") {
    const { data: existingList, error: existingError } = await supabase
      .from("game_lists")
      .select("id")
      .eq("user_id", user.id)
      .eq("title", "Want to Play")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) return NextResponse.json({ error: safeServerError(existingError, "Could not find your default list.") }, { status: 500 });

    let listId = existingList?.id;

    if (!listId) {
      const { data: createdList, error: listError } = await supabase
        .from("game_lists")
        .insert({
          user_id: user.id,
          title: "Want to Play",
          description: "Games saved from discovery and game pages.",
          is_ranked: false,
        })
        .select("id")
        .single();

      if (listError) return NextResponse.json({ error: safeServerError(listError, "Could not create your default list.") }, { status: 500 });
      listId = createdList.id;
    }

    const { error: itemError } = await supabase
      .from("list_items")
      .upsert({ list_id: listId, game_id: body.gameId }, { onConflict: "list_id,game_id" });

    if (itemError) return NextResponse.json({ error: safeServerError(itemError, "Could not add that game to the list.") }, { status: 500 });
    await supabase.from("activity_events").insert({
      user_id: user.id,
      game_id: body.gameId,
      list_id: listId,
      event_type: "listed",
      metadata: { source: "default-list" },
    }).then(() => undefined);
    revalidatePath("/app/lists");
    revalidatePath(`/l/${listId}`);
    return NextResponse.json({ ok: true, listId });
  }

  const title = String(body.title ?? "").trim().slice(0, 120);
  if (!title) return NextResponse.json({ error: "List name is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("game_lists")
    .insert({
      user_id: user.id,
      title,
      description: body.description ? String(body.description).trim().slice(0, 500) : null,
      is_ranked: Boolean(body.is_ranked),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: safeServerError(error, "Could not create that list.") }, { status: 500 });
  revalidatePath("/app/lists");
  return NextResponse.json({ list: data });
}
