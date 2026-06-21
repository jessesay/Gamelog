"use client";

import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import {
  BookmarkPlus,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DownloadCloud,
  Edit3,
  ExternalLink,
  Flame,
  Gamepad2,
  Heart,
  History,
  Layers3,
  ListPlus,
  LogIn,
  MessageCircle,
  Search,
  Share2,
  SlidersHorizontal,
  Shuffle,
  RotateCcw,
  Send,
  SkipForward,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  UserMinus,
  UserPlus,
  UserRound,
  Users,
  X,
  Zap
} from "lucide-react";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase";
import { demoProfile, loadDemoState, saveDemoState, starterGames } from "@/lib/demo";
import { getEffectiveCoverUrl, getKnownCoverUrl, withKnownCover } from "@/lib/coverArt";
import type { Follow, Game, GameList, GameLog, Profile, ReviewComment } from "@/lib/types";

type View = "home" | "discover" | "games" | "log" | "feed" | "lists" | "people" | "history" | "sources" | "profile";
type AuthMode = "signin" | "signup";
type FeedFilter = "all" | "following" | "mine";
type DiscoverMode = "forYou" | "fresh" | "all" | "backlog" | "passed";
type DiscoveryActionName = "Pass" | "Want to Play" | "Backlog" | "Currently Playing" | "Completed";
type DiscoveryMood = "All" | "Cozy" | "Hardcore" | "Multiplayer" | "Story" | "Short" | "Open World" | "Shooter" | "Strategy" | "Indie";
type DiscoveryAction = { id: string; user_id: string; game_id: string; action: DiscoveryActionName; created_at: string; games?: Game | null };
type UndoAction =
  | { kind: "pass"; action: DiscoveryAction }
  | { kind: "quicklog"; action: DiscoveryAction; previousLog: GameLog | null; newLogId?: string | null };

type Message = { type: "ok" | "error" | "info"; text: string } | null;

const statuses = ["Want to Play", "Backlog", "Currently Playing", "Completed", "100% Completed", "Dropped", "Replaying"];
const vibes = ["Masterpiece", "Hidden Gem", "Overrated", "Cozy", "Sweaty", "Chaos", "Not for Me", "Forever Game"];
const discoveryMoods: DiscoveryMood[] = ["All", "Cozy", "Hardcore", "Multiplayer", "Story", "Short", "Open World", "Shooter", "Strategy", "Indie"];

