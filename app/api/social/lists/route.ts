import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { safeServerError } from "@/lib/serverError";

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

async function getContext() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, username: null };
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return { supabase, user: null, username: null };
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  return { supabase, user, username: profile?.username ?? null };
}

async function getOwnedList(supabase: SupabaseClient, userId: string, listId: string) {
  const { data, error } = await supabase
    .from("game_lists")
    .select("id, user_id, title, is_public")
    .eq("id", listId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function refreshListPages(listId?: string | null, username?: string | null) {
  revalidatePath("/app/lists");
  revalidatePath("/app/profile");
  revalidatePath("/app/activity");
  if (listId) revalidatePath(`/l/${listId}`);
  if (username) revalidatePath(`/u/${username}`);
}

async function addGameToList(supabase: SupabaseClient, listId: string, gameId: string) {
  const { data: existing, error: existingError } = await supabase
    .from("list_items")
    .select("id")
    .eq("list_id", listId)
    .eq("game_id", gameId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return { item: existing, added: false };

  const { data: lastItem, error: positionError } = await supabase
    .from("list_items")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (positionError) throw positionError;

  const { data: item, error } = await supabase
    .from("list_items")
    .insert({ list_id: listId, game_id: gameId, position: Number(lastItem?.position ?? -1) + 1 })
    .select("id, position")
    .single();
  if (error) throw error;
  return { item, added: true };
}

export async function GET() {
  const { supabase, user } = await getContext();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  if (!user) return NextResponse.json({ lists: [] });

  const { data, error } = await supabase
    .from("game_lists")
    .select("*, list_items(id, position, created_at, games(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: safeServerError(error, "Could not load your lists.") }, { status: 500 });
  return NextResponse.json({ lists: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, username } = await getContext();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Sign in to manage lists." }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.mode === "add-to-default" || body.mode === "add-game") {
    const gameId = String(body.gameId ?? "");
    if (!gameId) return NextResponse.json({ error: "Choose a game to add." }, { status: 400 });

    let listId = String(body.listId ?? "");
    let listTitle = "Want to Play";
    let listIsPublic = true;
    let createdDefault = false;

    try {
      if (body.mode === "add-to-default") {
        const { data: existingList, error: existingError } = await supabase
          .from("game_lists")
          .select("id, title, is_public")
          .eq("user_id", user.id)
          .eq("title", "Want to Play")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existingError) throw existingError;
        if (existingList) {
          listId = existingList.id;
          listTitle = existingList.title;
          listIsPublic = existingList.is_public;
        } else {
          const { data: createdList, error: listError } = await supabase
            .from("game_lists")
            .insert({
              user_id: user.id,
              title: "Want to Play",
              description: "Games saved from discovery and game pages.",
              is_ranked: false,
              is_public: true,
            })
            .select("id, title, is_public")
            .single();
          if (listError) throw listError;
          listId = createdList.id;
          listTitle = createdList.title;
          listIsPublic = createdList.is_public;
          createdDefault = true;
        }
      } else {
        const list = await getOwnedList(supabase, user.id, listId);
        if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });
        listTitle = list.title;
        listIsPublic = list.is_public;
      }

      const result = await addGameToList(supabase, listId, gameId);
      if (result.added && listIsPublic) {
        await supabase.from("activity_events").insert({
          user_id: user.id,
          game_id: gameId,
          list_id: listId,
          event_type: "listed",
          metadata: { action: "added-game", list_title: listTitle, is_public: listIsPublic },
        }).then(() => undefined);
      }
      if (createdDefault) {
        await supabase.from("activity_events").insert({
          user_id: user.id,
          list_id: listId,
          event_type: "listed",
          metadata: { action: "created-list", list_title: listTitle },
        }).then(() => undefined);
      }
      refreshListPages(listId, username);
      return NextResponse.json({ ok: true, listId, added: result.added });
    } catch (error) {
      return NextResponse.json({ error: safeServerError(error, "Could not add that game to the list.") }, { status: 500 });
    }
  }

  const title = String(body.title ?? "").trim().slice(0, 120);
  if (!title) return NextResponse.json({ error: "List name is required." }, { status: 400 });
  const isPublic = body.is_public !== false;
  const { data, error } = await supabase
    .from("game_lists")
    .insert({
      user_id: user.id,
      title,
      description: body.description ? String(body.description).trim().slice(0, 500) : null,
      is_ranked: Boolean(body.is_ranked),
      is_public: isPublic,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: safeServerError(error, "Could not create that list.") }, { status: 500 });
  if (isPublic) {
    await supabase.from("activity_events").insert({
      user_id: user.id,
      list_id: data.id,
      event_type: "listed",
      metadata: { action: "created-list", list_title: title },
    }).then(() => undefined);
  }
  refreshListPages(data.id, username);
  return NextResponse.json({ list: data });
}

export async function PATCH(request: Request) {
  const { supabase, user, username } = await getContext();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Sign in to manage lists." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const listId = String(body.listId ?? "");
  if (!listId) return NextResponse.json({ error: "Missing listId." }, { status: 400 });

  try {
    const list = await getOwnedList(supabase, user.id, listId);
    if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });

    if (body.mode === "reorder") {
      const itemIds: string[] = Array.isArray(body.itemIds) ? body.itemIds.map(String) : [];
      const { data: ownedItems, error: itemError } = await supabase.from("list_items").select("id").eq("list_id", listId);
      if (itemError) throw itemError;
      const ownedIds = new Set((ownedItems ?? []).map((item) => item.id));
      if (itemIds.length !== ownedIds.size || itemIds.some((id) => !ownedIds.has(id))) {
        return NextResponse.json({ error: "The list changed while it was being reordered. Refresh and try again." }, { status: 409 });
      }
      const updates = await Promise.all(itemIds.map((itemId, position) => (
        supabase.from("list_items").update({ position }).eq("id", itemId).eq("list_id", listId)
      )));
      const updateError = updates.find((result) => result.error)?.error;
      if (updateError) throw updateError;
      refreshListPages(listId, username);
      return NextResponse.json({ ok: true });
    }

    const title = String(body.title ?? "").trim().slice(0, 120);
    if (!title) return NextResponse.json({ error: "List name is required." }, { status: 400 });
    const { data, error } = await supabase
      .from("game_lists")
      .update({
        title,
        description: body.description ? String(body.description).trim().slice(0, 500) : null,
        is_public: body.is_public !== false,
      })
      .eq("id", listId)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) throw error;
    refreshListPages(listId, username);
    return NextResponse.json({ list: data });
  } catch (error) {
    return NextResponse.json({ error: safeServerError(error, "Could not update that list.") }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { supabase, user, username } = await getContext();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Sign in to manage lists." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const listId = searchParams.get("listId") ?? "";
  const itemId = searchParams.get("itemId");
  if (!listId) return NextResponse.json({ error: "Missing listId." }, { status: 400 });

  try {
    const list = await getOwnedList(supabase, user.id, listId);
    if (!list) return NextResponse.json({ error: "List not found." }, { status: 404 });
    if (itemId) {
      const { error } = await supabase.from("list_items").delete().eq("id", itemId).eq("list_id", listId);
      if (error) throw error;
      refreshListPages(listId, username);
      return NextResponse.json({ ok: true });
    }
    const { error } = await supabase.from("game_lists").delete().eq("id", listId).eq("user_id", user.id);
    if (error) throw error;
    refreshListPages(null, username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: safeServerError(error, itemId ? "Could not remove that game." : "Could not delete that list.") }, { status: 500 });
  }
}