const demoFriends: Profile[] = [
  {
    id: "demo-friend",
    username: "questdad",
    display_name: "Quest Dad",
    bio: "Plays too many RPGs and calls it character development.",
    favorite_game: "Baldur's Gate 3"
  },
  {
    id: "demo-friend-2",
    username: "cozycritter",
    display_name: "Cozy Critter",
    bio: "Stardew, Minecraft, and games that feel like soup.",
    favorite_game: "Stardew Valley"
  }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function stars(rating: number | null | undefined) {
  if (!rating) return "Unrated";
  const rounded = Math.round(rating * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded % 1 ? "½" : "";
  return `${"★".repeat(full)}${half}${"☆".repeat(Math.max(0, 5 - Math.ceil(rounded)))}`;
}

function initials(name?: string | null) {
  if (!name) return "GL";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function makeSlug(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function gameHue(game: Game) {
  const seed = (game.slug ?? game.title).split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return seed % 360;
}

function coverStyle(game: Game): CSSProperties {
  return { "--cover-hue": gameHue(game) } as CSSProperties;
}

function getReleaseYear(released?: string | null) {
  if (!released) return null;
  const year = Number(released.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function mapRawgGame(item: any): Game | null {
  const title = item?.name?.trim();
  if (!title) return null;
  const slug = makeSlug(item.slug || title);
  if (!slug) return null;
  const platforms = Array.isArray(item.platforms)
    ? item.platforms.map((entry: any) => entry?.platform?.name).filter(Boolean).slice(0, 5)
    : [];
  const genre = Array.isArray(item.genres) ? item.genres[0]?.name ?? "Game" : "Game";

  return {
    id: `rawg-${item.id ?? slug}`,
    title,
    slug,
    developer: "RAWG import",
    publisher: null,
    release_year: getReleaseYear(item.released),
    genre,
    platforms: platforms.length ? platforms : ["Unknown"],
    cover_url: item.background_image ?? null,
    summary: `${genre} · ${platforms.slice(0, 3).join(", ") || "platforms unknown"}`,
    is_community: true
  };
}

function gameMoodTags(game: Game): DiscoveryMood[] {
  const text = [game.title, game.genre, game.summary, game.developer, ...(game.platforms ?? [])].filter(Boolean).join(" ").toLowerCase();
  const tags = new Set<DiscoveryMood>();

  if (/cozy|farming|life sim|animal crossing|stardew|decorating|chill|island|fishing/.test(text)) tags.add("Cozy");
  if (/souls|brutal|horror|survival|boss|hard|tactical|rogue|precision|xcom|doom/.test(text)) tags.add("Hardcore");
  if (/co-op|multiplayer|online|battle royale|squad|party|social|mmo|crew|team|sports/.test(text)) tags.add("Multiplayer");
  if (/story|narrative|rpg|jrpg|crpg|detective|choice|cinematic|mystery|dialogue/.test(text)) tags.add("Story");
  if (/short|run|rogue|arcade|quick|vampire survivors|slay|hades|session/.test(text)) tags.add("Short");
  if (/open-world|open world|sandbox|exploration|space|city|world|wasteland|planets/.test(text)) tags.add("Open World");
  if (/shooter|gun|fps|tactical shooter|battle royale|cod|halo|doom|sniper/.test(text)) tags.add("Shooter");
  if (/strategy|tactical|tactics|sim|colony|automation|deckbuilder|civilization|crusader|stellaris|factorio/.test(text)) tags.add("Strategy");
  if (/indie|annapurna|supergiant|team cherry|concernedape|toby fox|mobius|poncle|re-logic|klei/.test(text)) tags.add("Indie");

  return Array.from(tags);
}

function getDiscoveryReasons(game: Game, myLogs: GameLog[]): string[] {
  const moodTags = gameMoodTags(game);
  const likedLogs = myLogs.filter((log) => Number(log.rating ?? 0) >= 4 || ["Completed", "100% Completed"].includes(log.status));
  const likedGenres = new Set(likedLogs.map((log) => log.games?.genre).filter(Boolean));
  const likedPlatforms = new Set(likedLogs.flatMap((log) => log.games?.platforms ?? []));
  const reasons: string[] = [];

  if (game.genre && likedGenres.has(game.genre)) reasons.push(`Because you liked ${game.genre}`);
  const platformMatch = (game.platforms ?? []).find((platform) => likedPlatforms.has(platform));
  if (platformMatch) reasons.push(`Fits your ${platformMatch} shelf`);
  if (moodTags.length) reasons.push(...moodTags.slice(0, 3).map((tag) => `${tag} vibe`));
  if (game.release_year && game.release_year >= 2023) reasons.push("Recent release");
  if (game.is_community) reasons.push("Community pick");

  return Array.from(new Set(reasons)).slice(0, 5);
}

function discoveryStorageKey(userId: string) {
  return `gamelog_discovery_actions_${userId}`;
}

function tasteStorageKey(userId: string) {
  return `gamelog_taste_prefs_${userId}`;
}

function gameTasteScore(game: Game, myLogs: GameLog[], tasteGenres: string[], tasteMoods: DiscoveryMood[]) {
  const moodTags = gameMoodTags(game);
  const likedLogs = myLogs.filter((log) => Number(log.rating ?? 0) >= 4 || ["Completed", "100% Completed"].includes(log.status));
  const likedGenres = new Set(likedLogs.map((log) => log.games?.genre).filter(Boolean));
  const likedPlatforms = new Set(likedLogs.flatMap((log) => log.games?.platforms ?? []));
  let score = 0;

  if (game.genre && tasteGenres.includes(game.genre)) score += 7;
  score += moodTags.filter((tag) => tasteMoods.includes(tag)).length * 5;
  if (game.genre && likedGenres.has(game.genre)) score += 4;
  score += (game.platforms ?? []).filter((platform) => likedPlatforms.has(platform)).length * 2;
  if (getEffectiveCoverUrl(game)) score += 1;
  if (game.release_year && game.release_year >= 2022) score += 1;
  if (game.is_community) score += 1;

  return score;
}

function matchPercent(game: Game, myLogs: GameLog[], tasteGenres: string[], tasteMoods: DiscoveryMood[]) {
  const score = gameTasteScore(game, myLogs, tasteGenres, tasteMoods);
  if (!score) return 64;
  return Math.min(98, 70 + score * 3);
}

function sortByNewest(a: { created_at?: string }, b: { created_at?: string }) {
  return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
}

export default function GameLogApp() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const connected = Boolean(supabase && hasSupabaseEnv());
  const rawgApiKey = process.env.NEXT_PUBLIC_RAWG_API_KEY ?? "";

  const [view, setView] = useState<View>("home");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [discoverMode, setDiscoverMode] = useState<DiscoverMode>("forYou");
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverGenre, setDiscoverGenre] = useState("All");
  const [discoverMood, setDiscoverMood] = useState<DiscoveryMood>("All");
  const [discoverIndex, setDiscoverIndex] = useState(0);
  const [tasteGenres, setTasteGenres] = useState<string[]>([]);
  const [tasteMoods, setTasteMoods] = useState<DiscoveryMood[]>([]);
  const [tasteOnboarded, setTasteOnboarded] = useState(false);
  const [discoveryActions, setDiscoveryActions] = useState<DiscoveryAction[]>([]);
  const [lastUndo, setLastUndo] = useState<UndoAction | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [rawgPage, setRawgPage] = useState(1);
  const [importingGames, setImportingGames] = useState(false);
  const [igdbQuery, setIgdbQuery] = useState("zelda");
  const [igdbLimit, setIgdbLimit] = useState("30");
  const [igdbOffset, setIgdbOffset] = useState(0);
  const [igdbImporting, setIgdbImporting] = useState(false);
  const [steamQuery, setSteamQuery] = useState("elden ring");
  const [steamImportLimit, setSteamImportLimit] = useState("30");
  const [steamImporting, setSteamImporting] = useState(false);
  const [steamMegaImporting, setSteamMegaImporting] = useState(false);
  const [remoteCatalogEmpty, setRemoteCatalogEmpty] = useState(false);
  const [usingStarterFallback, setUsingStarterFallback] = useState(false);
  const [itchTitle, setItchTitle] = useState("");
  const [itchUrl, setItchUrl] = useState("");
  const [itchCoverUrl, setItchCoverUrl] = useState("");
  const [itchGenre, setItchGenre] = useState("Indie");
  const [itchPlatforms, setItchPlatforms] = useState("PC, Web");
  const [bulkImportText, setBulkImportText] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<Message>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(demoProfile);
  const [profiles, setProfiles] = useState<Profile[]>([demoProfile, ...demoFriends]);
  const [follows, setFollows] = useState<Follow[]>([{ follower_id: demoProfile.id, following_id: "demo-friend" }]);
  const [games, setGames] = useState<Game[]>(starterGames);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [lists, setLists] = useState<GameList[]>([]);

  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [logGameId, setLogGameId] = useState("");
  const [logStatus, setLogStatus] = useState("Currently Playing");
  const [rating, setRating] = useState("4");
  const [vibe, setVibe] = useState("Masterpiece");
  const [playedOn, setPlayedOn] = useState(today());
  const [review, setReview] = useState("");

  const [customTitle, setCustomTitle] = useState("");
  const [customGenre, setCustomGenre] = useState("");
  const [customPlatform, setCustomPlatform] = useState("");
  const [customSummary, setCustomSummary] = useState("");

  const [profileName, setProfileName] = useState(profile.display_name);
  const [profileUsername, setProfileUsername] = useState(profile.username);
  const [profileBio, setProfileBio] = useState(profile.bio ?? "");
  const [profileFavorite, setProfileFavorite] = useState(profile.favorite_game ?? "");

  const [listTitle, setListTitle] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [selectedList, setSelectedList] = useState("");
  const [selectedListGame, setSelectedListGame] = useState("");

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const currentUserId = userId ?? profile.id;
  const signedIn = connected ? Boolean(userId) : true;

  const followingIds = useMemo(() => new Set(follows.filter((follow) => follow.follower_id === currentUserId).map((follow) => follow.following_id)), [follows, currentUserId]);

  const myLogs = useMemo(() => logs.filter((log) => log.user_id === currentUserId), [logs, currentUserId]);
  const avgRating = useMemo(() => {
    const rated = myLogs.filter((log) => log.rating !== null && log.rating !== undefined);
    if (!rated.length) return "0.0";
    return (rated.reduce((sum, log) => sum + Number(log.rating), 0) / rated.length).toFixed(1);
  }, [myLogs]);

  const completedCount = myLogs.filter((log) => log.status === "Completed" || log.status === "100% Completed").length;
  const backlogCount = myLogs.filter((log) => log.status === "Backlog" || log.status === "Want to Play").length;
  const followingCount = follows.filter((follow) => follow.follower_id === currentUserId).length;
  const followerCount = follows.filter((follow) => follow.following_id === currentUserId).length;
  const genres = useMemo(() => ["All", ...Array.from(new Set(games.map((game) => game.genre).filter(Boolean) as string[])).sort()], [games]);
  const coverCount = useMemo(() => games.filter((game) => Boolean(getEffectiveCoverUrl(game))).length, [games]);
  const starterTasteGenres = useMemo(() => genres.filter((item) => item !== "All").slice(0, 14), [genres]);
  const loggedGameIds = useMemo(() => new Set(myLogs.map((log) => log.game_id)), [myLogs]);
  const passedGameIds = useMemo(() => new Set(discoveryActions.filter((action) => action.action === "Pass").map((action) => action.game_id)), [discoveryActions]);
  const discoveryHistory = useMemo(() => discoveryActions.map((action) => ({ ...action, games: games.find((game) => game.id === action.game_id) ?? action.games ?? null })).sort(sortByNewest), [discoveryActions, games]);

  const discoverPool = useMemo(() => {
    const needle = discoverQuery.toLowerCase();
    const pool = games
      .filter((game) => discoverGenre === "All" || game.genre === discoverGenre)
      .filter((game) => discoverMood === "All" || gameMoodTags(game).includes(discoverMood))
      .filter((game) => {
        if (discoverMode === "forYou") return !loggedGameIds.has(game.id) && !passedGameIds.has(game.id);
        if (discoverMode === "fresh") return !loggedGameIds.has(game.id) && !passedGameIds.has(game.id);
        if (discoverMode === "passed") return passedGameIds.has(game.id);
        if (discoverMode === "backlog") return myLogs.some((log) => log.game_id === game.id && ["Backlog", "Want to Play"].includes(log.status));
        return true;
      })
      .filter((game) => {
        if (!needle) return true;
        return [game.title, game.developer, game.genre, game.summary, ...(game.platforms ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });

    if (discoverMode !== "forYou") return pool;

    return [...pool].sort((a, b) => {
      const scoreA = gameTasteScore(a, myLogs, tasteGenres, tasteMoods);
      const scoreB = gameTasteScore(b, myLogs, tasteGenres, tasteMoods);
      return scoreB - scoreA || Number(Boolean(getEffectiveCoverUrl(b))) - Number(Boolean(getEffectiveCoverUrl(a))) || a.title.localeCompare(b.title);
    });
  }, [discoverGenre, discoverMode, discoverMood, discoverQuery, games, loggedGameIds, myLogs, passedGameIds, tasteGenres, tasteMoods]);

  const discoverGame = discoverPool.length ? discoverPool[discoverIndex % discoverPool.length] : null;
  const discoverReasons = discoverGame ? getDiscoveryReasons(discoverGame, myLogs) : [];
  const discoverMatch = discoverGame ? matchPercent(discoverGame, myLogs, tasteGenres, tasteMoods) : 0;
  const nextUpGames = useMemo(() => discoverPool.slice(discoverIndex + 1, discoverIndex + 4), [discoverIndex, discoverPool]);
  const recommendedGames = useMemo(() => {
    return games
      .filter((game) => game.id !== discoverGame?.id)
      .filter((game) => !loggedGameIds.has(game.id) && !passedGameIds.has(game.id))
      .map((game) => ({ game, score: gameTasteScore(game, myLogs, tasteGenres, tasteMoods) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.game.title.localeCompare(b.game.title))
      .slice(0, 5)
      .map((item) => item.game);
  }, [discoverGame?.id, games, loggedGameIds, myLogs, passedGameIds, tasteGenres, tasteMoods]);

  const filteredGames = useMemo(() => {
    const needle = query.toLowerCase();
    return games
      .filter((game) => genre === "All" || game.genre === genre)
      .filter((game) => {
        if (!needle) return true;
        return [game.title, game.developer, game.genre, game.summary, ...(game.platforms ?? [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [games, genre, query]);

  const feedLogs = useMemo(() => {
    if (feedFilter === "mine") return logs.filter((log) => log.user_id === currentUserId);
    if (feedFilter === "following") return logs.filter((log) => log.user_id === currentUserId || followingIds.has(log.user_id));
    return logs;
  }, [currentUserId, feedFilter, followingIds, logs]);

  const people = useMemo(() => {
    const seen = new Set<string>();
    return profiles
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => (a.id === currentUserId ? -1 : b.id === currentUserId ? 1 : a.display_name.localeCompare(b.display_name)));
  }, [currentUserId, profiles]);

  const selectedGame = useMemo(() => games.find((game) => game.id === selectedGameId) ?? null, [games, selectedGameId]);

  const trendingLogs = useMemo(() => {
    return [...logs]
      .sort((a, b) => {
        const scoreA = (a.review_likes?.length ?? 0) * 3 + (a.comments?.length ?? 0) * 2 + new Date(a.created_at ?? 0).getTime() / 1000000000000;
        const scoreB = (b.review_likes?.length ?? 0) * 3 + (b.comments?.length ?? 0) * 2 + new Date(b.created_at ?? 0).getTime() / 1000000000000;
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }, [logs]);

  const topGames = useMemo(() => {
    return games
      .map((game) => {
        const gameLogs = logs.filter((log) => log.game_id === game.id && log.rating !== null && log.rating !== undefined);
        const average = gameLogs.length ? gameLogs.reduce((sum, log) => sum + Number(log.rating), 0) / gameLogs.length : 0;
        return { game, average, count: gameLogs.length };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.average - a.average || b.count - a.count)
      .slice(0, 4);
  }, [games, logs]);

  const homeTrendingGames = useMemo(() => {
    if (topGames.length) return topGames.map((item) => item.game).slice(0, 6);
    return [...games]
      .sort((a, b) => Number(Boolean(getEffectiveCoverUrl(b))) - Number(Boolean(getEffectiveCoverUrl(a))) || (b.release_year ?? 0) - (a.release_year ?? 0) || a.title.localeCompare(b.title))
      .slice(0, 6);
  }, [games, topGames]);

  const favoriteShelfGames = useMemo(() => {
    const picks: Game[] = [];
    const addPick = (game?: Game | null) => {
      if (!game || picks.some((item) => item.id === game.id)) return;
      picks.push(game);
    };

    if (profile.favorite_game) {
      const favoriteNeedle = profile.favorite_game.toLowerCase();
      addPick(games.find((game) => game.title.toLowerCase() === favoriteNeedle));
      addPick(games.find((game) => game.title.toLowerCase().includes(favoriteNeedle) || favoriteNeedle.includes(game.title.toLowerCase())));
    }

    [...myLogs]
      .filter((log) => log.games && (Number(log.rating ?? 0) >= 4.5 || ["Completed", "100% Completed"].includes(log.status)))
      .sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0) || new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .forEach((log) => addPick(log.games));

    homeTrendingGames.forEach(addPick);
    return picks.slice(0, 5);
  }, [games, homeTrendingGames, myLogs, profile.favorite_game]);

  const profileNeedsSetup = signedIn && (profile.display_name === "New Player" || !profile.favorite_game || !profile.bio);
  const recentReviews = useMemo(() => logs.filter((log) => Boolean(log.review?.trim())).slice(0, 5), [logs]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function boot() {
      if (!connected || !supabase) {
        const state = loadDemoState();
        setUsingStarterFallback(false);
        setRemoteCatalogEmpty(false);
        setGames(state.games.map((game) => withKnownCover(game)));
        setLogs(state.logs);
        setLists(state.lists);
        setProfile(state.profile);
        setProfiles([state.profile, ...demoFriends]);
        setFollows([{ follower_id: state.profile.id, following_id: "demo-friend" }]);
        setUserId(state.profile.id);
        setProfileName(state.profile.display_name);
        setProfileUsername(state.profile.username);
        setProfileBio(state.profile.bio ?? "");
        setProfileFavorite(state.profile.favorite_game ?? "");
        setLogGameId(state.games[0]?.id ?? "");
        setSelectedListGame(state.games[0]?.id ?? "");
        setSelectedList(state.lists[0]?.id ?? "");
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      setUserId(sessionData.session?.user.id ?? null);
      await loadRemoteData(sessionData.session?.user.id ?? null);
      setLoading(false);

      const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        setUserId(session?.user.id ?? null);
        await loadRemoteData(session?.user.id ?? null);
      });

      unsubscribe = () => listener.subscription.unsubscribe();
    }

    boot();
    return () => unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, supabase]);

  useEffect(() => {
    if (!connected && !loading) {
      saveDemoState({ games, logs, lists, profile });
    }
  }, [connected, games, lists, loading, logs, profile]);

  useEffect(() => {
    if (!logGameId && games.length) setLogGameId(games[0].id);
    if (!selectedListGame && games.length) setSelectedListGame(games[0].id);
  }, [games, logGameId, selectedListGame]);

  useEffect(() => {
    setDiscoverIndex(0);
  }, [discoverMode, discoverGenre, discoverMood, discoverQuery]);

  useEffect(() => {
    if (!currentUserId || loading) return;
    try {
      const saved = window.localStorage.getItem(discoveryStorageKey(currentUserId));
      setDiscoveryActions(saved ? JSON.parse(saved) : []);
      setLastUndo(null);
    } catch {
      setDiscoveryActions([]);
    }
  }, [currentUserId, loading]);


  useEffect(() => {
    if (!currentUserId || loading) return;
    try {
      const saved = window.localStorage.getItem(tasteStorageKey(currentUserId));
      if (!saved) {
        setTasteGenres([]);
        setTasteMoods([]);
        setTasteOnboarded(false);
        return;
      }
      const parsed = JSON.parse(saved) as { genres?: string[]; moods?: DiscoveryMood[]; onboarded?: boolean };
      setTasteGenres(parsed.genres ?? []);
      setTasteMoods((parsed.moods ?? []).filter((mood) => mood !== "All"));
      setTasteOnboarded(Boolean(parsed.onboarded));
    } catch {
      setTasteGenres([]);
      setTasteMoods([]);
      setTasteOnboarded(false);
    }
  }, [currentUserId, loading]);

  useEffect(() => {
    if (!currentUserId || loading) return;
    try {
      window.localStorage.setItem(tasteStorageKey(currentUserId), JSON.stringify({ genres: tasteGenres, moods: tasteMoods, onboarded: tasteOnboarded }));
    } catch {
      // Taste setup is optional; ignore storage failures.
    }
  }, [currentUserId, loading, tasteGenres, tasteMoods, tasteOnboarded]);

  useEffect(() => {
    if (!currentUserId || loading) return;
    try {
      window.localStorage.setItem(discoveryStorageKey(currentUserId), JSON.stringify(discoveryActions.slice(0, 500)));
    } catch {
      // Ignore local storage failures; discovery still works for this session.
    }
  }, [currentUserId, discoveryActions, loading]);


  useEffect(() => {
    if (view !== "discover") return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowLeft" && discoverGame) passDiscoverGame(discoverGame);
      if (event.key === "ArrowRight" && discoverGame) quickLogGame(discoverGame, "Backlog");
      if (event.key === "1" && discoverGame) quickLogGame(discoverGame, "Want to Play");
      if (event.key === "2" && discoverGame) quickLogGame(discoverGame, "Backlog");
      if (event.key === "3" && discoverGame) quickLogGame(discoverGame, "Currently Playing");
      if (event.key === "4" && discoverGame) quickLogGame(discoverGame, "Completed");
      if (event.key.toLowerCase() === "u") undoLastDiscoveryAction();
      if (event.key.toLowerCase() === "r") randomDiscover();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, discoverGame, lastUndo, discoverPool.length]);

  async function loadRemoteData(currentUserId: string | null) {
    if (!supabase) return;

    const [gamesResult, logsResult, listsResult, profilesResult, followsResult] = await Promise.all([
      supabase.from("games").select("*").order("title"),
      supabase
        .from("game_logs")
        .select("*, games(*), profiles(username, display_name, avatar_url), review_likes(user_id), comments(id, user_id, log_id, body, created_at, profiles(username, display_name, avatar_url))")
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("game_lists")
        .select("*, profiles(username, display_name), list_items(id, games(*))")
        .order("created_at", { ascending: false })
        .limit(60),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(80),
      currentUserId ? supabase.from("follows").select("*").eq("follower_id", currentUserId) : Promise.resolve({ data: [], error: null })
    ]);

    if (gamesResult.error) setMessage({ type: "error", text: gamesResult.error.message });
    if (logsResult.error) setMessage({ type: "error", text: logsResult.error.message });
    if (listsResult.error) setMessage({ type: "error", text: listsResult.error.message });
    if (profilesResult.error) setMessage({ type: "error", text: profilesResult.error.message });
    if (followsResult.error) setMessage({ type: "error", text: followsResult.error.message });

    const loadedGames = (((gamesResult.data as Game[]) ?? []).map((game) => withKnownCover(game))) as Game[];
    const fallbackGames = starterGames.map((game) => withKnownCover(game)) as Game[];
    const visibleGames = loadedGames.length ? loadedGames : fallbackGames;
    setRemoteCatalogEmpty(!loadedGames.length);
    setUsingStarterFallback(!loadedGames.length);
    setGames(visibleGames);
    setLogs(((logsResult.data as GameLog[]) ?? []).map((log) => ({ ...log, comments: [...(log.comments ?? [])].sort(sortByNewest) })));
    setLists((listsResult.data as GameList[]) ?? []);
    setProfiles((profilesResult.data as Profile[]) ?? []);
    setFollows((followsResult.data as Follow[]) ?? []);
    setLogGameId(visibleGames[0]?.id ?? "");
    setSelectedListGame(visibleGames[0]?.id ?? "");

    if (!loadedGames.length) {
      setMessage({ type: "info", text: "Your Supabase catalog is empty, so GameLog is showing the built-in starter catalog locally. Click Install starter catalog in Sources to make the games real in your database." });
    }

    if (currentUserId) {
      const { data: existingProfile, error } = await supabase.from("profiles").select("*").eq("id", currentUserId).maybeSingle();
      if (error) setMessage({ type: "error", text: error.message });
      const nextProfile = (existingProfile as Profile | null) ?? {
        id: currentUserId,
        username: `player_${currentUserId.slice(0, 6)}`,
        display_name: "New Player",
        bio: "",
        favorite_game: ""
      };
      setProfile(nextProfile);
      setProfiles((current) => [nextProfile, ...current.filter((item) => item.id !== nextProfile.id)]);
      setProfileName(nextProfile.display_name);
      setProfileUsername(nextProfile.username);
      setProfileBio(nextProfile.bio ?? "");
      setProfileFavorite(nextProfile.favorite_game ?? "");
    }
  }

  function requireSignIn(action = "do that") {
    if (connected && !userId) {
      setMessage({ type: "error", text: `Sign in before you ${action}.` });
      setView("profile");
      return false;
    }
    return true;
  }

  async function handleAuth() {
    if (!supabase) return;
    setMessage(null);

    const authCall = authMode === "signup"
      ? supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
      : supabase.auth.signInWithPassword({ email, password });

    const { error } = await authCall;
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setMessage({
      type: "ok",
      text: authMode === "signup" ? "Account created. Check your email if confirmation is enabled." : "Signed in."
    });
    setPassword("");
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUserId(null);
    setMessage({ type: "info", text: "Signed out." });
  }

  function resetLogForm() {
    setEditingLogId(null);
    setLogStatus("Currently Playing");
    setRating("4");
    setVibe("Masterpiece");
    setPlayedOn(today());
    setReview("");
  }

  function startEditLog(log: GameLog) {
    setEditingLogId(log.id);
    setLogGameId(log.game_id);
    setLogStatus(log.status);
    setRating(log.rating === null || log.rating === undefined ? "" : String(log.rating));
    setVibe(log.vibe || "Masterpiece");
    setPlayedOn(log.played_on || today());
    setReview(log.review || "");
    setView("log");
  }

  function isRemoteUuid(id: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }

  async function ensureGameInRemoteCatalog(game: Game) {
    if (!connected || !supabase) return game;
    if (!requireSignIn(`save ${game.title} to the catalog`)) return null;
    if (isRemoteUuid(game.id)) return game;

    const slug = (game.slug || makeSlug(game.title)).toLowerCase();
    const existing = await supabase.from("games").select("*").eq("slug", slug).maybeSingle();
    if (existing.error) {
      setMessage({ type: "error", text: existing.error.message });
      return null;
    }
    if (existing.data) return withKnownCover(existing.data as Game) as Game;

    const coverUrl = getEffectiveCoverUrl(game);
    const { data, error } = await supabase
      .from("games")
      .insert({
        title: game.title,
        slug,
        developer: game.developer ?? "GameLog starter catalog",
        publisher: game.publisher ?? null,
        release_year: game.release_year ?? null,
        genre: game.genre ?? "Game",
        platforms: game.platforms?.length ? game.platforms : ["Unknown"],
        cover_url: coverUrl,
        summary: game.summary ?? null,
        created_by: userId,
        is_community: true
      })
      .select("*")
      .single();

    if (error) {
      setMessage({ type: "error", text: error.message });
      return null;
    }

    const remoteGame = withKnownCover(data as Game) as Game;
    setGames((current) => [remoteGame, ...current.filter((item) => (item.slug || item.id) !== (remoteGame.slug || remoteGame.id) && item.id !== game.id)]);
    return remoteGame;
  }

  async function saveLog() {
    const game = games.find((item) => item.id === logGameId);
    if (!game) return;
    const remoteReadyGame = connected ? await ensureGameInRemoteCatalog(game) : game;
    if (!remoteReadyGame) return;
    const numericRating = rating ? Number(rating) : null;
    const payload = {
      game_id: remoteReadyGame.id,
      status: logStatus,
      rating: numericRating,
      review,
      vibe,
      played_on: playedOn || null
    };

    if (connected && supabase) {
      if (!requireSignIn(editingLogId ? "edit logs" : "log games")) return;
      const result = editingLogId
        ? await supabase.from("game_logs").update(payload).eq("id", editingLogId)
        : await supabase.from("game_logs").insert({ ...payload, user_id: userId });

      if (result.error) {
        setMessage({ type: "error", text: result.error.message });
        return;
      }
      await loadRemoteData(userId);
    } else if (editingLogId) {
      setLogs((current) => current.map((log) => log.id === editingLogId ? {
        ...log,
        ...payload,
        games: remoteReadyGame,
        updated_at: new Date().toISOString()
      } : log));
    } else {
      const newLog: GameLog = {
        id: crypto.randomUUID(),
        user_id: profile.id,
        ...payload,
        created_at: new Date().toISOString(),
        games: remoteReadyGame,
        profiles: profile,
        review_likes: [],
        comments: []
      };
      setLogs((current) => [newLog, ...current]);
    }

    const action = editingLogId ? "updated" : "added to your GameLog";
    resetLogForm();
    setMessage({ type: "ok", text: `${remoteReadyGame.title} was ${action}.` });
    setFeedFilter("all");
    setView("feed");
  }

  async function addCustomGame() {
    if (!customTitle.trim()) return;
    const newGame: Game = {
      id: connected ? crypto.randomUUID() : makeSlug(customTitle) || crypto.randomUUID(),
      title: customTitle.trim(),
      slug: makeSlug(customTitle),
      genre: customGenre.trim() || "Community",
      platforms: customPlatform ? customPlatform.split(",").map((item) => item.trim()).filter(Boolean) : ["Unknown"],
      summary: customSummary.trim() || null,
      is_community: true,
      created_by: userId ?? profile.id
    };

    if (connected && supabase) {
      if (!requireSignIn("add community games")) return;
      const { data, error } = await supabase
        .from("games")
        .insert({ ...newGame, id: undefined })
        .select("*")
        .single();

      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }
      setGames((current) => [...current, data as Game]);
      setLogGameId((data as Game).id);
    } else {
      setGames((current) => [...current, newGame]);
      setLogGameId(newGame.id);
    }

    setCustomTitle("");
    setCustomGenre("");
    setCustomPlatform("");
    setCustomSummary("");
    setMessage({ type: "ok", text: "Game added to the catalog." });
  }

  async function saveProfile() {
    const nextProfile: Profile = {
      ...profile,
      id: userId ?? profile.id,
      display_name: profileName.trim() || "Player",
      username: profileUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "player",
      bio: profileBio,
      favorite_game: profileFavorite
    };

    if (connected && supabase) {
      if (!requireSignIn("save a profile")) return;
      const { error } = await supabase.from("profiles").upsert(nextProfile);
      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }
    }

    setProfile(nextProfile);
    setProfiles((current) => [nextProfile, ...current.filter((item) => item.id !== nextProfile.id)]);
    setLogs((current) => current.map((log) => log.user_id === nextProfile.id ? { ...log, profiles: nextProfile } : log));
    setMessage({ type: "ok", text: "Profile saved." });
  }

  async function deleteLog(logId: string) {
    if (connected && supabase) {
      const { error } = await supabase.from("game_logs").delete().eq("id", logId);
      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }
    }
    setLogs((current) => current.filter((log) => log.id !== logId));
    if (editingLogId === logId) resetLogForm();
  }

  async function toggleLike(logId: string) {
    if (!requireSignIn("like reviews")) return;
    const liked = logs.find((log) => log.id === logId)?.review_likes?.some((like) => like.user_id === currentUserId);

    if (connected && supabase) {
      const result = liked
        ? await supabase.from("review_likes").delete().eq("log_id", logId).eq("user_id", userId)
        : await supabase.from("review_likes").insert({ log_id: logId, user_id: userId });
      if (result.error) {
        setMessage({ type: "error", text: result.error.message });
        return;
      }
      await loadRemoteData(userId);
      return;
    }

    setLogs((current) => current.map((log) => {
      if (log.id !== logId) return log;
      const likes = log.review_likes ?? [];
      return {
        ...log,
        review_likes: liked ? likes.filter((like) => like.user_id !== currentUserId) : [...likes, { user_id: currentUserId, log_id: logId }]
      };
    }));
  }

  async function addComment(logId: string) {
    if (!requireSignIn("comment")) return;
    const body = commentDrafts[logId]?.trim();
    if (!body) return;

    if (connected && supabase) {
      const { error } = await supabase.from("comments").insert({ log_id: logId, user_id: userId, body });
      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }
      setCommentDrafts((current) => ({ ...current, [logId]: "" }));
      await loadRemoteData(userId);
      return;
    }

    const newComment: ReviewComment = {
      id: crypto.randomUUID(),
      user_id: currentUserId,
      log_id: logId,
      body,
      created_at: new Date().toISOString(),
      profiles: profile
    };
    setLogs((current) => current.map((log) => log.id === logId ? { ...log, comments: [newComment, ...(log.comments ?? [])] } : log));
    setCommentDrafts((current) => ({ ...current, [logId]: "" }));
  }

  async function deleteComment(commentId: string) {
    if (connected && supabase) {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }
      await loadRemoteData(userId);
      return;
    }

    setLogs((current) => current.map((log) => ({ ...log, comments: (log.comments ?? []).filter((comment) => comment.id !== commentId) })));
  }

  async function toggleFollow(targetId: string) {
    if (targetId === currentUserId) return;
    if (!requireSignIn("follow players")) return;
    const alreadyFollowing = follows.some((follow) => follow.follower_id === currentUserId && follow.following_id === targetId);

    if (connected && supabase) {
      const result = alreadyFollowing
        ? await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId)
        : await supabase.from("follows").insert({ follower_id: userId, following_id: targetId });
      if (result.error) {
        setMessage({ type: "error", text: result.error.message });
        return;
      }
      await loadRemoteData(userId);
      return;
    }

    setFollows((current) => alreadyFollowing
      ? current.filter((follow) => !(follow.follower_id === currentUserId && follow.following_id === targetId))
      : [...current, { follower_id: currentUserId, following_id: targetId }]
    );
  }

  async function createList() {
    if (!listTitle.trim()) return;

    if (connected && supabase) {
      if (!requireSignIn("create lists")) return;
      const { data, error } = await supabase
        .from("game_lists")
        .insert({ user_id: userId, title: listTitle, description: listDescription })
        .select("*, profiles(username, display_name), list_items(id, games(*))")
        .single();

      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }
      setLists((current) => [data as GameList, ...current]);
      setSelectedList((data as GameList).id);
    } else {
      const newList: GameList = {
        id: crypto.randomUUID(),
        user_id: profile.id,
        title: listTitle,
        description: listDescription,
        created_at: new Date().toISOString(),
        profiles: profile,
        list_items: []
      };
      setLists((current) => [newList, ...current]);
      setSelectedList(newList.id);
    }

    setListTitle("");
    setListDescription("");
    setMessage({ type: "ok", text: "List created." });
  }

  async function addGameToList() {
    const game = games.find((item) => item.id === selectedListGame);
    if (!selectedList || !game) return;

    if (connected && supabase) {
      if (!requireSignIn("edit lists")) return;
      const remoteReadyGame = await ensureGameInRemoteCatalog(game);
      if (!remoteReadyGame) return;
      const { error } = await supabase.from("list_items").insert({ list_id: selectedList, game_id: remoteReadyGame.id });
      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }
      await loadRemoteData(userId);
      setMessage({ type: "ok", text: `${game.title} added to the list.` });
      return;
    }

    setLists((current) => current.map((list) => {
      if (list.id !== selectedList) return list;
      if ((list.list_items ?? []).some((item) => item.games?.id === game.id)) return list;
      return {
        ...list,
        list_items: [...(list.list_items ?? []), { id: crypto.randomUUID(), games: game }]
      };
    }));
    setMessage({ type: "ok", text: `${game.title} added to the list.` });
  }

  function nextDiscover() {
    setDiscoverIndex((index) => index + 1);
  }

  function randomDiscover() {
    if (!discoverPool.length) return;
    setDiscoverIndex(Math.floor(Math.random() * discoverPool.length));
  }

  function recordDiscoveryAction(game: Game, action: DiscoveryActionName) {
    const newAction: DiscoveryAction = {
      id: crypto.randomUUID(),
      user_id: currentUserId,
      game_id: game.id,
      action,
      created_at: new Date().toISOString(),
      games: game
    };
    setDiscoveryActions((current) => [newAction, ...current.filter((item) => !(item.game_id === game.id && item.action === action))].slice(0, 500));
    return newAction;
  }

  function passDiscoverGame(game: Game) {
    const action = recordDiscoveryAction(game, "Pass");
    setLastUndo({ kind: "pass", action });
    setMessage({ type: "info", text: `Passed on ${game.title}. Hit Undo if that was a mistake.` });
    nextDiscover();
  }

  async function undoLastDiscoveryAction() {
    if (!lastUndo) return;

    if (lastUndo.kind === "pass") {
      setDiscoveryActions((current) => current.filter((action) => action.id !== lastUndo.action.id));
      setMessage({ type: "ok", text: `Undo: ${lastUndo.action.games?.title ?? "game"} is back in Discover.` });
      setLastUndo(null);
      return;
    }

    if (connected && supabase) {
      if (lastUndo.previousLog) {
        const { games: _game, profiles: _profile, review_likes: _likes, comments: _comments, ...previousPayload } = lastUndo.previousLog as any;
        const { error } = await supabase.from("game_logs").update(previousPayload).eq("id", lastUndo.previousLog.id);
        if (error) {
          setMessage({ type: "error", text: error.message });
          return;
        }
      } else if (lastUndo.newLogId) {
        const { error } = await supabase.from("game_logs").delete().eq("id", lastUndo.newLogId);
        if (error) {
          setMessage({ type: "error", text: error.message });
          return;
        }
      }
      await loadRemoteData(userId);
    } else if (lastUndo.previousLog) {
      setLogs((current) => [lastUndo.previousLog!, ...current.filter((log) => log.id !== lastUndo.previousLog!.id)].sort(sortByNewest));
    } else if (lastUndo.newLogId) {
      setLogs((current) => current.filter((log) => log.id !== lastUndo.newLogId));
    }

    setDiscoveryActions((current) => current.filter((action) => action.id !== lastUndo.action.id));
    setMessage({ type: "ok", text: `Undo: removed the last ${lastUndo.action.action} action.` });
    setLastUndo(null);
  }

  function clearPassedGames() {
    const passedCount = discoveryActions.filter((action) => action.action === "Pass").length;
    setDiscoveryActions((current) => current.filter((action) => action.action !== "Pass"));
    setLastUndo(null);
    setMessage({ type: "ok", text: `Cleared ${passedCount} passed games from your Discover memory.` });
  }

  function handleSwipeEnd(deltaX: number) {
    if (!discoverGame || Math.abs(deltaX) < 70) return;
    if (deltaX < 0) passDiscoverGame(discoverGame);
    if (deltaX > 0) quickLogGame(discoverGame, "Backlog");
  }

  async function quickLogGame(game: Game, status: string) {
    if (!requireSignIn(`mark ${game.title}`)) return;
    const remoteReadyGame = connected ? await ensureGameInRemoteCatalog(game) : game;
    if (!remoteReadyGame) return;

    const existing = myLogs.find((log) => log.game_id === remoteReadyGame.id && ["Want to Play", "Backlog", "Currently Playing"].includes(log.status));
    const payload = {
      game_id: remoteReadyGame.id,
      status,
      rating: null as number | null,
      review: "",
      vibe: status === "Backlog" || status === "Want to Play" ? "Backlog Pick" : "Quick Log",
      played_on: status === "Completed" ? today() : null
    };
    const action = recordDiscoveryAction(remoteReadyGame, status as DiscoveryActionName);
    let newLogId: string | null = null;

    if (connected && supabase) {
      if (existing) {
        const { error } = await supabase.from("game_logs").update(payload).eq("id", existing.id);
        if (error) {
          setDiscoveryActions((current) => current.filter((item) => item.id !== action.id));
          setMessage({ type: "error", text: error.message });
          return;
        }
      } else {
        const { data, error } = await supabase.from("game_logs").insert({ ...payload, user_id: userId }).select("id").single();
        if (error) {
          setDiscoveryActions((current) => current.filter((item) => item.id !== action.id));
          setMessage({ type: "error", text: error.message });
          return;
        }
        newLogId = data?.id ?? null;
      }
      await loadRemoteData(userId);
    } else if (existing) {
      setLogs((current) => current.map((log) => log.id === existing.id ? { ...log, ...payload, games: remoteReadyGame } : log));
    } else {
      newLogId = crypto.randomUUID();
      const newLog: GameLog = {
        id: newLogId,
        user_id: profile.id,
        ...payload,
        created_at: new Date().toISOString(),
        games: remoteReadyGame,
        profiles: profile,
        review_likes: [],
        comments: []
      };
      setLogs((current) => [newLog, ...current]);
    }

    setLastUndo({ kind: "quicklog", action, previousLog: existing ? { ...existing } : null, newLogId });
    setMessage({ type: "ok", text: `${remoteReadyGame.title} marked as ${status}.` });
    nextDiscover();
  }

  function sanitizeImportedGame(game: Partial<Game>): Partial<Game> | null {
    const title = game.title?.trim();
    if (!title) return null;
    const slug = (game.slug?.trim() || makeSlug(title)).toLowerCase();
    if (!slug) return null;
    return {
      title,
      slug,
      developer: game.developer ?? null,
      publisher: game.publisher ?? null,
      release_year: game.release_year ?? null,
      genre: game.genre?.trim() || "Game",
      platforms: Array.isArray(game.platforms) && game.platforms.length ? game.platforms : ["Unknown"],
      cover_url: game.cover_url?.trim() || getKnownCoverUrl({ title, slug }),
      summary: game.summary?.trim() || null,
      is_community: true
    };
  }

  async function importExternalGames(incomingGames: Partial<Game>[], sourceName: string, options: { ignoreVisibleDuplicates?: boolean } = {}) {
    if (connected && !requireSignIn(`import ${sourceName} games`)) return 0;

    const existingSlugs = new Set(options.ignoreVisibleDuplicates ? [] : games.map((game) => game.slug ?? game.id));
    const unique = incomingGames
      .map(sanitizeImportedGame)
      .filter((game): game is Partial<Game> => Boolean(game))
      .filter((game) => {
        const slug = game.slug ?? "";
        if (existingSlugs.has(slug)) return false;
        existingSlugs.add(slug);
        return true;
      });

    if (!unique.length) {
      setMessage({ type: "info", text: `No new ${sourceName} games to add. They may already be in your catalog.` });
      return 0;
    }

    if (connected && supabase) {
      const records = unique.map((game) => ({
        title: game.title,
        slug: game.slug,
        developer: game.developer,
        publisher: game.publisher,
        release_year: game.release_year,
        genre: game.genre,
        platforms: game.platforms,
        cover_url: game.cover_url,
        summary: game.summary,
        created_by: userId,
        is_community: true
      }));

      const { data, error } = await supabase.from("games").insert(records).select("*");
      if (error) {
        setMessage({ type: "error", text: error.message });
        return 0;
      }
      setGames((current) => [...current, ...((data as Game[]) ?? [])]);
      return (data ?? []).length;
    }

    const demoRecords = unique.map((game) => ({ ...game, id: crypto.randomUUID() })) as Game[];
    setGames((current) => [...current, ...demoRecords]);
    return demoRecords.length;
  }


  async function installStarterCatalog() {
    setImportingGames(true);
    setMessage(null);
    try {
      const starterWithCovers = starterGames.map((game) => withKnownCover(game));
      const added = await importExternalGames(starterWithCovers, "starter catalog", { ignoreVisibleDuplicates: usingStarterFallback || remoteCatalogEmpty });
      if (connected && supabase) await loadRemoteData(userId);
      setUsingStarterFallback(false);
      setRemoteCatalogEmpty(false);
      setMessage({ type: "ok", text: added ? `Installed ${added} starter games into Supabase with cover art fallbacks.` : "Starter catalog is already installed." });
    } finally {
      setImportingGames(false);
    }
  }

  const steamMegaTerms = [
    "call of duty", "souls", "grand theft auto", "minecraft", "survival", "horror", "farming",
    "strategy", "rpg", "co-op", "roguelike", "anime", "one piece", "simulation", "sports",
    "racing", "indie", "deckbuilder", "open world", "shooter", "city builder"
  ];

  async function importSteamMegaPack() {
    setSteamMegaImporting(true);
    setMessage({ type: "info", text: "Starting Steam mega import. This can take a minute because it searches a bunch of game categories." });
    let total = 0;
    try {
      for (const term of steamMegaTerms) {
        const response = await fetch(`/api/steam/search?q=${encodeURIComponent(term)}&limit=50`);
        if (!response.ok) continue;
        const body = await response.json();
        total += await importExternalGames(body.games ?? [], `Steam ${term}`);
      }
      if (connected && supabase) await loadRemoteData(userId);
      setMessage({ type: "ok", text: `Steam mega import added ${total} new games with capsule art. Run it again later with different searches to keep growing.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Steam mega import failed." });
    } finally {
      setSteamMegaImporting(false);
    }
  }

  async function importIgdbSearchGames() {
    const q = igdbQuery.trim();
    if (!q) {
      setMessage({ type: "info", text: "Search IGDB by title first. Example: zelda, mario, minecraft, one piece, horror." });
      return;
    }

    setIgdbImporting(true);
    setMessage(null);

    try {
      const limit = Math.max(5, Math.min(Number(igdbLimit) || 30, 75));
      const response = await fetch(`/api/igdb/search?q=${encodeURIComponent(q)}&limit=${limit}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `IGDB search failed with status ${response.status}.`);
      const added = await importExternalGames(body.games ?? [], "IGDB");
      if (added) setMessage({ type: "ok", text: `Imported ${added} IGDB games with real cover art and platform metadata.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "IGDB import failed." });
    } finally {
      setIgdbImporting(false);
    }
  }

  async function importIgdbPopularGames() {
    setIgdbImporting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/igdb/popular?offset=${igdbOffset}&limit=75`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `IGDB popular import failed with status ${response.status}.`);
      const added = await importExternalGames(body.games ?? [], "IGDB popular");
      setIgdbOffset(Number(body.nextOffset ?? igdbOffset + 75));
      if (added) setMessage({ type: "ok", text: `Imported ${added} popular IGDB games. Keep pressing it to build a huge catalog page by page.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "IGDB popular import failed." });
    } finally {
      setIgdbImporting(false);
    }
  }

  async function importSteamSearchGames() {
    const q = steamQuery.trim();
    if (!q) {
      setMessage({ type: "info", text: "Search Steam by title first. Example: souls, minecraft, farming, call of duty." });
      return;
    }

    setSteamImporting(true);
    setMessage(null);

    try {
      const limit = Math.max(5, Math.min(Number(steamImportLimit) || 30, 75));
      const response = await fetch(`/api/steam/search?q=${encodeURIComponent(q)}&limit=${limit}`);
      if (!response.ok) throw new Error(`Steam search failed with status ${response.status}.`);
      const body = await response.json();
      const added = await importExternalGames(body.games ?? [], "Steam");
      if (added) setMessage({ type: "ok", text: `Imported ${added} Steam games with Steam cover/capsule art. Search another term to keep expanding.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Steam import failed." });
    } finally {
      setSteamImporting(false);
    }
  }

  async function addItchGame() {
    if (!itchTitle.trim()) {
      setMessage({ type: "info", text: "Add an itch.io game title first." });
      return;
    }

    const added = await importExternalGames([
      {
        title: itchTitle,
        slug: `itch-${makeSlug(itchTitle)}`,
        developer: "itch.io import",
        publisher: null,
        release_year: null,
        genre: itchGenre || "Indie",
        platforms: itchPlatforms.split(",").map((item) => item.trim()).filter(Boolean),
        cover_url: itchCoverUrl || null,
        summary: itchUrl ? `Imported from itch.io: ${itchUrl}` : "Imported from itch.io."
      }
    ], "itch.io");

    if (added) {
      setItchTitle("");
      setItchUrl("");
      setItchCoverUrl("");
      setMessage({ type: "ok", text: "Added itch.io game with cover art." });
    }
  }

  async function importBulkGames() {
    const rows = bulkImportText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!rows.length) {
      setMessage({ type: "info", text: "Paste at least one game line first." });
      return;
    }

    const incoming = rows.map((line) => {
      const [title, coverUrl, sourceUrl, genreValue, platformValue] = line.split("|").map((part) => part?.trim() ?? "");
      return {
        title,
        slug: title ? makeSlug(title) : "",
        developer: sourceUrl ? "Bulk import" : "Community import",
        genre: genreValue || "Game",
        platforms: platformValue ? platformValue.split(",").map((item) => item.trim()).filter(Boolean) : ["Unknown"],
        cover_url: coverUrl || null,
        summary: sourceUrl ? `Imported source: ${sourceUrl}` : "Bulk imported game."
      };
    });

    const added = await importExternalGames(incoming, "bulk");
    if (added) {
      setBulkImportText("");
      setMessage({ type: "ok", text: `Bulk imported ${added} games.` });
    }
  }

  async function importRawgTrendingGames() {
    if (!rawgApiKey) {
      setMessage({ type: "info", text: "Add NEXT_PUBLIC_RAWG_API_KEY to .env.local to import real box art and a huge game catalog from RAWG." });
      return;
    }

    if (connected && !requireSignIn("import game data")) return;

    setImportingGames(true);
    setMessage(null);

    try {
      const response = await fetch(`https://api.rawg.io/api/games?key=${encodeURIComponent(rawgApiKey)}&page_size=40&page=${rawgPage}&ordering=-added`);
      if (!response.ok) throw new Error(`RAWG import failed with status ${response.status}.`);
      const body = await response.json();
      const existingSlugs = new Set(games.map((game) => game.slug ?? game.id));
      const incoming = ((body.results ?? []) as any[])
        .map(mapRawgGame)
        .filter((game): game is Game => Boolean(game))
        .filter((game) => !existingSlugs.has(game.slug ?? game.id));

      if (!incoming.length) {
        setRawgPage((page) => page + 1);
        setMessage({ type: "info", text: "That RAWG page did not add new games. Try importing again for the next page." });
        return;
      }

      if (connected && supabase) {
        const records = incoming.map((game) => ({
          title: game.title,
          slug: game.slug,
          developer: game.developer,
          publisher: game.publisher,
          release_year: game.release_year,
          genre: game.genre,
          platforms: game.platforms,
          cover_url: game.cover_url,
          summary: game.summary,
          created_by: userId,
          is_community: true
        }));

        const { data, error } = await supabase.from("games").insert(records).select("*");
        if (error) {
          setMessage({ type: "error", text: error.message });
          return;
        }
        setGames((current) => [...current, ...((data as Game[]) ?? [])]);
        setMessage({ type: "ok", text: `Imported ${(data ?? []).length} games with cover art from RAWG.` });
      } else {
        setGames((current) => [...current, ...incoming]);
        setMessage({ type: "ok", text: `Imported ${incoming.length} games with cover art from RAWG into demo mode.` });
      }

      setRawgPage((page) => page + 1);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "RAWG import failed." });
    } finally {
      setImportingGames(false);
    }
  }


  function toggleTasteGenre(item: string) {
    setTasteGenres((current) => current.includes(item) ? current.filter((genre) => genre !== item) : [...current, item].slice(0, 8));
  }

  function toggleTasteMood(item: DiscoveryMood) {
    if (item === "All") return;
    setTasteMoods((current) => current.includes(item) ? current.filter((mood) => mood !== item) : [...current, item].slice(0, 6));
  }

  function saveTasteSetup() {
    setTasteOnboarded(true);
    setDiscoverMode("forYou");
    setDiscoverIndex(0);
    setMessage({ type: "ok", text: "Taste setup saved. Your For You stream now prioritizes those genres and moods." });
  }

  function backlogRoulette() {
    const backlog = myLogs.filter((log) => log.status === "Backlog" || log.status === "Want to Play");
    const pick = backlog[Math.floor(Math.random() * backlog.length)];
    if (!pick?.games) {
      setMessage({ type: "info", text: "Add a few backlog games first, then roulette can pick your next one." });
      return;
    }
    setMessage({ type: "ok", text: `Tonight's pick: ${pick.games.title}. No more scrolling the backlog.` });
  }

  async function copyShareLink(path: string, label: string) {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ type: "ok", text: `${label} link copied.` });
    } catch {
      setMessage({ type: "info", text: url });
    }
  }

  function exportDemoData() {
    const payload = JSON.stringify({ profile, games, logs, lists }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "gamelog-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <main className="shell">
        <div className="hero-card">
          <p className="eyebrow">GameLog</p>
          <h1>Loading your library...</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="nav-inner">
          <button className="brand ghost" onClick={() => setView("home")} aria-label="GameLog home">
            <span className="logo">GL</span>
            <span>GameLog</span>
          </button>
          <nav className="nav-pills" aria-label="Main navigation">
            {[
              ["home", "Home"],
              ["discover", "Discover"],
              ["games", "Games"],
              ["log", "Log"],
              ["feed", "Feed"],
              ["lists", "Lists"],
              ["people", "People"],
              ["history", "History"],
              ["sources", "Sources"],
              ["profile", "Profile"]
            ].map(([key, label]) => (
              <button key={key} className={`pill ${view === key ? "active" : ""}`} onClick={() => setView(key as View)}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {message && (
        <div className={`notice ${message.type}`} role="status" style={{ marginBottom: 18 }}>
          {message.text}
        </div>
      )}

      {view === "home" && (
        <>
          <section className="hero">
            <div className="hero-card">
              <p className="eyebrow">Letterboxd energy, but for games</p>
              <h1>Track what you play. Review what hits. Attack the backlog.</h1>
              <p className="lede">
                GameLog is now built around fast mobile discovery: swipe through cover-art cards, save what looks good, pass what does not, and turn the backlog into a social game diary.
              </p>
              <div className="actions">
                <button className="primary" onClick={() => setView("discover")}><Sparkles size={18} /> Start swiping</button>
                <button className="secondary" onClick={() => setView("log")}><Gamepad2 size={18} /> Log a game</button>
                <button className="secondary" onClick={() => setView("feed")}><Sparkles size={18} /> View feed</button>
                <button className="secondary" onClick={() => setView("people")}><Users size={18} /> Find players</button>
              </div>
            </div>
            <div className="side-panel card">
              <div className="status-banner">
                <span className={`status-dot ${connected ? "connected" : ""}`} />
                <div>
                  <strong>{connected ? "Supabase connected" : "Demo mode active"}</strong>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    {connected
                      ? "Auth, database, reviews, comments, likes, and follows are using your Supabase project."
                      : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to use real accounts and cloud data."}
                  </p>
                </div>
              </div>
              <div className="stats">
                <div className="stat"><strong>{games.length}</strong><span>Games</span></div>
                <div className="stat"><strong>{coverCount}</strong><span>With covers</span></div>
                <div className="stat"><strong>{myLogs.length}</strong><span>Your logs</span></div>
                <div className="stat"><strong>{avgRating}</strong><span>Avg rating</span></div>
                <div className="stat"><strong>{followingCount}</strong><span>Following</span></div>
              </div>
              <button className="secondary" onClick={backlogRoulette}>Backlog roulette</button>
            </div>
          </section>

          {profileNeedsSetup && (
            <section className="onboarding-strip card">
              <div>
                <p className="eyebrow">Finish your public profile</p>
                <h2>Make GameLog feel like yours</h2>
                <p className="muted">Add a username vibe, favorite game, and a quick bio so reviews, follows, and share links look real.</p>
              </div>
              <div className="actions onboarding-actions">
                <button className="primary" onClick={() => setView("profile")}><UserRound size={18} /> Edit profile</button>
                <button className="secondary" onClick={() => setView("discover")}><Sparkles size={18} /> Build taste first</button>
              </div>
            </section>
          )}

          <section className="home-rails grid">
            <div className="col-8 card social-home-card">
              <div className="review-top">
                <div>
                  <p className="eyebrow">Trending now</p>
                  <h2>Games people should be logging</h2>
                </div>
                <button className="pill" onClick={() => setView("discover")}>Swipe these</button>
              </div>
              <CoverRail games={homeTrendingGames} onPick={(game) => { setSelectedGameId(game.id); setView("discover"); }} />
            </div>
            <div className="col-4 card social-home-card">
              <div className="review-top">
                <div>
                  <p className="eyebrow">Your shelf</p>
                  <h2>Favorites row</h2>
                </div>
                <button className="pill" onClick={() => setView("profile")}>Edit</button>
              </div>
              <FavoriteShelf games={favoriteShelfGames} />
            </div>
          </section>

          <section className="grid">
            <div className="col-8 card">
              <div className="review-top">
                <h2>Recent activity</h2>
                <button className="pill" onClick={() => { setFeedFilter("all"); setView("feed"); }}>Open feed</button>
              </div>
              <Feed
                logs={logs.slice(0, 4)}
                currentUserId={currentUserId}
                signedIn={signedIn}
                commentDrafts={commentDrafts}
                setCommentDrafts={setCommentDrafts}
                onDelete={deleteLog}
                onEdit={startEditLog}
                onLike={toggleLike}
                onComment={addComment}
                onDeleteComment={deleteComment}
                onShare={(log) => copyShareLink(`/r/${log.id}`, "Review")}
              />
            </div>
            <div className="col-4 card">
              <h2>Your profile</h2>
              <ProfileMini profile={profile} completedCount={completedCount} backlogCount={backlogCount} avgRating={avgRating} followerCount={followerCount} followingCount={followingCount} />
              <div className="divider" />
              <p className="muted">v1.2 adds the social layer: a cleaner homepage, trending games, favorite shelves, share links, polished review cards, and better onboarding.</p>
              <div className="divider" />
              <h3>Top rated here</h3>
              <MiniTopGames games={topGames} />
            </div>
          </section>
        </>
      )}

      {view === "discover" && (
        <section className="discover-layout discover-layout-v11">
          <div className="discover-main card discover-main-v11">
            <div className="review-top discover-header discover-header-v11">
              <div>
                <p className="eyebrow">Mobile-first Discover</p>
                <h2>Swipe through games fast</h2>
                <p className="muted" style={{ marginBottom: 0 }}>Right saves it. Left passes it. Tap details when a cover catches you.</p>
              </div>
              <div className="discover-counter">
                <span className="tag">{discoverPool.length ? `${(discoverIndex % discoverPool.length) + 1}/${discoverPool.length}` : "0 games"}</span>
                {discoverGame && <span className="match-pill"><Zap size={14} /> {discoverMatch}% match</span>}
              </div>
            </div>

            {!tasteOnboarded && (
              <section className="taste-onboarding">
                <div>
                  <p className="eyebrow">First run setup</p>
                  <h3>Pick what you actually want to see</h3>
                  <p className="muted">This stays local for now and powers the For You stream. Pick a few genres and moods, then start swiping.</p>
                </div>
                <div className="taste-section">
                  <strong>Genres</strong>
                  <div className="taste-grid">
                    {starterTasteGenres.map((item) => (
                      <button key={item} className={`taste-chip ${tasteGenres.includes(item) ? "selected" : ""}`} onClick={() => toggleTasteGenre(item)}>{item}</button>
                    ))}
                  </div>
                </div>
                <div className="taste-section">
                  <strong>Moods</strong>
                  <div className="taste-grid">
                    {discoveryMoods.filter((item) => item !== "All").map((item) => (
                      <button key={item} className={`taste-chip ${tasteMoods.includes(item) ? "selected" : ""}`} onClick={() => toggleTasteMood(item)}>{item}</button>
                    ))}
                  </div>
                </div>
                <div className="actions" style={{ marginTop: 14 }}>
                  <button className="primary" onClick={saveTasteSetup}><SlidersHorizontal size={17} /> Save taste setup</button>
                  <button className="secondary" onClick={() => setTasteOnboarded(true)}>Skip for now</button>
                </div>
              </section>
            )}

            <div className="discover-filters discover-filters-v11">
              <div className="segmented mode-strip">
                <button className={`pill ${discoverMode === "forYou" ? "active" : ""}`} onClick={() => setDiscoverMode("forYou")}><Flame size={15} /> For You</button>
                <button className={`pill ${discoverMode === "fresh" ? "active" : ""}`} onClick={() => setDiscoverMode("fresh")}>Fresh</button>
                <button className={`pill ${discoverMode === "all" ? "active" : ""}`} onClick={() => setDiscoverMode("all")}>All</button>
                <button className={`pill ${discoverMode === "backlog" ? "active" : ""}`} onClick={() => setDiscoverMode("backlog")}>Backlog</button>
                <button className={`pill ${discoverMode === "passed" ? "active" : ""}`} onClick={() => setDiscoverMode("passed")}>Passed</button>
              </div>
              <div className="form-grid three compact-filter-grid">
                <div className="field">
                  <label><Search size={14} /> Search stream</label>
                  <input value={discoverQuery} onChange={(event) => setDiscoverQuery(event.target.value)} placeholder="soulslike, cozy, shooter..." />
                </div>
                <div className="field">
                  <label>Genre</label>
                  <select value={discoverGenre} onChange={(event) => setDiscoverGenre(event.target.value)}>
                    {genres.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Mood</label>
                  <select value={discoverMood} onChange={(event) => setDiscoverMood(event.target.value as DiscoveryMood)}>
                    {discoveryMoods.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="deck-wrap">
              {nextUpGames.map((game, index) => <div key={game.id} className={`deck-shadow-card deck-${index + 1}`}><GameCover game={game} variant="hero" /></div>)}
              {discoverGame ? (
                <article
                  className={`swipe-card swipe-card-v11 ${dragOffset > 70 ? "swiping-right" : dragOffset < -70 ? "swiping-left" : ""}`}
                  key={discoverGame.id}
                  style={{ transform: dragOffset ? `translateX(${dragOffset}px) rotate(${dragOffset / 24}deg)` : undefined }}
                  onTouchStart={(event) => { setTouchStartX(event.touches[0]?.clientX ?? null); setDragOffset(0); }}
                  onTouchMove={(event) => { if (touchStartX === null) return; setDragOffset((event.touches[0]?.clientX ?? touchStartX) - touchStartX); }}
                  onTouchEnd={() => { handleSwipeEnd(dragOffset); setTouchStartX(null); setDragOffset(0); }}
                >
                  <div className="swipe-badges">
                    <span className="swipe-badge pass-badge"><ChevronLeft size={18} /> PASS</span>
                    <span className="swipe-badge save-badge">SAVE <ChevronRight size={18} /></span>
                  </div>
                  <button className="cover-button" onClick={() => setSelectedGameId(discoverGame.id)} aria-label={`Open details for ${discoverGame.title}`}>
                    <GameCover game={discoverGame} variant="hero" />
                  </button>
                  <div className="swipe-info swipe-info-v11">
                    <div className="review-top">
                      <div>
                        <h2>{discoverGame.title}</h2>
                        <p className="muted" style={{ marginBottom: 0 }}>{discoverGame.release_year ?? "TBA"} · {discoverGame.genre ?? "Game"}</p>
                      </div>
                      {loggedGameIds.has(discoverGame.id) && <span className="tag">Already logged</span>}
                    </div>
                    <p className="lede swipe-summary">{discoverGame.summary ?? "No summary yet. Swipe it into your backlog if it looks interesting."}</p>
                    <div className="tag-row">
                      {discoverGame.developer && <span className="tag">{discoverGame.developer}</span>}
                      {(discoverGame.platforms ?? []).slice(0, 4).map((platform) => <span className="tag" key={platform}>{platform}</span>)}
                      {discoverReasons.map((reason) => <span className="tag reason-tag" key={reason}>{reason}</span>)}
                    </div>
                    <p className="swipe-hint">Swipe left/right · keyboard: ← pass, → save, 1 want, 2 backlog, 3 playing, 4 done, U undo</p>
                  </div>
                </article>
              ) : (
                <div className="empty big-empty">No games match this stream. Switch filters or import more games.</div>
              )}
            </div>

            <div className="discover-controls discover-controls-v11">
              <button className="secondary round-action pass-action" onClick={() => discoverGame && passDiscoverGame(discoverGame)} disabled={!discoverGame}><SkipForward size={22} /> Pass</button>
              <button className="secondary round-action" onClick={() => discoverGame && quickLogGame(discoverGame, "Want to Play")} disabled={!discoverGame}><Heart size={22} /> Want</button>
              <button className="primary round-action" onClick={() => discoverGame && quickLogGame(discoverGame, "Backlog")} disabled={!discoverGame}><BookmarkPlus size={22} /> Backlog</button>
              <button className="secondary round-action" onClick={() => discoverGame && quickLogGame(discoverGame, "Currently Playing")} disabled={!discoverGame}><Gamepad2 size={22} /> Playing</button>
              <button className="secondary round-action" onClick={() => discoverGame && quickLogGame(discoverGame, "Completed")} disabled={!discoverGame}><CheckCircle2 size={22} /> Done</button>
            </div>

            <div className="actions discover-secondary-actions">
              <button className="secondary" onClick={undoLastDiscoveryAction} disabled={!lastUndo}><RotateCcw size={16} /> Undo</button>
              <button className="secondary" onClick={randomDiscover} disabled={!discoverPool.length}><Shuffle size={16} /> Random</button>
              <button className="secondary" onClick={() => discoverGame && setSelectedGameId(discoverGame.id)} disabled={!discoverGame}>Details</button>
              <button className="secondary" onClick={() => setView("history")}><History size={16} /> History</button>
              <button className="secondary" onClick={clearPassedGames} disabled={!passedGameIds.size}>Clear passes</button>
              <button className="secondary" onClick={() => setTasteOnboarded(false)}><SlidersHorizontal size={16} /> Edit taste</button>
            </div>

            {selectedGame && (
              <GameDetailPanel
                game={selectedGame}
                logs={logs.filter((log) => log.game_id === selectedGame.id)}
                onClose={() => setSelectedGameId(null)}
                onLog={() => { setLogGameId(selectedGame.id); setView("log"); }}
              />
            )}
          </div>

          <aside className="discover-side card discover-side-v11">
            <h2>For You engine</h2>
            <p className="muted">v1.1 pushes GameLog toward the real hook: an endless, fast, personalized mobile feed for games with box art and one-tap logging.</p>
            <div className="stats compact-stats">
              <div className="stat"><strong>{games.length}</strong><span>Catalog</span></div>
              <div className="stat"><strong>{coverCount}</strong><span>Covers</span></div>
              <div className="stat"><strong>{myLogs.length}</strong><span>Your logs</span></div>
              <div className="stat"><strong>{backlogCount}</strong><span>Backlog</span></div>
              <div className="stat"><strong>{discoverPool.length}</strong><span>In stream</span></div>
              <div className="stat"><strong>{passedGameIds.size}</strong><span>Passed</span></div>
            </div>
            <div className="divider" />
            <h3>Your taste picks</h3>
            <div className="tag-row">
              {tasteGenres.length || tasteMoods.length ? [...tasteGenres, ...tasteMoods].map((item) => <span className="tag reason-tag" key={item}>{item}</span>) : <span className="tag">No taste setup yet</span>}
            </div>
            <div className="divider" />
            <h3><Layers3 size={17} /> Up next</h3>
            {nextUpGames.length ? (
              <div className="mini-cover-list">
                {nextUpGames.map((game) => (
                  <button className="mini-cover-row" key={game.id} onClick={() => { setSelectedGameId(game.id); setDiscoverMode("all"); setDiscoverIndex(Math.max(0, games.findIndex((item) => item.id === game.id))); }}>
                    <GameCover game={game} />
                    <span>{game.title}</span>
                  </button>
                ))}
              </div>
            ) : <p className="muted">Import more games or loosen filters to keep the deck full.</p>}
            <div className="divider" />
            <h3>Because you liked...</h3>
            {recommendedGames.length ? (
              <div className="mini-list">
                {recommendedGames.map((game) => <button className="mini-row button-row" key={game.id} onClick={() => { setSelectedGameId(game.id); setDiscoverMode("all"); setDiscoverIndex(Math.max(0, games.findIndex((item) => item.id === game.id))); }}><span>{game.title}</span><strong>{game.genre}</strong></button>)}
              </div>
            ) : <p className="muted">Pick taste tags or rate a few games and this becomes smarter.</p>}
            <div className="divider" />
            <button className="primary" onClick={() => setView("sources")}><DownloadCloud size={18} /> Import more games</button>
          </aside>
        </section>
      )}

      {view === "games" && (
        <section className="grid">
          <div className="col-12 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Catalog</p>
                <h2>Find something to log</h2>
              </div>
              <button className="secondary" onClick={() => setView("log")}>Log selected</button>
            </div>
            <div className="form-grid two" style={{ marginBottom: 16 }}>
              <div className="field">
                <label><Search size={14} /> Search games</label>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Minecraft, RPG, tactical, cozy..." />
              </div>
              <div className="field">
                <label>Genre</label>
                <select value={genre} onChange={(event) => setGenre(event.target.value)}>
                  {genres.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>
            <div className="game-grid">
              {filteredGames.map((game) => (
                <GameCard key={game.id} game={game} onLog={() => { setLogGameId(game.id); setView("log"); }} onDetails={() => setSelectedGameId(game.id)} />
              ))}
            </div>
            {selectedGame && (
              <GameDetailPanel
                game={selectedGame}
                logs={logs.filter((log) => log.game_id === selectedGame.id)}
                onClose={() => setSelectedGameId(null)}
                onLog={() => { setLogGameId(selectedGame.id); setView("log"); }}
              />
            )}
          </div>
        </section>
      )}

      {view === "log" && (
        <section className="grid">
          <div className="col-7 card">
            <p className="eyebrow">Diary</p>
            <h2>{editingLogId ? "Edit log" : "Log a game"}</h2>
            <div className="form-grid">
              <div className="field">
                <label>Game</label>
                <select value={logGameId} onChange={(event) => setLogGameId(event.target.value)}>
                  {games.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}
                </select>
              </div>
              <div className="form-grid three">
                <div className="field">
                  <label>Status</label>
                  <select value={logStatus} onChange={(event) => setLogStatus(event.target.value)}>
                    {statuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Rating</label>
                  <select value={rating} onChange={(event) => setRating(event.target.value)}>
                    {["", "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"].map((value) => <option key={value} value={value}>{value || "No rating"}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Played on</label>
                  <input type="date" value={playedOn} onChange={(event) => setPlayedOn(event.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Vibe</label>
                <select value={vibe} onChange={(event) => setVibe(event.target.value)}>
                  {vibes.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Review</label>
                <textarea value={review} onChange={(event) => setReview(event.target.value)} placeholder="Say it like a real gamer, not a corporate review site." />
              </div>
              <div className="actions" style={{ marginTop: 0 }}>
                <button className="primary" onClick={saveLog}><Star size={18} /> {editingLogId ? "Update log" : "Save log"}</button>
                {editingLogId && <button className="secondary" onClick={resetLogForm}><X size={18} /> Cancel edit</button>}
              </div>
            </div>
          </div>

          <div className="col-5 card">
            <p className="eyebrow">Community catalog</p>
            <h2>Add a custom game</h2>
            <div className="form-grid">
              <div className="field">
                <label>Title</label>
                <input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="Quickscope King" />
              </div>
              <div className="form-grid two">
                <div className="field">
                  <label>Genre</label>
                  <input value={customGenre} onChange={(event) => setCustomGenre(event.target.value)} placeholder="Arena Shooter" />
                </div>
                <div className="field">
                  <label>Platforms</label>
                  <input value={customPlatform} onChange={(event) => setCustomPlatform(event.target.value)} placeholder="PC, Web" />
                </div>
              </div>
              <div className="field">
                <label>Summary</label>
                <textarea value={customSummary} onChange={(event) => setCustomSummary(event.target.value)} placeholder="One sentence description." />
              </div>
              <button className="secondary" onClick={addCustomGame}><ListPlus size={18} /> Add game</button>
            </div>
          </div>
        </section>
      )}

      {view === "feed" && (
        <section className="grid">
          <div className="col-8 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Social layer</p>
                <h2>Activity feed</h2>
              </div>
              <div className="segmented">
                <button className={`pill ${feedFilter === "all" ? "active" : ""}`} onClick={() => setFeedFilter("all")}>All</button>
                <button className={`pill ${feedFilter === "following" ? "active" : ""}`} onClick={() => setFeedFilter("following")}>Following</button>
                <button className={`pill ${feedFilter === "mine" ? "active" : ""}`} onClick={() => setFeedFilter("mine")}>Mine</button>
              </div>
            </div>
            <Feed
              logs={feedLogs}
              currentUserId={currentUserId}
              signedIn={signedIn}
              commentDrafts={commentDrafts}
              setCommentDrafts={setCommentDrafts}
              onDelete={deleteLog}
              onEdit={startEditLog}
              onLike={toggleLike}
              onComment={addComment}
              onDeleteComment={deleteComment}
              onShare={(log) => copyShareLink(`/r/${log.id}`, "Review")}
            />
          </div>
          <div className="col-4 card">
            <h2>Trending reviews</h2>
            <p className="muted">v1.2 makes reviews feel more public: cover cards, share links, likes, comments, and cleaner empty states.</p>
            <MiniReviewList logs={trendingLogs} />
            <div className="divider" />
            <button className="secondary" onClick={() => setView("people")}><Users size={18} /> Find people to follow</button>
          </div>
        </section>
      )}

      {view === "lists" && (
        <section className="grid">
          <div className="col-5 card">
            <p className="eyebrow">Taste flex</p>
            <h2>Create a list</h2>
            <div className="form-grid">
              <div className="field">
                <label>List title</label>
                <input value={listTitle} onChange={(event) => setListTitle(event.target.value)} placeholder="Games I wish I could play again for the first time" />
              </div>
              <div className="field">
                <label>Description</label>
                <textarea value={listDescription} onChange={(event) => setListDescription(event.target.value)} placeholder="What belongs on this list?" />
              </div>
              <button className="primary" onClick={createList}>Create list</button>
            </div>
            <div className="divider" />
            <h3>Add a game to a list</h3>
            <div className="form-grid">
              <div className="field">
                <label>List</label>
                <select value={selectedList} onChange={(event) => setSelectedList(event.target.value)}>
                  {lists.map((list) => <option key={list.id} value={list.id}>{list.title}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Game</label>
                <select value={selectedListGame} onChange={(event) => setSelectedListGame(event.target.value)}>
                  {games.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}
                </select>
              </div>
              <button className="secondary" onClick={addGameToList} disabled={!lists.length}>Add to list</button>
            </div>
          </div>
          <div className="col-7 card">
            <h2>Public lists</h2>
            <div className="list-stack">
              {lists.length ? lists.map((list) => <GameListCard key={list.id} list={list} />) : <div className="empty">No lists yet.</div>}
            </div>
          </div>
        </section>
      )}

      {view === "people" && (
        <section className="grid">
          <div className="col-12 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Community</p>
                <h2>Find players</h2>
              </div>
              <span className="tag">{people.length} profiles</span>
            </div>
            <div className="people-grid">
              {people.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  logs={logs.filter((log) => log.user_id === person.id)}
                  isMe={person.id === currentUserId}
                  isFollowing={followingIds.has(person.id)}
                  onToggleFollow={() => toggleFollow(person.id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {view === "history" && (
        <section className="grid">
          <div className="col-8 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Discovery memory</p>
                <h2>Your swipe history</h2>
                <p className="muted" style={{ marginBottom: 0 }}>GameLog remembers your passes and quick saves so the Discover stream does not keep repeating the same games.</p>
              </div>
              <div className="actions" style={{ marginTop: 0 }}>
                <button className="secondary" onClick={undoLastDiscoveryAction} disabled={!lastUndo}><RotateCcw size={16} /> Undo last</button>
                <button className="danger" onClick={clearPassedGames} disabled={!passedGameIds.size}>Clear passes</button>
              </div>
            </div>
            <div className="history-list">
              {discoveryHistory.length ? discoveryHistory.map((action) => (
                <article className="history-row" key={action.id}>
                  {action.games ? <GameCover game={action.games} /> : <div className="cover poster-cover"><div className="poster-fallback"><div className="cover-title">Game</div></div></div>}
                  <div>
                    <h3>{action.games?.title ?? "Unknown game"}</h3>
                    <p className="muted">{action.action} · {new Date(action.created_at).toLocaleString()}</p>
                    <div className="tag-row">
                      {action.games?.genre && <span className="tag">{action.games.genre}</span>}
                      {action.games ? getDiscoveryReasons(action.games, myLogs).slice(0, 3).map((reason) => <span className="tag reason-tag" key={reason}>{reason}</span>) : null}
                    </div>
                  </div>
                  <div className="history-actions">
                    {action.games && <button className="secondary" onClick={() => { setSelectedGameId(action.games!.id); setView("discover"); }}>Details</button>}
                    {action.action === "Pass" && action.games && <button className="primary" onClick={() => quickLogGame(action.games!, "Backlog")}>Save instead</button>}
                  </div>
                </article>
              )) : <div className="empty">No discovery actions yet. Go swipe through Discover first.</div>}
            </div>
          </div>
          <aside className="col-4 card">
            <h2>Discovery stats</h2>
            <div className="stats compact-stats">
              <div className="stat"><strong>{discoveryHistory.length}</strong><span>Actions</span></div>
              <div className="stat"><strong>{passedGameIds.size}</strong><span>Passed</span></div>
              <div className="stat"><strong>{discoveryActions.filter((action) => action.action !== "Pass").length}</strong><span>Saved</span></div>
              <div className="stat"><strong>{discoverPool.length}</strong><span>Fresh now</span></div>
            </div>
            <div className="divider" />
            <p className="muted">For v1.1, this discovery memory is stored locally per user/browser. Later we can move it into Supabase so it follows the account across devices.</p>
            <button className="primary" onClick={() => setView("discover")}>Back to Discover</button>
          </aside>
        </section>
      )}

      {view === "sources" && (
        <section className="grid">
          <div className="col-8 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Catalog sources</p>
                <h2>Bring in real games and cover art</h2>
                <p className="muted" style={{ marginBottom: 0 }}>
                  GameLog now has a rescue catalog, built-in Steam cover fallbacks, IGDB imports, Steam imports, RAWG, itch.io manual import, and bulk import. This is how the catalog grows instead of relying on one static seed file.
                </p>
              </div>
              <span className="tag">{coverCount}/{games.length} covers</span>
            </div>

            <div className="stats compact-stats">
              <div className="stat"><strong>{games.length}</strong><span>Total games</span></div>
              <div className="stat"><strong>{coverCount}</strong><span>With cover art</span></div>
              <div className="stat"><strong>{games.length ? Math.round((coverCount / games.length) * 100) : 0}%</strong><span>Cover rate</span></div>
              <div className="stat"><strong>{filteredGames.length}</strong><span>Searchable now</span></div>
            </div>

            <div className="divider" />

            {(usingStarterFallback || remoteCatalogEmpty) && (
              <section className="source-card rescue-source">
                <div className="review-top">
                  <div>
                    <h3>Catalog rescue: your games did not disappear</h3>
                    <p className="muted">Supabase is connected, but the games table is empty or not seeded in this project. GameLog is showing the built-in starter catalog so the app stays usable. Install it once to save these games into your database.</p>
                  </div>
                  <span className="tag">Rescue mode</span>
                </div>
                <div className="actions" style={{ marginTop: 12 }}>
                  <button className="primary" onClick={installStarterCatalog} disabled={importingGames}>
                    <DownloadCloud size={18} /> {importingGames ? "Installing..." : `Install ${starterGames.length}+ starter games`}
                  </button>
                  <button className="secondary" onClick={() => setView("discover")}>Test Discover now</button>
                </div>
              </section>
            )}

            <section className="source-card featured-source">
              <div className="review-top">
                <div>
                  <h3>IGDB cover-art import</h3>
                  <p className="muted">IGDB is the best next source for true box art, platforms, genres, summaries, and cross-platform games. Add IGDB_CLIENT_ID and IGDB_CLIENT_SECRET to .env.local, then restart the server.</p>
                </div>
                <span className="tag">IGDB</span>
              </div>
              <div className="form-grid three">
                <div className="field">
                  <label><Search size={14} /> IGDB search</label>
                  <input value={igdbQuery} onChange={(event) => setIgdbQuery(event.target.value)} placeholder="zelda, minecraft, one piece, horror..." />
                </div>
                <div className="field">
                  <label>Limit</label>
                  <select value={igdbLimit} onChange={(event) => setIgdbLimit(event.target.value)}>
                    <option>10</option>
                    <option>30</option>
                    <option>50</option>
                    <option>75</option>
                  </select>
                </div>
                <button className="primary source-button" onClick={importIgdbSearchGames} disabled={igdbImporting}>
                  <DownloadCloud size={18} /> {igdbImporting ? "Importing..." : "Import IGDB search"}
                </button>
              </div>
              <div className="actions" style={{ marginTop: 12 }}>
                <button className="secondary" onClick={importIgdbPopularGames} disabled={igdbImporting}>
                  <DownloadCloud size={18} /> Import 75 popular games
                </button>
                <span className="tag">Popular offset {igdbOffset}</span>
              </div>
            </section>

            <section className="source-card">
              <div className="review-top">
                <div>
                  <h3>Steam search import</h3>
                  <p className="muted">Search Steam by title/keyword and import matching apps with Steam capsule/cover image URLs. This is the fastest way to add PC games.</p>
                </div>
                <span className="tag">Steam</span>
              </div>
              <div className="form-grid three">
                <div className="field">
                  <label><Search size={14} /> Steam search</label>
                  <input value={steamQuery} onChange={(event) => setSteamQuery(event.target.value)} placeholder="elden ring, souls, farming, shooter..." />
                </div>
                <div className="field">
                  <label>Limit</label>
                  <select value={steamImportLimit} onChange={(event) => setSteamImportLimit(event.target.value)}>
                    <option>10</option>
                    <option>30</option>
                    <option>50</option>
                    <option>75</option>
                  </select>
                </div>
                <button className="primary source-button" onClick={importSteamSearchGames} disabled={steamImporting}>
                  <DownloadCloud size={18} /> {steamImporting ? "Importing..." : "Import Steam games"}
                </button>
              </div>
              <div className="divider" />
              <div className="review-top">
                <p className="muted" style={{ marginBottom: 0 }}>Need it to feel massive fast? This searches a preset pack of Steam categories like shooters, survival, horror, co-op, RPG, strategy, indie, anime, sports, racing, and city builders.</p>
                <button className="secondary" onClick={importSteamMegaPack} disabled={steamMegaImporting}>
                  <DownloadCloud size={18} /> {steamMegaImporting ? "Mega importing..." : "Steam mega import"}
                </button>
              </div>
            </section>

            <section className="source-card">
              <div className="review-top">
                <div>
                  <h3>RAWG import</h3>
                  <p className="muted">RAWG gives a huge general game database and image fields. Add NEXT_PUBLIC_RAWG_API_KEY to .env.local, then import pages of games.</p>
                </div>
                <span className="tag">RAWG page {rawgPage}</span>
              </div>
              <button className="secondary" onClick={importRawgTrendingGames} disabled={importingGames}>
                <DownloadCloud size={18} /> {importingGames ? "Importing..." : rawgApiKey ? "Import next 40 RAWG games" : "RAWG key missing"}
              </button>
            </section>

            <section className="source-card">
              <div className="review-top">
                <div>
                  <h3>itch.io manual import</h3>
                  <p className="muted">itch.io does not work like Steam’s public app list here, so v0.9 supports clean manual import: paste the game page and cover image URL.</p>
                </div>
                <span className="tag">itch.io</span>
              </div>
              <div className="form-grid two">
                <div className="field">
                  <label>Game title</label>
                  <input value={itchTitle} onChange={(event) => setItchTitle(event.target.value)} placeholder="Indie game title" />
                </div>
                <div className="field">
                  <label>itch.io page URL</label>
                  <input value={itchUrl} onChange={(event) => setItchUrl(event.target.value)} placeholder="https://creator.itch.io/game" />
                </div>
                <div className="field">
                  <label>Cover image URL</label>
                  <input value={itchCoverUrl} onChange={(event) => setItchCoverUrl(event.target.value)} placeholder="https://img.itch.zone/..." />
                </div>
                <div className="field">
                  <label>Genre</label>
                  <input value={itchGenre} onChange={(event) => setItchGenre(event.target.value)} placeholder="Indie, Horror, Platformer..." />
                </div>
                <div className="field">
                  <label>Platforms</label>
                  <input value={itchPlatforms} onChange={(event) => setItchPlatforms(event.target.value)} placeholder="PC, Web, Mac, Linux" />
                </div>
                <button className="secondary source-button" onClick={addItchGame}><ListPlus size={18} /> Add itch game</button>
              </div>
            </section>

            <section className="source-card">
              <div className="review-top">
                <div>
                  <h3>Bulk import any source</h3>
                  <p className="muted">Paste one game per line in this format: title | cover_url | source_url | genre | platforms comma-separated</p>
                </div>
                <span className="tag">Any site</span>
              </div>
              <div className="field">
                <label>Bulk lines</label>
                <textarea value={bulkImportText} onChange={(event) => setBulkImportText(event.target.value)} placeholder={"Example Game | https://example.com/cover.jpg | https://example.com/game | Horror | PC, Web"} />
              </div>
              <button className="secondary" onClick={importBulkGames}><ListPlus size={18} /> Bulk import</button>
            </section>
          </div>

          <aside className="col-4 card">
            <h2>Where is the cover art?</h2>
            <p className="muted">Games use real cover_url images when available. The starter catalog also has built-in Steam capsule fallbacks for many PC games, so cards should no longer look empty after a fresh setup.</p>
            <div className="divider" />
            <h3>The real “all games” plan</h3>
            <div className="mini-list">
              <div className="mini-row"><span>IGDB</span><strong>True covers now</strong></div>
              <div className="mini-row"><span>Steam</span><strong>PC catalog now</strong></div>
              <div className="mini-row"><span>RAWG</span><strong>Huge general DB</strong></div>
              <div className="mini-row"><span>itch.io</span><strong>Manual/bulk now</strong></div>
            </div>
            <div className="divider" />
            <p className="muted">We should not ship one giant static file with every game on earth. The better product is a growing catalog that imports from sources, stores the clean records in Supabase, and feeds Discover forever.</p>
            <button className="primary" onClick={() => setView("discover")}>Back to Discover</button>
          </aside>
        </section>
      )}

      {view === "profile" && (
        <section className="grid">
          <div className="col-5 card">
            <p className="eyebrow">Account</p>
            <h2>{connected ? "Sign in / profile" : "Demo profile"}</h2>
            {connected ? (
              userId ? (
                <div className="form-grid">
                  <ProfileMini profile={profile} completedCount={completedCount} backlogCount={backlogCount} avgRating={avgRating} followerCount={followerCount} followingCount={followingCount} />
                  <a className="secondary inline-link" href={`/u/${profile.username}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open public profile</a>
                  <button className="secondary" onClick={signOut}>Sign out</button>
                </div>
              ) : (
                <div className="form-grid">
                  <div className="actions" style={{ marginTop: 0 }}>
                    <button className={`pill ${authMode === "signin" ? "active" : ""}`} onClick={() => setAuthMode("signin")}>Sign in</button>
                    <button className={`pill ${authMode === "signup" ? "active" : ""}`} onClick={() => setAuthMode("signup")}>Create account</button>
                  </div>
                  <div className="field">
                    <label>Email</label>
                    <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@email.com" />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="••••••••" />
                  </div>
                  <button className="primary" onClick={handleAuth}><LogIn size={18} /> {authMode === "signin" ? "Sign in" : "Create account"}</button>
                </div>
              )
            ) : (
              <div className="form-grid">
                <ProfileMini profile={profile} completedCount={completedCount} backlogCount={backlogCount} avgRating={avgRating} followerCount={followerCount} followingCount={followingCount} />
                <button className="secondary" onClick={exportDemoData}>Export demo data</button>
              </div>
            )}
          </div>

          <div className="col-7 card">
            <p className="eyebrow">Public identity</p>
            <h2>Edit profile</h2>
            <div className="form-grid two">
              <div className="field">
                <label>Display name</label>
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
              </div>
              <div className="field">
                <label>Username</label>
                <input value={profileUsername} onChange={(event) => setProfileUsername(event.target.value)} />
              </div>
            </div>
            <div className="form-grid" style={{ marginTop: 12 }}>
              <div className="field">
                <label>Favorite game</label>
                <input value={profileFavorite} onChange={(event) => setProfileFavorite(event.target.value)} />
              </div>
              <div className="field">
                <label>Bio</label>
                <textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} />
              </div>
              <button className="primary" onClick={saveProfile}><UserRound size={18} /> Save profile</button>
            </div>
          </div>

          <div className="col-12 card profile-shelf-card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Profile shelf</p>
                <h2>Favorite games row</h2>
                <p className="muted" style={{ marginBottom: 0 }}>This row is built from your favorite game, high ratings, completions, and trending picks until you log more.</p>
              </div>
              <button className="secondary" onClick={() => copyShareLink(`/u/${profile.username}`, "Profile")}><Share2 size={16} /> Copy profile link</button>
            </div>
            <CoverRail games={favoriteShelfGames} onPick={(game) => setSelectedGameId(game.id)} />
          </div>
        </section>
      )}
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty empty-state-v12">
      <Sparkles size={22} />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

function FavoriteShelf({ games }: { games: Game[] }) {
  if (!games.length) return <EmptyState title="No shelf yet" body="Log and rate a few games to build your profile shelf." />;
  return (
    <div className="favorite-shelf">
      {games.slice(0, 5).map((game) => (
        <a className="shelf-cover" key={game.id} href={game.slug ? `/g/${game.slug}` : "#"} target="_blank" rel="noreferrer" title={game.title}>
          <GameCover game={game} />
          <span>{game.title}</span>
        </a>
      ))}
    </div>
  );
}

function CoverRail({ games, onPick }: { games: Game[]; onPick: (game: Game) => void }) {
  if (!games.length) return <EmptyState title="Nothing trending yet" body="Import games or write a few reviews to populate this rail." />;
  return (
    <div className="cover-rail">
      {games.map((game) => (
        <button className="rail-game" key={game.id} onClick={() => onPick(game)} title={game.title}>
          <GameCover game={game} />
          <strong>{game.title}</strong>
          <span>{game.genre ?? "Game"}</span>
        </button>
      ))}
    </div>
  );
}

function ProfileMini({ profile, completedCount, backlogCount, avgRating, followerCount, followingCount }: { profile: Profile; completedCount: number; backlogCount: number; avgRating: string; followerCount: number; followingCount: number }) {
  return (
    <div>
      <div className="profile-head">
        <div className="avatar">{initials(profile.display_name)}</div>
        <div>
          <h3 style={{ marginBottom: 2 }}>{profile.display_name}</h3>
          <p className="muted" style={{ marginBottom: 0 }}>@{profile.username}</p>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 14 }}>{profile.bio || "No bio yet."}</p>
      <div className="tag-row">
        <span className="tag">Favorite: {profile.favorite_game || "Unset"}</span>
        <span className="tag">Completed: {completedCount}</span>
        <span className="tag">Backlog: {backlogCount}</span>
        <span className="tag">Avg: {avgRating}</span>
        <span className="tag">Followers: {followerCount}</span>
        <span className="tag">Following: {followingCount}</span>
      </div>
    </div>
  );
}

function GameCover({ game, variant = "card" }: { game: Game; variant?: "card" | "hero" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = getEffectiveCoverUrl(game);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <div className={`cover poster-cover ${variant === "hero" ? "poster-hero" : ""}`} style={coverStyle(game)}>
      {showImage ? (
        <img src={imageUrl ?? ""} alt={`${game.title} cover art`} loading="lazy" onError={() => setImageFailed(true)} />
      ) : (
        <div className="poster-fallback">
          <span className="poster-kicker">{game.genre ?? "Game"}</span>
          <div className="cover-title">{game.title}</div>
          <span className="poster-platforms">{(game.platforms ?? []).slice(0, 2).join(" · ")}</span>
        </div>
      )}
      <div className="poster-glow" />
    </div>
  );
}

function GameCard({ game, onLog, onDetails }: { game: Game; onLog: () => void; onDetails: () => void }) {
  return (
    <article className="game-card">
      <GameCover game={game} />
      <div className="game-body">
        <div className="review-top">
          <div>
            <strong>{game.title}</strong>
            <p className="muted" style={{ margin: "4px 0 0" }}>{game.release_year ?? "TBA"} · {game.genre ?? "Game"}</p>
          </div>
        </div>
        <p className="muted" style={{ minHeight: 58 }}>{game.summary ?? "No summary yet."}</p>
        <div className="tag-row">
          {(game.platforms ?? []).slice(0, 3).map((platform) => <span className="tag" key={platform}>{platform}</span>)}
        </div>
        <div className="card-actions">
          <button className="secondary" onClick={onDetails}>Details</button>
          <button className="secondary" onClick={onLog}>Log this</button>
        </div>
        {game.slug && <a className="tiny-link" href={`/g/${game.slug}`} target="_blank" rel="noreferrer">Open game page</a>}
      </div>
    </article>
  );
}

function Feed({
  logs,
  currentUserId,
  signedIn,
  commentDrafts,
  setCommentDrafts,
  onDelete,
  onEdit,
  onLike,
  onComment,
  onDeleteComment,
  onShare
}: {
  logs: GameLog[];
  currentUserId: string;
  signedIn: boolean;
  commentDrafts: Record<string, string>;
  setCommentDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  onDelete: (logId: string) => void;
  onEdit: (log: GameLog) => void;
  onLike: (logId: string) => void;
  onComment: (logId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onShare: (log: GameLog) => void;
}) {
  if (!logs.length) return <EmptyState title="No reviews yet" body="Log a game, add a rating, and write one quick reaction to start the feed." />;

  return (
    <div className="feed">
      {logs.map((log) => {
        const likeCount = log.review_likes?.length ?? 0;
        const likedByMe = Boolean(log.review_likes?.some((like) => like.user_id === currentUserId));
        const comments = log.comments ?? [];

        return (
          <article className="review-card review-card-v12" key={log.id}>
            <div className="review-card-layout">
              <div className="review-cover-cell">
                {log.games ? <GameCover game={log.games} /> : <div className="cover poster-cover"><div className="poster-fallback"><div className="cover-title">Game</div></div></div>}
              </div>
              <div className="review-content-cell">
                <div className="review-top">
                  <div className="review-userline">
                    <div className="mini-avatar">{initials(log.profiles?.display_name ?? "Player")}</div>
                    <div>
                      <strong>{log.profiles?.display_name ?? "Player"}</strong>
                      <p className="muted" style={{ margin: "4px 0 0" }}>
                        logged <strong style={{ color: "white" }}>{log.games?.title ?? "Unknown Game"}</strong> as {log.status}
                      </p>
                    </div>
                  </div>
                  <div className="stars">{stars(log.rating)}</div>
                </div>
                {log.review ? <p className="review-copy">{log.review}</p> : <p className="review-copy muted">No written review yet — just the log.</p>}
                <div className="tag-row">
                  {log.vibe && <span className="tag">{log.vibe}</span>}
                  {log.played_on && <span className="tag"><CalendarDays size={13} /> {log.played_on}</span>}
                  <button className={`tag action-tag ${likedByMe ? "liked" : ""}`} onClick={() => onLike(log.id)}>
                    <Heart size={13} fill={likedByMe ? "currentColor" : "none"} /> {likeCount}
                  </button>
                  <span className="tag"><MessageCircle size={13} /> {comments.length}</span>
                  <button className="tag action-tag" onClick={() => onShare(log)}><Share2 size={13} /> Copy link</button>
                  <a className="tag action-tag" href={`/r/${log.id}`} target="_blank" rel="noreferrer">Open review</a>
                  {log.games?.slug && <a className="tag action-tag" href={`/g/${log.games.slug}`} target="_blank" rel="noreferrer">Game page</a>}
                </div>

                {!!comments.length && (
                  <div className="comments">
                    {comments.map((comment) => (
                      <div className="comment" key={comment.id}>
                        <div>
                          <strong>{comment.profiles?.display_name ?? "Player"}</strong>
                          <p>{comment.body}</p>
                        </div>
                        {comment.user_id === currentUserId && (
                          <button className="icon-button" onClick={() => onDeleteComment(comment.id)} aria-label="Delete comment"><Trash2 size={14} /></button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="comment-compose">
                  <input
                    value={commentDrafts[log.id] ?? ""}
                    onChange={(event) => setCommentDrafts((current) => ({ ...current, [log.id]: event.target.value }))}
                    placeholder={signedIn ? "Write a quick reply..." : "Sign in to comment"}
                    disabled={!signedIn}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onComment(log.id);
                    }}
                  />
                  <button className="secondary" onClick={() => onComment(log.id)} disabled={!signedIn || !commentDrafts[log.id]?.trim()}><Send size={15} /></button>
                </div>

                {log.user_id === currentUserId && (
                  <div className="actions" style={{ marginTop: 12 }}>
                    <button className="secondary" onClick={() => onEdit(log)}><Edit3 size={15} /> Edit</button>
                    <button className="danger" onClick={() => onDelete(log.id)}>Delete log</button>
                  </div>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}


function GameDetailPanel({ game, logs, onClose, onLog }: { game: Game; logs: GameLog[]; onClose: () => void; onLog: () => void }) {
  const rated = logs.filter((log) => log.rating !== null && log.rating !== undefined);
  const average = rated.length ? (rated.reduce((sum, log) => sum + Number(log.rating), 0) / rated.length).toFixed(1) : "0.0";

  return (
    <article className="detail-panel">
      <div className="review-top">
        <div>
          <p className="eyebrow">Game page preview</p>
          <h2>{game.title}</h2>
          <p className="muted" style={{ marginBottom: 0 }}>{game.release_year ?? "TBA"} · {game.developer ?? "Unknown dev"}</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close game details"><X size={16} /></button>
      </div>
      <div className="detail-cover-wrap"><GameCover game={game} /></div>
      <p className="lede" style={{ fontSize: "1rem" }}>{game.summary ?? "No summary yet."}</p>
      <div className="tag-row">
        <span className="tag"><Trophy size={13} /> Avg {average}</span>
        <span className="tag">{logs.length} logs</span>
        {game.genre && <span className="tag">{game.genre}</span>}
        {(game.platforms ?? []).map((platform) => <span className="tag" key={platform}>{platform}</span>)}
      </div>
      <div className="actions">
        <button className="primary" onClick={onLog}><Star size={16} /> Log this game</button>
        {game.slug && <a className="secondary inline-link" href={`/g/${game.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Public game page</a>}
      </div>
    </article>
  );
}

function MiniTopGames({ games }: { games: Array<{ game: Game; average: number; count: number }> }) {
  if (!games.length) return <p className="muted">No rated games yet.</p>;
  return (
    <div className="mini-list">
      {games.map(({ game, average, count }) => (
        <a className="mini-row" key={game.id} href={game.slug ? `/g/${game.slug}` : "#"} target="_blank" rel="noreferrer">
          <span>{game.title}</span>
          <strong>{average.toFixed(1)} · {count}</strong>
        </a>
      ))}
    </div>
  );
}

function MiniReviewList({ logs }: { logs: GameLog[] }) {
  if (!logs.length) return <p className="muted">No reviews yet.</p>;
  return (
    <div className="mini-list">
      {logs.map((log) => (
        <a className="mini-row" key={log.id} href={`/r/${log.id}`} target="_blank" rel="noreferrer">
          <span>{log.games?.title ?? "Unknown Game"}</span>
          <strong>{log.review_likes?.length ?? 0} ❤</strong>
        </a>
      ))}
    </div>
  );
}

function GameListCard({ list }: { list: GameList }) {
  return (
    <article className="list-card">
      <div className="review-top">
        <div>
          <h3>{list.title}</h3>
          <p className="muted" style={{ marginBottom: 0 }}>by @{list.profiles?.username ?? "player"}</p>
        </div>
        <span className="tag">{list.list_items?.length ?? 0} games</span>
      </div>
      {list.description && <p className="muted" style={{ marginTop: 12 }}>{list.description}</p>}
      <div className="tag-row">
        {(list.list_items ?? []).map((item) => item.games ? <span className="tag" key={item.id}>{item.games.title}</span> : null)}
      </div>
    </article>
  );
}

function PersonCard({ person, logs, isMe, isFollowing, onToggleFollow }: { person: Profile; logs: GameLog[]; isMe: boolean; isFollowing: boolean; onToggleFollow: () => void }) {
  const rated = logs.filter((log) => log.rating !== null && log.rating !== undefined);
  const avg = rated.length ? (rated.reduce((sum, log) => sum + Number(log.rating), 0) / rated.length).toFixed(1) : "0.0";
  const completed = logs.filter((log) => ["Completed", "100% Completed"].includes(log.status)).length;

  return (
    <article className="person-card">
      <div className="profile-head">
        <div className="avatar">{initials(person.display_name)}</div>
        <div>
          <h3 style={{ marginBottom: 2 }}>{person.display_name}</h3>
          <p className="muted" style={{ marginBottom: 0 }}>@{person.username}</p>
        </div>
      </div>
      <p className="muted person-bio">{person.bio || "No bio yet."}</p>
      <div className="tag-row">
        <span className="tag">Logs: {logs.length}</span>
        <span className="tag">Completed: {completed}</span>
        <span className="tag">Avg: {avg}</span>
        <span className="tag">Favorite: {person.favorite_game || "Unset"}</span>
      </div>
      <div className="person-actions">
        <a className="secondary inline-link" href={`/u/${person.username}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Profile</a>
        {!isMe && (
          <button className={isFollowing ? "danger" : "primary"} onClick={onToggleFollow}>
            {isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />} {isFollowing ? "Unfollow" : "Follow"}
          </button>
        )}
      </div>
    </article>
  );
}
