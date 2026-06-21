"use client";

import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import {
  Award,
  BadgeCheck,
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
  Rocket,
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
  Target,
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

type View = "home" | "discover" | "library" | "coach" | "share" | "beta" | "quests" | "wrapped" | "games" | "log" | "feed" | "lists" | "people" | "history" | "sources" | "profile";
type AuthMode = "signin" | "signup";
type FeedFilter = "all" | "following" | "mine";
type DiscoverMode = "forYou" | "fresh" | "all" | "backlog" | "passed";
type DiscoveryActionName = "Pass" | "Want to Play" | "Backlog" | "Currently Playing" | "Completed";
type DiscoveryMood = "All" | "Cozy" | "Hardcore" | "Multiplayer" | "Story" | "Short" | "Open World" | "Shooter" | "Strategy" | "Indie";
type SourceMode = "archive" | "igdb" | "steam" | "rawg" | "itch" | "bulk";
type ArchiveMode = "guides" | "software" | "covers";
type CoachMode = "next" | "weekend" | "review" | "taste";
type FeedbackKind = "Bug" | "Missing game" | "Duplicate game" | "Feature idea" | "UI polish" | "Other";
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

function normalizeTitleKey(title?: string | null) {
  return (title ?? "")
    .toLowerCase()
    .replace(/\b(game of the year|goty|remastered|remaster|definitive edition|complete edition|deluxe edition|ultimate edition|collector'?s edition|standard edition)\b/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function recordQualityScore(game: Game) {
  return (gameSource(game) === "IGDB" ? 100 : 0)
    + (isUuid(game.id) ? 28 : 0)
    + (getEffectiveCoverUrl(game) ? 20 : 0)
    + (game.summary ? Math.min(24, Math.floor(game.summary.length / 80)) : 0)
    + (game.release_year ? 8 : 0)
    + ((game.platforms?.length ?? 0) * 2)
    + (game.developer && game.developer !== "GameLog starter catalog" ? 5 : 0);
}

function dedupeGameRecords(records: Game[]) {
  const byKey = new Map<string, Game>();

  for (const game of records) {
    const baseKey = normalizeTitleKey(game.title) || game.slug || game.id;
    const existing = byKey.get(baseKey);

    if (!existing) {
      byKey.set(baseKey, game);
      continue;
    }

    const yearsConflict = existing.release_year && game.release_year && Math.abs(existing.release_year - game.release_year) > 4;
    if (yearsConflict) {
      byKey.set(`${baseKey}-${game.release_year}`, game);
      continue;
    }

    const winner = recordQualityScore(game) > recordQualityScore(existing) ? game : existing;
    const loser = winner.id === game.id ? existing : game;
    byKey.set(baseKey, mergeGameRecord(winner, loser));
  }

  return Array.from(byKey.values()).sort((a, b) => a.title.localeCompare(b.title));
}

function isUuid(value?: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function gameSource(game: Partial<Game>) {
  const text = [game.source, game.slug, game.developer, game.publisher, game.summary, game.source_url].filter(Boolean).join(" ").toLowerCase();
  if (text.includes("igdb")) return "IGDB";
  if (text.includes("steam")) return "Steam";
  if (text.includes("archive.org") || text.includes("internet archive")) return "Archive";
  if (text.includes("rawg")) return "RAWG";
  if (text.includes("itch")) return "itch.io";
  if (game.cover_url) return "Cover";
  return "GameLog";
}

function mergeGameRecord(existing: Game, incoming: Partial<Game>): Game {
  const incomingPlatforms = Array.isArray(incoming.platforms) ? incoming.platforms.filter(Boolean) : [];
  const existingPlatforms = Array.isArray(existing.platforms) ? existing.platforms.filter(Boolean) : [];
  const mergedPlatforms = Array.from(new Set([...existingPlatforms, ...incomingPlatforms])).slice(0, 10);
  const incomingSummary = incoming.summary?.trim() ?? null;
  const existingSummary = existing.summary?.trim() ?? null;

  return {
    ...existing,
    title: existing.title || incoming.title || "Unknown Game",
    slug: existing.slug ?? incoming.slug ?? makeSlug(existing.title || incoming.title || "game"),
    developer: existing.developer && existing.developer !== "GameLog starter catalog" ? existing.developer : incoming.developer ?? existing.developer ?? null,
    publisher: existing.publisher ?? incoming.publisher ?? null,
    release_year: existing.release_year ?? incoming.release_year ?? null,
    genre: existing.genre && existing.genre !== "Game" ? existing.genre : incoming.genre ?? existing.genre ?? "Game",
    platforms: mergedPlatforms.length ? mergedPlatforms : ["Unknown"],
    cover_url: existing.cover_url || incoming.cover_url || getKnownCoverUrl(existing),
    summary: existingSummary && existingSummary.length >= (incomingSummary?.length ?? 0) ? existingSummary : incomingSummary ?? existingSummary,
    igdb_id: existing.igdb_id ?? incoming.igdb_id ?? null,
    source: existing.source ?? incoming.source ?? gameSource(incoming),
    source_url: existing.source_url ?? incoming.source_url ?? null,
    is_community: existing.is_community ?? incoming.is_community ?? true
  };
}

function hasUsefulIncomingData(existing: Game, incoming: Partial<Game>) {
  if (incoming.cover_url && !existing.cover_url) return true;
  if (incoming.summary && (!existing.summary || incoming.summary.length > existing.summary.length + 40)) return true;
  if (incoming.release_year && !existing.release_year) return true;
  if (incoming.publisher && !existing.publisher) return true;
  if ((incoming.platforms?.length ?? 0) > (existing.platforms?.length ?? 0)) return true;
  if (incoming.developer && (!existing.developer || existing.developer === "GameLog starter catalog" || existing.developer.includes("import"))) return true;
  return false;
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

function archiveSearchUrl(title: string, mode: ArchiveMode = "guides") {
  const guideQuery = `title:(\"${title}\") OR description:(\"${title}\")`;
  const suffix = mode === "software"
    ? " AND mediatype:software"
    : mode === "covers"
      ? " AND (cover OR box OR scan OR art)"
      : " AND mediatype:texts AND (manual OR guide OR walkthrough OR strategy)";
  return `https://archive.org/advancedsearch.php?q=${encodeURIComponent(`(${guideQuery})${suffix}`)}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=year&fl[]=creator&rows=50&output=json`;
}

function archiveDetailsUrlFromGame(game: Game) {
  const match = game.summary?.match(/https:\/\/archive\.org\/details\/[^\s)]+/i);
  return match?.[0] ?? null;
}


function clampProgress(value: number, target: number) {
  if (!target) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

function dateKey(value?: string | null) {
  return (value ?? "").slice(0, 10);
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return "This month";
  return new Date(year, month - 1, 1).toLocaleString(undefined, { month: "long", year: "numeric" });
}

function sortByNewest(a: { created_at?: string }, b: { created_at?: string }) {
  return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
}

function topCounts(values: string[], limit = 6) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([label, value]) => ({ label, value }));
}

function dayNumber(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Math.floor(date.getTime() / 86400000);
}

function longestLogStreak(logs: GameLog[]) {
  const days = Array.from(new Set(logs.map((log) => dateKey(log.played_on ?? log.created_at)).filter(Boolean))).sort();
  if (!days.length) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (dayNumber(days[i]) - dayNumber(days[i - 1]) === 1) current += 1;
    else current = 1;
    best = Math.max(best, current);
  }
  return best;
}

export default function GameLogApp() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const connected = Boolean(supabase && hasSupabaseEnv());
  const rawgApiKey = process.env.NEXT_PUBLIC_RAWG_API_KEY ?? "";

  const [view, setView] = useState<View>("home");
  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view") as View | null;
    const allowedViews: View[] = ["home", "discover", "library", "coach", "share", "beta", "quests", "wrapped", "games", "log", "feed", "lists", "people", "history", "sources", "profile"];
    if (requestedView && allowedViews.includes(requestedView)) setView(requestedView);
  }, []);
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
  const [sourceMode, setSourceMode] = useState<SourceMode>("archive");
  const [archiveQuery, setArchiveQuery] = useState("zelda manual");
  const [archiveMode, setArchiveMode] = useState<ArchiveMode>("guides");
  const [archiveLimit, setArchiveLimit] = useState("25");
  const [archiveImporting, setArchiveImporting] = useState(false);
  const [igdbQuery, setIgdbQuery] = useState("zelda");
  const [igdbLimit, setIgdbLimit] = useState("30");
  const [igdbOffset, setIgdbOffset] = useState(0);
  const [igdbImporting, setIgdbImporting] = useState(false);
  const [catalogImporting, setCatalogImporting] = useState(false);
  const [catalogEnriching, setCatalogEnriching] = useState(false);
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
  const [aiCoachMode, setAiCoachMode] = useState<CoachMode>("next");
  const [aiCoachText, setAiCoachText] = useState("");
  const [aiCoachLoading, setAiCoachLoading] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>("Feature idea");
  const [feedbackBody, setFeedbackBody] = useState("");
  const [feedbackTarget, setFeedbackTarget] = useState("");
  const [feedbackContact, setFeedbackContact] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackQueue, setFeedbackQueue] = useState<Array<{ kind: FeedbackKind; body: string; target?: string; contact?: string; created_at: string }>>([]);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(demoProfile);
  const [profiles, setProfiles] = useState<Profile[]>([demoProfile, ...demoFriends]);
  const [follows, setFollows] = useState<Follow[]>([{ follower_id: demoProfile.id, following_id: "demo-friend" }]);
  const [games, setGames] = useState<Game[]>(starterGames);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [lists, setLists] = useState<GameList[]>([]);

  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All");
  const [gameDisplayLimit, setGameDisplayLimit] = useState(48);
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

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const canRegister = window.location.protocol === "https:" || window.location.hostname === "localhost";
    if (!canRegister) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
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
  const catalogGames = useMemo(() => dedupeGameRecords(games), [games]);
  const hiddenDuplicateCount = Math.max(0, games.length - catalogGames.length);
  const genres = useMemo(() => ["All", ...Array.from(new Set(catalogGames.map((game) => game.genre).filter(Boolean) as string[])).sort()], [catalogGames]);
  const coverCount = useMemo(() => catalogGames.filter((game) => Boolean(getEffectiveCoverUrl(game))).length, [catalogGames]);
  const starterTasteGenres = useMemo(() => genres.filter((item) => item !== "All").slice(0, 14), [genres]);
  const loggedGameIds = useMemo(() => new Set(myLogs.map((log) => log.game_id)), [myLogs]);
  const passedGameIds = useMemo(() => new Set(discoveryActions.filter((action) => action.action === "Pass").map((action) => action.game_id)), [discoveryActions]);
  const discoveryHistory = useMemo(() => discoveryActions.map((action) => ({ ...action, games: games.find((game) => game.id === action.game_id) ?? action.games ?? null })).sort(sortByNewest), [discoveryActions, games]);

  const discoverPool = useMemo(() => {
    const needle = discoverQuery.toLowerCase();
    const pool = catalogGames
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
  }, [catalogGames, discoverGenre, discoverMode, discoverMood, discoverQuery, loggedGameIds, myLogs, passedGameIds, tasteGenres, tasteMoods]);

  const discoverGame = discoverPool.length ? discoverPool[discoverIndex % discoverPool.length] : null;
  const discoverReasons = discoverGame ? getDiscoveryReasons(discoverGame, myLogs) : [];
  const discoverMatch = discoverGame ? matchPercent(discoverGame, myLogs, tasteGenres, tasteMoods) : 0;
  const nextUpGames = useMemo(() => discoverPool.slice(discoverIndex + 1, discoverIndex + 4), [discoverIndex, discoverPool]);
  const recommendedGames = useMemo(() => {
    return catalogGames
      .filter((game) => game.id !== discoverGame?.id)
      .filter((game) => !loggedGameIds.has(game.id) && !passedGameIds.has(game.id))
      .map((game) => ({ game, score: gameTasteScore(game, myLogs, tasteGenres, tasteMoods) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.game.title.localeCompare(b.game.title))
      .slice(0, 5)
      .map((item) => item.game);
  }, [catalogGames, discoverGame?.id, loggedGameIds, myLogs, passedGameIds, tasteGenres, tasteMoods]);

  const filteredGames = useMemo(() => {
    const needle = query.toLowerCase();
    return catalogGames
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
  }, [catalogGames, genre, query]);

  const displayedGames = useMemo(() => filteredGames.slice(0, gameDisplayLimit), [filteredGames, gameDisplayLimit]);
  const remainingFilteredGames = Math.max(0, filteredGames.length - displayedGames.length);

  useEffect(() => {
    setGameDisplayLimit(48);
  }, [query, genre]);

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
  const latestShareReview = useMemo(() => {
    return [...myLogs]
      .filter((log) => Boolean(log.review?.trim()) || (log.rating !== null && log.rating !== undefined))
      .sort(sortByNewest)[0] ?? null;
  }, [myLogs]);
  const topShareList = useMemo(() => {
    const mine = lists.filter((list) => list.user_id === currentUserId);
    return [...mine]
      .sort((a, b) => (b.list_items?.length ?? 0) - (a.list_items?.length ?? 0) || new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0] ?? null;
  }, [currentUserId, lists]);
  const publicProfilePath = `/u/${profile.username || "player"}`;
  const shareKitText = [
    `${profile.display_name || "GameLog Player"} on GameLog`,
    `@${profile.username || "player"}`,
    profile.bio ? `Bio: ${profile.bio}` : null,
    profile.favorite_game ? `Favorite game: ${profile.favorite_game}` : null,
    `${myLogs.length} logs · ${completedCount} completed · ${backlogCount} backlog · ${reviewedCount} reviews`,
    `Average rating: ${avgRating}`,
    `Top genre: ${topLibraryGenre}`,
    `Top vibe: ${topLibraryVibe}`,
    `Profile: ${typeof window !== "undefined" ? window.location.origin : ""}${publicProfilePath}`
  ].filter(Boolean).join("
");
  const recentReviews = useMemo(() => logs.filter((log) => Boolean(log.review?.trim())).slice(0, 5), [logs]);
  const currentYear = new Date().getFullYear();
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const yearlyLogs = useMemo(() => myLogs.filter((log) => (log.played_on ?? log.created_at ?? "").startsWith(String(currentYear))), [currentYear, myLogs]);
  const monthlyLogs = useMemo(() => myLogs.filter((log) => (log.played_on ?? log.created_at ?? "").startsWith(currentMonthKey)), [currentMonthKey, myLogs]);
  const reviewedCount = myLogs.filter((log) => Boolean(log.review?.trim())).length;
  const completionRate = myLogs.length ? Math.round((completedCount / myLogs.length) * 100) : 0;
  const unreviewedCompletions = useMemo(() => myLogs.filter((log) => ["Completed", "100% Completed"].includes(log.status) && !log.review?.trim()).slice(0, 6), [myLogs]);
  const libraryShelves = useMemo(() => [
    { title: "Playing now", subtitle: "Games you are actively in", logs: myLogs.filter((log) => log.status === "Currently Playing") },
    { title: "Want / Backlog", subtitle: "Saved from Discover and future picks", logs: myLogs.filter((log) => ["Want to Play", "Backlog"].includes(log.status)) },
    { title: "Completed", subtitle: "Finished games worth rating and reviewing", logs: myLogs.filter((log) => ["Completed", "100% Completed"].includes(log.status)) },
    { title: "Dropped / Replaying", subtitle: "Games that need another chance or did not hit", logs: myLogs.filter((log) => ["Dropped", "Replaying"].includes(log.status)) }
  ], [myLogs]);
  const topLibraryGenre = useMemo(() => {
    const counts = new Map<string, number>();
    myLogs.forEach((log) => {
      const key = log.games?.genre || "Game";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Not enough data";
  }, [myLogs]);
  const topLibraryVibe = useMemo(() => {
    const counts = new Map<string, number>();
    myLogs.forEach((log) => {
      if (!log.vibe) return;
      counts.set(log.vibe, (counts.get(log.vibe) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No vibe yet";
  }, [myLogs]);
  const backlogAttackPlan = useMemo(() => {
    const backlog = myLogs.filter((log) => ["Want to Play", "Backlog"].includes(log.status) && log.games);
    return [...backlog]
      .sort((a, b) => {
        const scoreA = gameTasteScore(a.games!, myLogs, tasteGenres, tasteMoods) + Number(Boolean(getEffectiveCoverUrl(a.games!)));
        const scoreB = gameTasteScore(b.games!, myLogs, tasteGenres, tasteMoods) + Number(Boolean(getEffectiveCoverUrl(b.games!)));
        return scoreB - scoreA || new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      })
      .slice(0, 5);
  }, [myLogs, tasteGenres, tasteMoods]);

  const todayKey = today();
  const todayDiscoveryActions = useMemo(() => discoveryActions.filter((action) => dateKey(action.created_at) === todayKey), [discoveryActions, todayKey]);
  const todayPlayedLogs = useMemo(() => myLogs.filter((log) => dateKey(log.played_on ?? log.created_at) === todayKey), [myLogs, todayKey]);
  const monthlyCompleted = useMemo(() => monthlyLogs.filter((log) => ["Completed", "100% Completed"].includes(log.status)), [monthlyLogs]);
  const playerXp = myLogs.length * 40 + completedCount * 80 + reviewedCount * 70 + backlogCount * 20 + discoveryActions.length * 8 + followerCount * 30 + followingCount * 20;
  const playerLevel = Math.max(1, Math.floor(playerXp / 250) + 1);
  const nextLevelXp = playerLevel * 250;
  const currentLevelBaseXp = (playerLevel - 1) * 250;
  const levelProgress = clampProgress(playerXp - currentLevelBaseXp, nextLevelXp - currentLevelBaseXp);
  const questCards = useMemo(() => [
    {
      title: "Swipe the deck",
      body: "Pass or save 10 games today so GameLog gets sharper.",
      progress: todayDiscoveryActions.length,
      target: 10,
      cta: "Open Discover",
      action: () => setView("discover" as View),
      icon: "⚡"
    },
    {
      title: "Write one real review",
      body: "Turn a completed game into a social post people can react to.",
      progress: myLogs.filter((log) => Boolean(log.review?.trim()) && dateKey(log.created_at) === todayKey).length,
      target: 1,
      cta: "Review a game",
      action: () => setView("log" as View),
      icon: "✍️"
    },
    {
      title: "Beat something this month",
      body: "Finish at least one game in " + monthLabel(currentMonthKey) + ".",
      progress: monthlyCompleted.length,
      target: 1,
      cta: "Open Library",
      action: () => setView("library" as View),
      icon: "🏆"
    },
    {
      title: "Backlog attack",
      body: "Keep at least 5 games ready so the next play is never a debate.",
      progress: backlogCount,
      target: 5,
      cta: "Find games",
      action: () => setView("discover" as View),
      icon: "🎯"
    }
  ], [backlogCount, currentMonthKey, monthlyCompleted.length, myLogs, todayDiscoveryActions.length, todayKey]);
  const achievementBadges = useMemo(() => [
    { title: "First log", body: "Log your first game.", progress: myLogs.length, target: 1 },
    { title: "Backlog builder", body: "Save 10 games to play later.", progress: backlogCount, target: 10 },
    { title: "Completionist spark", body: "Complete 5 games.", progress: completedCount, target: 5 },
    { title: "Critic mode", body: "Write 10 reviews.", progress: reviewedCount, target: 10 },
    { title: "Taste trained", body: "Swipe or save 50 games.", progress: discoveryActions.length, target: 50 },
    { title: "Social player", body: "Follow 5 players.", progress: followingCount, target: 5 }
  ], [backlogCount, completedCount, discoveryActions.length, followingCount, myLogs.length, reviewedCount]);
  const unlockedAchievements = achievementBadges.filter((badge) => badge.progress >= badge.target).length;
  const wrappedGenreBreakdown = useMemo(() => topCounts(myLogs.map((log) => log.games?.genre || "Game"), 6), [myLogs]);
  const wrappedVibeBreakdown = useMemo(() => topCounts(myLogs.map((log) => log.vibe || "No vibe"), 6), [myLogs]);
  const wrappedPlatformBreakdown = useMemo(() => topCounts(myLogs.flatMap((log) => log.games?.platforms ?? []), 6), [myLogs]);
  const ratingBreakdown = useMemo(() => {
    const values = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
    return values.map((value) => ({ label: `${value}★`, value: myLogs.filter((log) => Number(log.rating) === value).length })).filter((item) => item.value > 0);
  }, [myLogs]);
  const longestStreak = useMemo(() => longestLogStreak(myLogs), [myLogs]);
  const mostLovedLog = useMemo(() => {
    return [...myLogs]
      .filter((log) => log.games && log.rating !== null && log.rating !== undefined)
      .sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0) || new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0] ?? null;
  }, [myLogs]);
  const wrappedHeadline = mostLovedLog?.games?.title
    ? `Your ${currentYear} taste leans ${topLibraryGenre}, with ${mostLovedLog.games.title} sitting at the top.`
    : `Start logging games and GameLog will build your personal ${currentYear} Wrapped.`;
  const wrappedShareText = [
    `My GameLog ${currentYear} Wrapped`,
    `${myLogs.length} logged games`,
    `${completedCount} completed`,
    `${reviewedCount} reviews`,
    `${backlogCount} in backlog`,
    `Top genre: ${topLibraryGenre}`,
    `Top vibe: ${topLibraryVibe}`,
    `Average rating: ${avgRating}`
  ].join("\n");

  async function copyWrapped() {
    if (!navigator.clipboard) {
      setMessage({ type: "info", text: "Clipboard is not available in this browser." });
      return;
    }
    await navigator.clipboard.writeText(wrappedShareText);
    setMessage({ type: "ok", text: "Wrapped summary copied." });
  }
  const nextAchievement = achievementBadges.find((badge) => badge.progress < badge.target) ?? achievementBadges[achievementBadges.length - 1];

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
    try {
      const stored = window.localStorage.getItem("gamelog_beta_feedback_queue");
      if (stored) setFeedbackQueue(JSON.parse(stored));
      const requestedView = new URLSearchParams(window.location.search).get("view") as View | null;
      if (requestedView && ["home", "discover", "library", "coach", "beta", "games", "log", "feed", "sources", "profile"].includes(requestedView)) {
        setView(requestedView);
      }
    } catch {
      // Feedback queue and query routing are optional.
    }
  }, []);


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
    setGames(dedupeGameRecords(visibleGames));
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
      igdb_id: game.igdb_id ?? null,
      source: game.source ?? gameSource(game),
      source_url: game.source_url ?? null,
      is_community: true
    };
  }

  async function importExternalGames(incomingGames: Partial<Game>[], sourceName: string, options: { ignoreVisibleDuplicates?: boolean } = {}) {
    if (connected && !requireSignIn(`import ${sourceName} games`)) return 0;

    const existingBySlug = new Map(games.map((game) => [game.slug ?? game.id, game]));
    const existingByTitle = new Map(games.map((game) => [normalizeTitleKey(game.title), game]));
    const seenNewSlugs = new Set<string>();
    const inserts: Partial<Game>[] = [];
    const enrichments: Array<{ existing: Game; next: Game }> = [];
    const shadowedFallbackIds = new Set<string>();

    for (const rawGame of incomingGames) {
      const game = sanitizeImportedGame(rawGame);
      if (!game) continue;
      const slug = game.slug ?? "";
      const titleKey = normalizeTitleKey(game.title);
      const existing = options.ignoreVisibleDuplicates ? null : existingBySlug.get(slug) ?? existingByTitle.get(titleKey);

      if (existing) {
        if (connected && !isUuid(existing.id)) {
          // Supabase fallback games have local demo IDs. Insert the real record, then hide the starter copy locally.
          shadowedFallbackIds.add(existing.id);
        } else {
          if (hasUsefulIncomingData(existing, game)) {
            enrichments.push({ existing, next: mergeGameRecord(existing, game) });
          }
          continue;
        }
      }

      if (seenNewSlugs.has(slug)) continue;
      if (!existing || !connected || isUuid(existing.id)) {
        if (existingByTitle.has(titleKey)) continue;
      }
      seenNewSlugs.add(slug);
      inserts.push(game);
    }

    if (!inserts.length && !enrichments.length) {
      setMessage({ type: "info", text: `No new ${sourceName} games to add. They may already be in your catalog.` });
      return 0;
    }

    if (connected && supabase) {
      let changed = 0;

      for (const { existing, next } of enrichments) {
        const updatePayload = {
          title: next.title,
          slug: next.slug,
          developer: next.developer,
          publisher: next.publisher,
          release_year: next.release_year,
          genre: next.genre,
          platforms: next.platforms,
          cover_url: next.cover_url,
          summary: next.summary,
          is_community: true
        };
        const { error } = await supabase.from("games").update(updatePayload).eq("id", existing.id);
        if (!error) changed += 1;
      }

      if (inserts.length) {
        const records = inserts.map((game) => ({
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
          return changed;
        }
        setGames((current) => dedupeGameRecords([
          ...current
            .filter((game) => !shadowedFallbackIds.has(game.id))
            .map((game) => enrichments.find((item) => item.existing.id === game.id)?.next ?? game),
          ...((data as Game[]) ?? [])
        ]));
        changed += (data ?? []).length;
      } else if (enrichments.length || shadowedFallbackIds.size) {
        setGames((current) => dedupeGameRecords(
          current
            .filter((game) => !shadowedFallbackIds.has(game.id))
            .map((game) => enrichments.find((item) => item.existing.id === game.id)?.next ?? game)
        ));
      }

      return changed;
    }

    const demoRecords = inserts.map((game) => ({ ...game, id: crypto.randomUUID() })) as Game[];
    setGames((current) => dedupeGameRecords([
      ...current.map((game) => enrichments.find((item) => item.existing.id === game.id)?.next ?? game),
      ...demoRecords
    ]));
    return demoRecords.length + enrichments.length;
  }


  function cleanVisibleDuplicates() {
    const next = dedupeGameRecords(games);
    const removed = games.length - next.length;
    setGames(next);
    setMessage({
      type: removed ? "ok" : "info",
      text: removed ? `Cleaned ${removed} duplicate catalog card${removed === 1 ? "" : "s"} from this view.` : "No duplicate catalog cards found in the current app state."
    });
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
    "racing", "indie", "deckbuilder", "open world", "shooter", "city builder", "tactical", "zombie",
    "space", "fantasy", "warhammer", "star wars", "base building", "automation", "factory", "management",
    "colony", "detective", "mystery", "metroidvania", "platformer", "puzzle", "narrative", "visual novel",
    "jrpg", "turn based", "strategy rpg", "fighting", "skate", "truck", "flight", "hunting", "fishing",
    "card", "party", "local co-op", "vr", "sandbox", "crafting", "parkour", "stealth", "samurai", "pirate",
    "mech", "cyberpunk", "post apocalyptic", "western", "medieval", "city", "football", "baseball", "basketball"
  ];

  async function importSteamMegaPack() {
    setSteamMegaImporting(true);
    setMessage({ type: "info", text: "Starting Steam mega import. This can take several minutes because it searches a much wider set of game categories." });
    let total = 0;
    try {
      for (const term of steamMegaTerms) {
        const response = await fetch(`/api/steam/search?q=${encodeURIComponent(term)}&limit=50`);
        if (!response.ok) continue;
        const body = await response.json();
        total += await importExternalGames(body.games ?? [], `Steam ${term}`);
      }
      if (connected && supabase) await loadRemoteData(userId);
      setMessage({ type: "ok", text: `Steam mega import added ${total} new games with capsule art. This is the big catalog-builder button — run it whenever you want another wave.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Steam mega import failed." });
    } finally {
      setSteamMegaImporting(false);
    }
  }

  async function importArchiveGames() {
    const q = archiveQuery.trim();
    if (!q) {
      setMessage({ type: "info", text: "Search Internet Archive first. Try: zelda manual, doom strategy guide, mario box art, dos games." });
      return;
    }

    setArchiveImporting(true);
    setMessage(null);

    try {
      const limit = Math.max(5, Math.min(Number(archiveLimit) || 25, 75));
      const response = await fetch(`/api/archive/search?q=${encodeURIComponent(q)}&mode=${archiveMode}&limit=${limit}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `Internet Archive search failed with status ${response.status}.`);
      const added = await importExternalGames(body.games ?? [], "Internet Archive");
      if (added) setMessage({ type: "ok", text: `Imported ${added} Internet Archive records with thumbnails and source links. Use these as manuals, guide, scans, or preservation references — not as a ROM download library.` });
      else setMessage({ type: "info", text: "No new Archive records imported. They may already be in your catalog or the search was too narrow." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Internet Archive import failed." });
    } finally {
      setArchiveImporting(false);
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

  async function importCatalogSearchFromIgdb() {
    const q = query.trim();
    if (!q) {
      setMessage({ type: "info", text: "Search for a missing game first, then GameLog can pull it from IGDB." });
      return;
    }

    setCatalogImporting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/igdb/search?q=${encodeURIComponent(q)}&limit=12`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || `IGDB search failed with status ${response.status}.`);
      const changed = await importExternalGames(body.games ?? [], "IGDB catalog search");
      if (connected && supabase) await loadRemoteData(userId);
      setGenre("All");
      setMessage({ type: changed ? "ok" : "info", text: changed ? `IGDB added or improved ${changed} catalog records for "${q}".` : `IGDB did not find anything new for "${q}". Try a shorter title.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "IGDB catalog search failed." });
    } finally {
      setCatalogImporting(false);
    }
  }

  async function enrichVisibleGamesFromIgdb() {
    const candidates = filteredGames
      .filter((game) => gameSource(game) !== "IGDB" || !game.cover_url || !game.summary)
      .slice(0, 12);

    if (!candidates.length) {
      setMessage({ type: "info", text: "The visible catalog already looks enriched. Search another set of games or clear filters." });
      return;
    }

    setCatalogEnriching(true);
    setMessage({ type: "info", text: `Asking IGDB to improve ${candidates.length} visible games with covers, summaries, platforms, and release years.` });
    let changed = 0;

    try {
      for (const game of candidates) {
        const response = await fetch(`/api/igdb/search?q=${encodeURIComponent(game.title)}&limit=1`);
        if (!response.ok) continue;
        const body = await response.json();
        changed += await importExternalGames(body.games ?? [], "IGDB enrichment");
      }
      if (connected && supabase) await loadRemoteData(userId);
      setMessage({ type: changed ? "ok" : "info", text: changed ? `IGDB improved ${changed} visible game records.` : "IGDB did not find better metadata for this visible set." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "IGDB enrichment failed." });
    } finally {
      setCatalogEnriching(false);
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

  async function copyShareText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ type: "ok", text: `${label} copied.` });
    } catch {
      setMessage({ type: "info", text });
    }
  }

  async function copyBetaInvite() {
    const url = window.location.origin;
    const text = `I am testing GameLog — a mobile-first game diary with swipe discovery, IGDB imports, and a smart backlog coach. Try it here: ${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage({ type: "ok", text: "Beta invite copied. Send it to one gamer friend." });
    } catch {
      setMessage({ type: "info", text });
    }
  }

  function storeFeedbackLocally(item: { kind: FeedbackKind; body: string; target?: string; contact?: string; created_at: string }) {
    const nextQueue = [item, ...feedbackQueue].slice(0, 25);
    setFeedbackQueue(nextQueue);
    try {
      window.localStorage.setItem("gamelog_beta_feedback_queue", JSON.stringify(nextQueue));
    } catch {
      // Local feedback queue is optional.
    }
  }

  async function submitBetaFeedback() {
    const body = feedbackBody.trim();
    if (!body) {
      setMessage({ type: "error", text: "Write a quick note first so the feedback is useful." });
      return;
    }

    const item = {
      kind: feedbackKind,
      body,
      target: feedbackTarget.trim() || selectedGame?.title || view,
      contact: feedbackContact.trim() || profile.username || "",
      created_at: new Date().toISOString()
    };

    setFeedbackSending(true);
    try {
      if (connected && supabase && userId) {
        const { error } = await supabase.from("beta_feedback").insert({
          user_id: userId,
          kind: item.kind,
          body: item.body,
          target: item.target,
          contact: item.contact,
          page: window.location.href,
          app_version: "1.12.0"
        });
        if (error) throw error;
        setMessage({ type: "ok", text: "Feedback sent to the beta board." });
      } else {
        storeFeedbackLocally(item);
        const summary = `[GameLog beta feedback]
Type: ${item.kind}
Target: ${item.target}
Contact: ${item.contact}

${item.body}`;
        try { await navigator.clipboard.writeText(summary); } catch { /* ignore */ }
        setMessage({ type: "ok", text: "Feedback saved locally and copied. Paste it into a message or GitHub issue." });
      }
      setFeedbackBody("");
      setFeedbackTarget("");
    } catch (error) {
      storeFeedbackLocally(item);
      const text = error instanceof Error ? error.message : "Feedback table is not ready yet.";
      setMessage({ type: "info", text: `${text} Saved locally instead.` });
    } finally {
      setFeedbackSending(false);
    }
  }

  function openMissingGameReport(title = query || igdbQuery || "") {
    setFeedbackKind("Missing game");
    setFeedbackTarget(title);
    setFeedbackBody(title ? `Missing or incorrect catalog entry for: ${title}` : "Missing game: ");
    setView("beta");
  }

  function buildAiCoachPayload(mode: CoachMode) {
    const backlog = myLogs
      .filter((log) => ["Backlog", "Want to Play", "Currently Playing"].includes(log.status) && log.games)
      .slice(0, 40)
      .map((log) => ({
        title: log.games?.title ?? "Unknown game",
        genre: log.games?.genre,
        platforms: log.games?.platforms,
        status: log.status,
        summary: log.games?.summary
      }));

    const completed = myLogs
      .filter((log) => ["Completed", "100% Completed"].includes(log.status) && log.games)
      .slice(0, 35)
      .map((log) => ({
        title: log.games?.title ?? "Unknown game",
        genre: log.games?.genre,
        rating: log.rating,
        vibe: log.vibe,
        review: log.review
      }));

    const highRated = myLogs
      .filter((log) => Number(log.rating ?? 0) >= 4 && log.games)
      .slice(0, 25)
      .map((log) => ({
        title: log.games?.title ?? "Unknown game",
        genre: log.games?.genre,
        rating: log.rating,
        vibe: log.vibe
      }));

    const recentLogs = [...myLogs]
      .sort(sortByNewest)
      .slice(0, 20)
      .map((log) => ({
        title: log.games?.title ?? "Unknown game",
        status: log.status,
        rating: log.rating,
        vibe: log.vibe
      }));

    const unreviewed = unreviewedCompletions.slice(0, 20).map((log) => ({
      title: log.games?.title ?? "Unknown game",
      genre: log.games?.genre,
      rating: log.rating,
      vibe: log.vibe
    }));

    return {
      mode,
      profile: {
        display_name: profile.display_name,
        username: profile.username,
        favorite_game: profile.favorite_game,
        bio: profile.bio
      },
      stats: {
        total_logs: myLogs.length,
        completed: completedCount,
        backlog: backlogCount,
        average_rating: avgRating,
        top_genre: topLibraryGenre,
        top_vibe: topLibraryVibe,
        longest_log_streak: longestLogStreak(myLogs),
        discovery_swipes: discoveryActions.length,
        catalog_games: games.length
      },
      taste: { genres: tasteGenres, moods: tasteMoods },
      backlog,
      completed,
      highRated,
      recentLogs,
      unreviewed
    };
  }

  async function runAiCoach(mode: CoachMode = aiCoachMode) {
    setAiCoachMode(mode);
    setAiCoachLoading(true);
    setAiCoachText("");
    setMessage(null);

    try {
      const response = await fetch("/api/ai/backlog-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildAiCoachPayload(mode))
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `GameLog Coach failed with status ${response.status}.`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setAiCoachText(await response.text());
        return;
      }

      const decoder = new TextDecoder();
      let nextText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        nextText += decoder.decode(value, { stream: true });
        setAiCoachText(nextText);
      }
      nextText += decoder.decode();
      setAiCoachText(nextText);
    } catch (error) {
      const text = error instanceof Error ? error.message : "GameLog Coach failed.";
      setMessage({ type: "error", text });
    } finally {
      setAiCoachLoading(false);
    }
  }

  function openAiCoach(mode: CoachMode = "next") {
    setView("coach");
    void runAiCoach(mode);
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
              ["library", "Library"],
              ["games", "Games"],
              ["feed", "Social"],
              ["share", "Share"],
              ["sources", "Import"],
              ["profile", "Profile"],
              ["beta", "Beta"]
            ].map(([key, label]) => (
              <button key={key} className={`pill ${view === key ? "active" : ""}`} onClick={() => setView(key as View)}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
        <button className={`mobile-nav-item ${view === "home" ? "active" : ""}`} onClick={() => setView("home")} aria-label="Home">
          <Gamepad2 size={18} />
          <span>Home</span>
        </button>
        <button className={`mobile-nav-item ${view === "discover" ? "active" : ""}`} onClick={() => setView("discover")} aria-label="Discover">
          <Sparkles size={18} />
          <span>Swipe</span>
        </button>
        <button className={`mobile-nav-item ${view === "games" ? "active" : ""}`} onClick={() => setView("games")} aria-label="Games">
          <Search size={18} />
          <span>Games</span>
        </button>
        <button className={`mobile-nav-item ${view === "library" ? "active" : ""}`} onClick={() => setView("library")} aria-label="Library">
          <Layers3 size={18} />
          <span>Library</span>
        </button>
        <button className={`mobile-nav-item ${view === "coach" ? "active" : ""}`} onClick={() => openAiCoach("next")} aria-label="GameLog Coach">
          <Zap size={18} />
          <span>Coach</span>
        </button>
      </nav>

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
                GameLog is now built around three loops: Discover games fast, manage your library, and share your taste. Extra tools live behind Import/Profile so the app does not feel like a cockpit.
              </p>
              <div className="actions">
                <button className="primary" onClick={() => setView("discover")}><Sparkles size={18} /> Start swiping</button>
                <button className="secondary" onClick={() => setView("log")}><Gamepad2 size={18} /> Log a game</button>
                <button className="secondary" onClick={() => setView("library")}><Layers3 size={18} /> My library</button>
                <button className="secondary" onClick={() => openAiCoach("next")}><Sparkles size={18} /> GameLog Coach</button>
                <button className="secondary" onClick={() => setView("feed")}><Sparkles size={18} /> Social feed</button>
                <button className="secondary" onClick={() => setView("share")}><Share2 size={18} /> Share profile</button>
                <button className="secondary" onClick={() => setView("sources")}><DownloadCloud size={18} /> Import games</button>
                <button className="secondary" onClick={() => setView("beta")}><Rocket size={18} /> Beta board</button>
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

          <section className="launch-strip card">
            <div>
              <p className="eyebrow">v1.13 public share layer</p>
              <h2>Turn your profile into something worth sending.</h2>
              <p className="muted">The app now has cleaner public profiles, review pages, public list pages, and a Share Studio so testers can send links that feel like a real social product.</p>
            </div>
            <div className="launch-actions">
              <button className="primary" onClick={() => setView("discover")}><Sparkles size={18} /> Open swipe deck</button>
              <button className="secondary" onClick={() => setView("share")}><Share2 size={18} /> Open Share Studio</button>
              <button className="secondary" onClick={copyBetaInvite}><Share2 size={18} /> Copy beta invite</button>
              <button className="secondary" onClick={() => setView("beta")}><MessageCircle size={18} /> Give feedback</button>
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
              <p className="muted">v1.13 makes GameLog easier to share: profile cards, public list links, better review pages, and a clean Share Studio for beta invites.</p>
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

      {view === "library" && (
        <section className="grid library-view">
          <div className="col-12 hero-card library-hero">
            <div>
              <p className="eyebrow">Your player library</p>
              <h1>Turn the backlog into an actual plan.</h1>
              <p className="lede">GameLog turns shelves, progress, play history, and taste signals into a cleaner next-play plan.</p>
              <div className="actions">
                <button className="primary" onClick={() => setView("discover")}><Sparkles size={18} /> Find more games</button>
                <button className="secondary" onClick={backlogRoulette}><Shuffle size={18} /> Backlog roulette</button>
                <button className="secondary" onClick={() => setView("log")}><Star size={18} /> Write a review</button>
                <button className="secondary" onClick={() => openAiCoach("next")}><Sparkles size={18} /> GameLog Coach</button>
              </div>
            </div>
            <div className="library-score-card">
              <span className="score-ring">{completionRate}%</span>
              <strong>Completion rate</strong>
              <p className="muted">{completedCount} finished out of {myLogs.length || 0} logged games.</p>
            </div>
          </div>

          <div className="col-8 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Shelves</p>
                <h2>Your games by status</h2>
              </div>
              <button className="pill" onClick={() => setView("games")}>Browse catalog</button>
            </div>
            <div className="library-shelves">
              {libraryShelves.map((shelf) => (
                <LibraryShelf
                  key={shelf.title}
                  title={shelf.title}
                  subtitle={shelf.subtitle}
                  logs={shelf.logs}
                  onLog={(log) => startEditLog(log)}
                />
              ))}
            </div>
          </div>

          <aside className="col-4 card library-stats-card">
            <p className="eyebrow">Wrapped preview</p>
            <h2>{currentYear} snapshot</h2>
            <div className="stats library-stats-grid">
              <div className="stat"><strong>{yearlyLogs.length}</strong><span>Logs this year</span></div>
              <div className="stat"><strong>{monthlyLogs.length}</strong><span>This month</span></div>
              <div className="stat"><strong>{reviewedCount}</strong><span>Reviews written</span></div>
              <div className="stat"><strong>{backlogCount}</strong><span>Backlog</span></div>
            </div>
            <div className="divider" />
            <div className="mini-list">
              <div className="mini-row"><span>Top genre</span><strong>{topLibraryGenre}</strong></div>
              <div className="mini-row"><span>Top vibe</span><strong>{topLibraryVibe}</strong></div>
              <div className="mini-row"><span>Average rating</span><strong>{avgRating}</strong></div>
            </div>
          </aside>

          <div className="col-7 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Backlog attack plan</p>
                <h2>Play these next</h2>
              </div>
              <button className="pill" onClick={() => setView("discover")}>Refill backlog</button>
            </div>
            {backlogAttackPlan.length ? (
              <div className="attack-list">
                {backlogAttackPlan.map((log, index) => log.games ? (
                  <button className="attack-row" key={log.id} onClick={() => startEditLog(log)}>
                    <span className="attack-rank">#{index + 1}</span>
                    <GameCover game={log.games} />
                    <span><strong>{log.games.title}</strong><em>{getDiscoveryReasons(log.games, myLogs).slice(0, 2).join(" · ") || log.games.genre || "Backlog pick"}</em></span>
                  </button>
                ) : null)}
              </div>
            ) : (
              <EmptyState title="No backlog yet" body="Swipe a few games into Want or Backlog and this becomes your next-play plan." />
            )}
          </div>

          <div className="col-5 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Review prompts</p>
                <h2>Finish the thought</h2>
              </div>
              <span className="tag">{unreviewedCompletions.length} waiting</span>
            </div>
            {unreviewedCompletions.length ? (
              <div className="mini-list">
                {unreviewedCompletions.map((log) => (
                  <button className="mini-row button-row" key={log.id} onClick={() => startEditLog(log)}>
                    <span>{log.games?.title ?? "Unknown game"}</span>
                    <strong>Review</strong>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="Reviews caught up" body="Completed games with no review will show here, so you can turn logs into social posts." />
            )}
          </div>
        </section>
      )}

      {view === "coach" && (
        <section className="grid ai-coach-view">
          <div className="col-8 card ai-coach-card">
            <div className="review-top">
              <div>
                <p className="eyebrow">GameLog v1.14 · Taste Engine</p>
                <h2>GameLog Coach</h2>
                <p className="muted" style={{ marginBottom: 0 }}>GameLog reads your backlog, ratings, vibes, and taste setup, then turns them into a clean play plan without feeling like a chatbot.</p>
              </div>
              <span className="match-pill"><Sparkles size={14} /> GameLog Engine</span>
            </div>

            <div className="actions coach-actions">
              <button className={`pill ${aiCoachMode === "next" ? "active" : ""}`} onClick={() => runAiCoach("next")} disabled={aiCoachLoading}>Next game</button>
              <button className={`pill ${aiCoachMode === "weekend" ? "active" : ""}`} onClick={() => runAiCoach("weekend")} disabled={aiCoachLoading}>Weekend plan</button>
              <button className={`pill ${aiCoachMode === "review" ? "active" : ""}`} onClick={() => runAiCoach("review")} disabled={aiCoachLoading}>Log prompts</button>
              <button className={`pill ${aiCoachMode === "taste" ? "active" : ""}`} onClick={() => runAiCoach("taste")} disabled={aiCoachLoading}>Taste profile</button>
            </div>

            <div className="ai-response-box">
              {aiCoachLoading && !aiCoachText ? (
                <div className="empty-state"><Sparkles size={24} /><h3>Building your play plan...</h3><p>Checking backlog pressure, favorite genres, ratings, and completed games.</p></div>
              ) : aiCoachText ? (
                <pre>{aiCoachText}</pre>
              ) : (
                <div className="empty-state"><Target size={24} /><h3>Ask GameLog what to play next</h3><p>Use the buttons above to build a backlog plan, weekend lineup, reflection prompts, or a shareable taste summary.</p></div>
              )}
            </div>
          </div>

          <aside className="col-4 card ai-context-card">
            <p className="eyebrow">Context sent</p>
            <h2>Your current signal</h2>
            <div className="mini-list">
              <div className="mini-row"><span>Backlog</span><strong>{backlogCount}</strong></div>
              <div className="mini-row"><span>Completed</span><strong>{completedCount}</strong></div>
              <div className="mini-row"><span>Average rating</span><strong>{avgRating}</strong></div>
              <div className="mini-row"><span>Top genre</span><strong>{topLibraryGenre}</strong></div>
              <div className="mini-row"><span>Top vibe</span><strong>{topLibraryVibe}</strong></div>
            </div>
            <div className="divider" />
            <h3>Quick backlog picks</h3>
            <div className="mini-list">
              {backlogAttackPlan.slice(0, 4).map((log) => (
                <button key={log.id} className="mini-row button-row" onClick={() => log.games && setSelectedGameId(log.games.id)}>
                  <span>{log.games?.title ?? "Unknown game"}</span>
                  <strong>{log.games?.genre ?? log.status}</strong>
                </button>
              ))}
              {!backlogAttackPlan.length && <p className="muted">Add games to your backlog and the coach will have better fuel.</p>}
            </div>
            <div className="divider" />
            <button className="secondary" onClick={() => setView("library")}><Layers3 size={16} /> Back to library</button>
          </aside>
        </section>
      )}

      {view === "share" && (
        <section className="grid share-view">
          <div className="col-12 hero-card share-hero-card">
            <div>
              <p className="eyebrow">GameLog v1.13</p>
              <h1>Share Studio</h1>
              <p className="lede">Public profile, latest review, favorite shelf, and lists in one place. This is the layer that makes GameLog feel social instead of just private tracking.</p>
              <div className="actions">
                <button className="primary" onClick={() => copyShareLink(publicProfilePath, "Profile")}><Share2 size={18} /> Copy profile link</button>
                <a className="secondary inline-link" href={publicProfilePath} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open public profile</a>
                <button className="secondary" onClick={() => copyShareText(shareKitText, "Profile share card")}><MessageCircle size={18} /> Copy share card</button>
              </div>
            </div>
            <div className="public-share-card">
              <p className="eyebrow">Public profile</p>
              <h2>{profile.display_name || "GameLog Player"}</h2>
              <p>@{profile.username || "player"}</p>
              <div className="share-card-shelf">
                {favoriteShelfGames.slice(0, 4).map((game) => <GameCover key={game.id} game={game} />)}
              </div>
              <div className="wrapped-mini-grid">
                <span><strong>{myLogs.length}</strong><em>logs</em></span>
                <span><strong>{completedCount}</strong><em>done</em></span>
                <span><strong>{avgRating}</strong><em>avg</em></span>
                <span><strong>{backlogCount}</strong><em>backlog</em></span>
              </div>
            </div>
          </div>

          <div className="col-4 card share-action-card">
            <p className="eyebrow">Profile</p>
            <h2>Send your GameLog</h2>
            <p className="muted">Best general link for friends, testers, or social bios. It shows stats, shelf, recent reviews, and lists.</p>
            <div className="actions vertical-actions">
              <button className="primary" onClick={() => copyShareLink(publicProfilePath, "Profile")}><Share2 size={18} /> Copy profile link</button>
              <button className="secondary" onClick={() => setView("profile")}><UserRound size={18} /> Edit profile</button>
            </div>
          </div>

          <div className="col-4 card share-action-card">
            <p className="eyebrow">Latest take</p>
            <h2>{latestShareReview?.games?.title ?? "No review yet"}</h2>
            <p className="muted">{latestShareReview?.review || "Write one quick review and this becomes a shareable take."}</p>
            <div className="tag-row">
              {latestShareReview?.rating !== undefined && latestShareReview?.rating !== null && <span className="tag stars">{stars(latestShareReview.rating)}</span>}
              {latestShareReview?.vibe && <span className="tag">{latestShareReview.vibe}</span>}
            </div>
            <div className="actions vertical-actions">
              {latestShareReview ? <button className="primary" onClick={() => copyShareLink(`/r/${latestShareReview.id}`, "Review")}><Share2 size={18} /> Copy review link</button> : <button className="primary" onClick={() => setView("log")}><Star size={18} /> Write a review</button>}
              {latestShareReview && <a className="secondary inline-link" href={`/r/${latestShareReview.id}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open review page</a>}
            </div>
          </div>

          <div className="col-4 card share-action-card">
            <p className="eyebrow">Lists</p>
            <h2>{topShareList?.title ?? "Create a list"}</h2>
            <p className="muted">{topShareList?.description || "Lists are perfect for sharing taste: favorites, hidden gems, cozy picks, horror nights, or backlog goals."}</p>
            <div className="actions vertical-actions">
              {topShareList ? <button className="primary" onClick={() => copyShareLink(`/l/${topShareList.id}`, "List")}><Share2 size={18} /> Copy list link</button> : <button className="primary" onClick={() => setView("lists")}><ListPlus size={18} /> Make a list</button>}
              {topShareList && <a className="secondary inline-link" href={`/l/${topShareList.id}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open list page</a>}
            </div>
          </div>

          <div className="col-7 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Copy/paste invite</p>
                <h2>Beta message that does not sound boring</h2>
              </div>
              <button className="secondary" onClick={copyBetaInvite}><Share2 size={16} /> Copy invite</button>
            </div>
            <p className="share-script">I am testing GameLog — a mobile-first game diary with swipe discovery, IGDB imports, public profiles, lists, and a smart backlog coach. Build your profile, import a few games, and tell me what feels rough.</p>
          </div>

          <aside className="col-5 card">
            <p className="eyebrow">Public links checklist</p>
            <h2>Make the share page hit harder</h2>
            <div className="mini-list">
              <button className="mini-row button-row" onClick={() => setView("profile")}><span>Profile polish</span><strong>{profileNeedsSetup ? "Needs setup" : "Looks good"}</strong></button>
              <button className="mini-row button-row" onClick={() => setView("log")}><span>Review count</span><strong>{reviewedCount} written</strong></button>
              <button className="mini-row button-row" onClick={() => setView("lists")}><span>Public lists</span><strong>{lists.filter((list) => list.user_id === currentUserId).length}</strong></button>
              <button className="mini-row button-row" onClick={() => setView("wrapped")}><span>Wrapped card</span><strong>{currentYear}</strong></button>
            </div>
          </aside>
        </section>
      )}

      {view === "beta" && (
        <section className="stack">
          <div className="hero-card beta-hero">
            <p className="eyebrow">Public beta command center</p>
            <h1>Ship it to a few testers, then fix what they actually hit.</h1>
            <p className="lede">Use this page for quick feedback, missing games, duplicate reports, and the launch checklist. This keeps GameLog moving without adding more clutter to the main app loop.</p>
            <div className="actions">
              <button className="primary" onClick={copyBetaInvite}><Share2 size={18} /> Copy beta invite</button>
              <button className="secondary" onClick={() => setView("games")}><Search size={18} /> Check catalog</button>
              <button className="secondary" onClick={() => openAiCoach("next")}><Zap size={18} /> Test Coach</button>
            </div>
          </div>

          <div className="beta-grid">
            <div className="card">
              <p className="eyebrow">Feedback</p>
              <h2>Report what needs fixing</h2>
              <div className="form-grid compact-form">
                <label>Type
                  <select value={feedbackKind} onChange={(event) => setFeedbackKind(event.target.value as FeedbackKind)}>
                    {(["Bug", "Missing game", "Duplicate game", "Feature idea", "UI polish", "Other"] as FeedbackKind[]).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label>Game / page / target
                  <input value={feedbackTarget} onChange={(event) => setFeedbackTarget(event.target.value)} placeholder="Example: Silent Hill 2 duplicate" />
                </label>
                <label>Contact optional
                  <input value={feedbackContact} onChange={(event) => setFeedbackContact(event.target.value)} placeholder="Discord, email, or username" />
                </label>
                <label className="full-span">What happened?
                  <textarea value={feedbackBody} onChange={(event) => setFeedbackBody(event.target.value)} rows={5} placeholder="Quick note: what felt broken, confusing, missing, or awesome?" />
                </label>
              </div>
              <div className="actions">
                <button className="primary" onClick={submitBetaFeedback} disabled={feedbackSending}><Send size={18} /> {feedbackSending ? "Sending..." : "Send feedback"}</button>
                <button className="secondary" onClick={() => openMissingGameReport()}><Target size={18} /> Missing game</button>
              </div>
              <p className="muted small">If the Supabase feedback table is not installed yet, GameLog saves the note locally and copies it so you can paste it anywhere.</p>
            </div>

            <div className="card">
              <p className="eyebrow">Launch checklist</p>
              <h2>Before sharing wider</h2>
              <div className="checklist">
                <div><CheckCircle2 size={18} /><span>Vercel deploys from GitHub main</span></div>
                <div><CheckCircle2 size={18} /><span>Supabase auth redirect uses live Vercel URL</span></div>
                <div><CheckCircle2 size={18} /><span>IGDB keys are in local and Vercel env vars</span></div>
                <div><CheckCircle2 size={18} /><span>GameLog Engine smoke test works</span></div>
                <div><CheckCircle2 size={18} /><span>Games tab can import and clean duplicates</span></div>
                <div><CheckCircle2 size={18} /><span>Mobile bottom nav works on phone</span></div>
              </div>
            </div>

            <div className="card">
              <p className="eyebrow">Queued locally</p>
              <h2>{feedbackQueue.length} saved notes</h2>
              {feedbackQueue.length ? (
                <div className="mini-list">
                  {feedbackQueue.slice(0, 5).map((item, index) => (
                    <div className="mini-row" key={`${item.created_at}-${index}`}>
                      <span>{item.kind}</span>
                      <strong>{item.target || "General"}</strong>
                    </div>
                  ))}
                </div>
              ) : <p className="muted">No local notes yet. Connected users can write into Supabase after running the v1.12 SQL.</p>}
            </div>
          </div>
        </section>
      )}

      {view === "quests" && (
        <section className="grid quests-view">
          <div className="col-12 hero-card quest-hero">
            <div>
              <p className="eyebrow">GameLog v1.4</p>
              <h1>Daily quests for your gaming life.</h1>
              <p className="lede">The Quest Board turns GameLog into a habit loop: swipe a few games, write one review, clear the backlog, and unlock profile milestones.</p>
              <div className="actions">
                <button className="primary" onClick={() => setView("discover")}><Zap size={18} /> Start today&apos;s deck</button>
                <button className="secondary" onClick={backlogRoulette}><Shuffle size={18} /> Pick tonight&apos;s game</button>
                <button className="secondary" onClick={() => setView("library")}><Layers3 size={18} /> Open library</button>
              </div>
            </div>
            <div className="level-card">
              <div className="level-orb">Lv {playerLevel}</div>
              <strong>{playerXp.toLocaleString()} XP</strong>
              <p className="muted">{Math.max(0, nextLevelXp - playerXp).toLocaleString()} XP to level {playerLevel + 1}</p>
              <div className="progress-bar"><span style={{ width: `${levelProgress}%` }} /></div>
            </div>
          </div>

          <div className="col-8 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Today&apos;s board</p>
                <h2>Keep the loop moving</h2>
              </div>
              <span className="tag"><BadgeCheck size={13} /> {questCards.filter((quest) => quest.progress >= quest.target).length}/{questCards.length} done</span>
            </div>
            <div className="quest-grid">
              {questCards.map((quest) => (
                <QuestCard key={quest.title} quest={quest} />
              ))}
            </div>
          </div>

          <aside className="col-4 card">
            <p className="eyebrow">Next unlock</p>
            <h2>{nextAchievement.title}</h2>
            <p className="muted">{nextAchievement.body}</p>
            <div className="big-progress">
              <strong>{Math.min(nextAchievement.progress, nextAchievement.target)}/{nextAchievement.target}</strong>
              <div className="progress-bar"><span style={{ width: `${clampProgress(nextAchievement.progress, nextAchievement.target)}%` }} /></div>
            </div>
            <div className="divider" />
            <div className="stats compact-stats">
              <div className="stat"><strong>{todayPlayedLogs.length}</strong><span>Today logs</span></div>
              <div className="stat"><strong>{todayDiscoveryActions.length}</strong><span>Today swipes</span></div>
              <div className="stat"><strong>{unlockedAchievements}</strong><span>Badges</span></div>
              <div className="stat"><strong>{completionRate}%</strong><span>Done rate</span></div>
            </div>
          </aside>

          <div className="col-12 card achievement-card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Profile badges</p>
                <h2>Milestones that make the profile feel alive</h2>
              </div>
              <button className="pill" onClick={() => setView("profile")}>View profile</button>
            </div>
            <div className="achievement-grid">
              {achievementBadges.map((badge) => (
                <AchievementBadge key={badge.title} badge={badge} />
              ))}
            </div>
          </div>

          <div className="col-7 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Tonight&apos;s best picks</p>
                <h2>For you from your backlog</h2>
              </div>
              <button className="pill" onClick={backlogRoulette}>Roulette</button>
            </div>
            {backlogAttackPlan.length ? (
              <div className="attack-list">
                {backlogAttackPlan.map((log, index) => log.games ? (
                  <button className="attack-row" key={log.id} onClick={() => startEditLog(log)}>
                    <span className="attack-rank">#{index + 1}</span>
                    <GameCover game={log.games} />
                    <span><strong>{log.games.title}</strong><em>{getDiscoveryReasons(log.games, myLogs).slice(0, 2).join(" · ") || log.games.genre || "Backlog pick"}</em></span>
                  </button>
                ) : null)}
              </div>
            ) : (
              <EmptyState title="No backlog to attack" body="Swipe games into Want or Backlog and this becomes your nightly pick list." />
            )}
          </div>

          <div className="col-5 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Review fuel</p>
                <h2>Games waiting for a take</h2>
              </div>
              <span className="tag">{unreviewedCompletions.length} prompts</span>
            </div>
            {unreviewedCompletions.length ? (
              <div className="mini-list">
                {unreviewedCompletions.map((log) => (
                  <button className="mini-row button-row" key={log.id} onClick={() => startEditLog(log)}>
                    <span>{log.games?.title ?? "Unknown game"}</span>
                    <strong>Review</strong>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No review debt" body="Complete more games or mark older logs as completed to generate prompts." />
            )}
          </div>
        </section>
      )}

      {view === "wrapped" && (
        <section className="grid wrapped-view">
          <div className="col-12 hero-card wrapped-hero">
            <div>
              <p className="eyebrow">GameLog v1.5</p>
              <h1>Your gaming taste, turned into a share card.</h1>
              <p className="lede">Wrapped turns your logs into a flexable snapshot: what you played, what you finished, what you loved, and what your backlog says about you.</p>
              <div className="actions">
                <button className="primary" onClick={copyWrapped}><Share2 size={18} /> Copy Wrapped</button>
                <button className="secondary" onClick={() => setView("library")}><Layers3 size={18} /> Open library</button>
                <button className="secondary" onClick={() => setView("log")}><Star size={18} /> Add a log</button>
              </div>
            </div>
            <div className="wrapped-share-card">
              <p className="eyebrow">{currentYear} Wrapped</p>
              <h2>{profile.display_name || profile.username || "GameLog Player"}</h2>
              <p>{wrappedHeadline}</p>
              <div className="wrapped-mini-grid">
                <span><strong>{myLogs.length}</strong><em>logs</em></span>
                <span><strong>{completedCount}</strong><em>finished</em></span>
                <span><strong>{avgRating}</strong><em>avg</em></span>
                <span><strong>{longestStreak}</strong><em>day streak</em></span>
              </div>
            </div>
          </div>

          <div className="col-4 card wrapped-stat-card">
            <p className="eyebrow">Identity</p>
            <h2>{topLibraryGenre}</h2>
            <p className="muted">Your top genre across logged games.</p>
          </div>
          <div className="col-4 card wrapped-stat-card">
            <p className="eyebrow">Vibe</p>
            <h2>{topLibraryVibe}</h2>
            <p className="muted">The label you keep coming back to.</p>
          </div>
          <div className="col-4 card wrapped-stat-card">
            <p className="eyebrow">Backlog pressure</p>
            <h2>{backlogCount}</h2>
            <p className="muted">Games waiting for the next session.</p>
          </div>

          <div className="col-7 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Taste breakdown</p>
                <h2>Genres you actually play</h2>
              </div>
              <span className="tag">{myLogs.length} logs</span>
            </div>
            <WrappedBars items={wrappedGenreBreakdown} empty="Log a few games and genres will appear here." />
            <div className="divider" />
            <h3>Rating curve</h3>
            <WrappedBars items={ratingBreakdown} empty="Rate games to build your curve." />
          </div>

          <aside className="col-5 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Most loved</p>
                <h2>Top shelf pick</h2>
              </div>
              <button className="pill" onClick={() => setView("profile")}>Profile</button>
            </div>
            {mostLovedLog?.games ? (
              <button className="wrapped-loved-card" onClick={() => setSelectedGameId(mostLovedLog.games!.id)}>
                <GameCover game={mostLovedLog.games} variant="hero" />
                <span>
                  <strong>{mostLovedLog.games.title}</strong>
                  <em>{stars(mostLovedLog.rating)} · {mostLovedLog.vibe || mostLovedLog.status}</em>
                </span>
              </button>
            ) : (
              <EmptyState title="No top pick yet" body="Rate at least one game and GameLog will crown your current favorite." />
            )}
            <div className="divider" />
            <h3>Platform footprint</h3>
            <WrappedBars items={wrappedPlatformBreakdown} empty="Log games with platforms to see where you play most." />
          </aside>

          <div className="col-6 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Mood map</p>
                <h2>Your review vibes</h2>
              </div>
            </div>
            <WrappedBars items={wrappedVibeBreakdown} empty="Add vibes to logs to build your mood map." />
          </div>

          <div className="col-6 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Next best moves</p>
                <h2>Make next month better</h2>
              </div>
            </div>
            <div className="mini-list">
              <button className="mini-row button-row" onClick={() => setView("discover")}><span>Train your taste</span><strong>{Math.max(0, 50 - discoveryActions.length)} swipes to badge</strong></button>
              <button className="mini-row button-row" onClick={() => setView("library")}><span>Cut the backlog</span><strong>{backlogAttackPlan[0]?.games?.title ?? "Pick a game"}</strong></button>
              <button className="mini-row button-row" onClick={() => setView("log")}><span>Write more takes</span><strong>{unreviewedCompletions.length} prompts</strong></button>
              <button className="mini-row button-row" onClick={() => setView("quests")}><span>Daily loop</span><strong>{questCards.filter((quest) => quest.progress >= quest.target).length}/{questCards.length} quests</strong></button>
            </div>
          </div>
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
              <div className="actions" style={{ marginTop: 0 }}>
                <button className="secondary" onClick={enrichVisibleGamesFromIgdb} disabled={catalogEnriching}><Sparkles size={16} /> {catalogEnriching ? "Enriching..." : "Enrich visible"}</button>
                <button className="secondary" onClick={cleanVisibleDuplicates} disabled={!hiddenDuplicateCount}>Clean duplicates{hiddenDuplicateCount ? ` (${hiddenDuplicateCount})` : ""}</button>
                <button className="secondary" onClick={() => setView("log")}>Log selected</button>
              </div>
            </div>
            <div className="catalog-engine-note">
              <BadgeCheck size={16} /> v1.12 keeps duplicate cleanup and Show More, then adds a beta feedback loop so testers can help fix missing games and UI friction fast.
            </div>
            <div className="catalog-toolbar">
              <span><strong>{filteredGames.length}</strong> matches</span>
              <span><strong>{displayedGames.length}</strong> showing</span>
              <span><strong>{coverCount}</strong> covers</span>
              {hiddenDuplicateCount ? <span><strong>{hiddenDuplicateCount}</strong> dupes hidden</span> : <span>Clean catalog view</span>}
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
              {displayedGames.map((game) => (
                <GameCard key={game.id} game={game} onLog={() => { setLogGameId(game.id); setView("log"); }} onDetails={() => setSelectedGameId(game.id)} />
              ))}
            </div>
            {remainingFilteredGames > 0 && (
              <div className="show-more-row">
                <button className="primary" onClick={() => setGameDisplayLimit((current) => current + 48)}>Show more games ({remainingFilteredGames} left)</button>
                <button className="secondary" onClick={() => setGameDisplayLimit(filteredGames.length)}>Show all</button>
              </div>
            )}
            {!filteredGames.length && (
              <div className="empty big-empty catalog-miss">
                <h3>No local match for “{query || "that search"}”</h3>
                <p className="muted">Pull it from IGDB now instead of manually adding it. GameLog will import cover art, platforms, genre, release year, and summary when IGDB has it.</p>
                <button className="primary" onClick={importCatalogSearchFromIgdb} disabled={catalogImporting || !query.trim()}><DownloadCloud size={18} /> {catalogImporting ? "Searching IGDB..." : "Search + import from IGDB"}</button>
              </div>
            )}
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
                  {catalogGames.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}
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
                  {catalogGames.map((game) => <option key={game.id} value={game.id}>{game.title}</option>)}
                </select>
              </div>
              <button className="secondary" onClick={addGameToList} disabled={!lists.length}>Add to list</button>
            </div>
          </div>
          <div className="col-7 card">
            <h2>Public lists</h2>
            <div className="list-stack">
              {lists.length ? lists.map((list) => <GameListCard key={list.id} list={list} onShare={(id) => copyShareLink(`/l/${id}`, "List")} />) : <div className="empty">No lists yet.</div>}
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
        <section className="grid compact-import-page">
          <div className="col-8 card">
            <div className="review-top">
              <div>
                <p className="eyebrow">Import hub</p>
                <h2>Grow the catalog without a wall of panels</h2>
                <p className="muted" style={{ marginBottom: 0 }}>
                  One compact place for Archive manuals/guides, IGDB covers, Steam games, RAWG pages, itch.io, and bulk imports. Pick a source, run it, then get back to Discover.
                </p>
              </div>
              <span className="tag">{coverCount}/{games.length} covers</span>
            </div>

            <div className="stats compact-stats">
              <div className="stat"><strong>{games.length}</strong><span>Total games</span></div>
              <div className="stat"><strong>{coverCount}</strong><span>With art</span></div>
              <div className="stat"><strong>{games.length ? Math.round((coverCount / games.length) * 100) : 0}%</strong><span>Cover rate</span></div>
              <div className="stat"><strong>{filteredGames.length}</strong><span>Searchable</span></div>
            </div>

            {(usingStarterFallback || remoteCatalogEmpty) && (
              <div className="notice info" style={{ marginTop: 16 }}>
                Supabase catalog looks empty. <button className="inline-button" onClick={installStarterCatalog} disabled={importingGames}>{importingGames ? "Installing..." : "Install starter catalog"}</button>
              </div>
            )}

            <div className="source-tabs" role="tablist" aria-label="Catalog source picker">
              {[
                ["archive", "Archive"],
                ["igdb", "IGDB"],
                ["steam", "Steam"],
                ["rawg", "RAWG"],
                ["itch", "itch.io"],
                ["bulk", "Bulk"]
              ].map(([key, label]) => (
                <button key={key} className={`pill ${sourceMode === key ? "active" : ""}`} onClick={() => setSourceMode(key as SourceMode)}>{label}</button>
              ))}
            </div>

            <section className="source-card single-source-card">
              {sourceMode === "archive" && (
                <>
                  <div className="review-top">
                    <div>
                      <h3>Internet Archive manuals, guides, scans, and software records</h3>
                      <p className="muted">Search Archive metadata and import useful records with thumbnail art and source links. GameLog links to Archive pages instead of trying to rehost or directly download copyrighted games.</p>
                    </div>
                    <span className="tag">No API key</span>
                  </div>
                  <div className="form-grid three">
                    <div className="field">
                      <label><Search size={14} /> Archive search</label>
                      <input value={archiveQuery} onChange={(event) => setArchiveQuery(event.target.value)} placeholder="zelda manual, doom guide, dos game, box art..." />
                    </div>
                    <div className="field">
                      <label>Kind</label>
                      <select value={archiveMode} onChange={(event) => setArchiveMode(event.target.value as ArchiveMode)}>
                        <option value="guides">Manuals / guides</option>
                        <option value="software">Software records</option>
                        <option value="covers">Box art / scans</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Limit</label>
                      <select value={archiveLimit} onChange={(event) => setArchiveLimit(event.target.value)}>
                        <option>10</option>
                        <option>25</option>
                        <option>50</option>
                        <option>75</option>
                      </select>
                    </div>
                  </div>
                  <div className="actions" style={{ marginTop: 12 }}>
                    <button className="primary source-button" onClick={importArchiveGames} disabled={archiveImporting}>
                      <DownloadCloud size={18} /> {archiveImporting ? "Searching Archive..." : "Import Archive results"}
                    </button>
                    <a className="secondary inline-link" href={archiveSearchUrl(archiveQuery || "video game manual", archiveMode)} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open Archive search</a>
                  </div>
                </>
              )}

              {sourceMode === "igdb" && (
                <>
                  <div className="review-top"><div><h3>IGDB-first catalog engine</h3><p className="muted">Best for real game covers, platforms, genres, summaries, and cross-platform catalog quality. v1.10 also merges duplicates by title so imports enrich existing records instead of flooding the catalog.</p></div><span className="tag source-igdb">Primary source</span></div>
                  <div className="form-grid three">
                    <div className="field"><label><Search size={14} /> IGDB search</label><input value={igdbQuery} onChange={(event) => setIgdbQuery(event.target.value)} placeholder="zelda, minecraft, one piece, horror..." /></div>
                    <div className="field"><label>Limit</label><select value={igdbLimit} onChange={(event) => setIgdbLimit(event.target.value)}><option>10</option><option>30</option><option>50</option><option>75</option></select></div>
                    <button className="primary source-button" onClick={importIgdbSearchGames} disabled={igdbImporting}><DownloadCloud size={18} /> {igdbImporting ? "Importing..." : "Import / enrich IGDB search"}</button>
                  </div>
                  <div className="actions" style={{ marginTop: 12 }}><button className="secondary" onClick={importIgdbPopularGames} disabled={igdbImporting}><DownloadCloud size={18} /> Import 75 popular games</button><button className="secondary" onClick={() => { setQuery(igdbQuery); setView("games"); }}><Search size={16} /> Test in catalog</button><span className="tag">Offset {igdbOffset}</span></div>
                </>
              )}

              {sourceMode === "steam" && (
                <>
                  <div className="review-top"><div><h3>Steam search import</h3><p className="muted">Fast PC game imports with Steam capsule art. Use search for precise terms or mega import for a broad starter wave.</p></div><span className="tag">PC</span></div>
                  <div className="form-grid three">
                    <div className="field"><label><Search size={14} /> Steam search</label><input value={steamQuery} onChange={(event) => setSteamQuery(event.target.value)} placeholder="elden ring, souls, farming, shooter..." /></div>
                    <div className="field"><label>Limit</label><select value={steamImportLimit} onChange={(event) => setSteamImportLimit(event.target.value)}><option>10</option><option>30</option><option>50</option><option>75</option></select></div>
                    <button className="primary source-button" onClick={importSteamSearchGames} disabled={steamImporting}><DownloadCloud size={18} /> {steamImporting ? "Importing..." : "Import Steam"}</button>
                  </div>
                  <div className="actions" style={{ marginTop: 12 }}><button className="secondary" onClick={importSteamMegaPack} disabled={steamMegaImporting}><DownloadCloud size={18} /> {steamMegaImporting ? "Mega importing..." : "Steam mega import"}</button></div>
                </>
              )}

              {sourceMode === "rawg" && (
                <>
                  <div className="review-top"><div><h3>RAWG import</h3><p className="muted">Huge general game database and image fields. Add NEXT_PUBLIC_RAWG_API_KEY to .env.local to enable page imports.</p></div><span className="tag">Page {rawgPage}</span></div>
                  <button className="primary" onClick={importRawgTrendingGames} disabled={importingGames}><DownloadCloud size={18} /> {importingGames ? "Importing..." : rawgApiKey ? "Import next 40 RAWG games" : "RAWG key missing"}</button>
                </>
              )}

              {sourceMode === "itch" && (
                <>
                  <div className="review-top"><div><h3>itch.io manual import</h3><p className="muted">Add indie/web games manually by title, page URL, cover URL, genre, and platforms.</p></div><span className="tag">Indie</span></div>
                  <div className="form-grid two">
                    <div className="field"><label>Game title</label><input value={itchTitle} onChange={(event) => setItchTitle(event.target.value)} placeholder="Indie game title" /></div>
                    <div className="field"><label>itch.io page URL</label><input value={itchUrl} onChange={(event) => setItchUrl(event.target.value)} placeholder="https://creator.itch.io/game" /></div>
                    <div className="field"><label>Cover image URL</label><input value={itchCoverUrl} onChange={(event) => setItchCoverUrl(event.target.value)} placeholder="https://img.itch.zone/..." /></div>
                    <div className="field"><label>Genre</label><input value={itchGenre} onChange={(event) => setItchGenre(event.target.value)} placeholder="Indie, Horror, Platformer..." /></div>
                    <div className="field"><label>Platforms</label><input value={itchPlatforms} onChange={(event) => setItchPlatforms(event.target.value)} placeholder="PC, Web, Mac, Linux" /></div>
                    <button className="secondary source-button" onClick={addItchGame}><ListPlus size={18} /> Add itch game</button>
                  </div>
                </>
              )}

              {sourceMode === "bulk" && (
                <>
                  <div className="review-top"><div><h3>Bulk import any source</h3><p className="muted">Paste one game per line: title | cover_url | source_url | genre | platforms comma-separated</p></div><span className="tag">Any site</span></div>
                  <div className="field"><label>Bulk lines</label><textarea value={bulkImportText} onChange={(event) => setBulkImportText(event.target.value)} placeholder={"Example Game | https://example.com/cover.jpg | https://example.com/game | Horror | PC, Web"} /></div>
                  <button className="secondary" onClick={importBulkGames}><ListPlus size={18} /> Bulk import</button>
                </>
              )}
            </section>
          </div>

          <aside className="col-4 card">
            <h2>Less panels, more product</h2>
            <p className="muted">v1.10 keeps the import hub compact but makes IGDB the primary catalog engine: search, import, enrich, and de-duplicate.</p>
            <div className="divider" />
            <div className="mini-list">
              <button className="mini-row button-row" onClick={() => setSourceMode("archive")}><span>Archive</span><strong>Manuals/guides</strong></button>
              <button className="mini-row button-row" onClick={() => setSourceMode("igdb")}><span>IGDB</span><strong>Best covers</strong></button>
              <button className="mini-row button-row" onClick={() => setSourceMode("steam")}><span>Steam</span><strong>PC catalog</strong></button>
              <button className="mini-row button-row" onClick={() => setView("discover")}><span>Done importing?</span><strong>Swipe now</strong></button>
            </div>
            <div className="divider" />
            <p className="muted">Archive records are for discovery, metadata, manuals, guides, scans, and source links. GameLog should not become a ROM-download app.</p>
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
                  <button className="secondary" onClick={() => setView("share")}><Share2 size={18} /> Share Studio</button>
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
                <button className="secondary" onClick={() => setView("share")}><Share2 size={18} /> Share Studio</button>
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
              <div className="actions" style={{ marginTop: 0 }}>
                <button className="secondary" onClick={() => setView("share")}><Share2 size={16} /> Share Studio</button>
                <button className="secondary" onClick={() => copyShareLink(`/u/${profile.username}`, "Profile")}><Share2 size={16} /> Copy profile link</button>
              </div>
            </div>
            <CoverRail games={favoriteShelfGames} onPick={(game) => setSelectedGameId(game.id)} />
          </div>
        </section>
      )}
    </main>
  );
}

function WrappedBars({ items, empty }: { items: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  if (!items.length) return <p className="muted">{empty}</p>;

  return (
    <div className="wrapped-bars">
      {items.map((item) => (
        <div className="wrapped-bar-row" key={item.label}>
          <div className="wrapped-bar-label"><span>{item.label}</span><strong>{item.value}</strong></div>
          <div className="wrapped-bar-track"><span style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
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
          <span className={`tag source-badge source-${gameSource(game).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{gameSource(game)}</span>
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



function LibraryShelf({ title, subtitle, logs, onLog }: { title: string; subtitle: string; logs: GameLog[]; onLog: (log: GameLog) => void }) {
  return (
    <section className="library-shelf">
      <div className="review-top shelf-heading">
        <div>
          <h3>{title}</h3>
          <p className="muted" style={{ marginBottom: 0 }}>{subtitle}</p>
        </div>
        <span className="tag">{logs.length}</span>
      </div>
      {logs.length ? (
        <div className="library-row">
          {logs.slice(0, 8).map((log) => log.games ? (
            <button className="library-game" key={log.id} onClick={() => onLog(log)} title={`Open ${log.games?.title ?? "game"} log`}>
              <GameCover game={log.games} />
              <strong>{log.games.title}</strong>
              <span>{log.rating ? stars(log.rating) : log.status}</span>
            </button>
          ) : null)}
        </div>
      ) : (
        <p className="muted shelf-empty">Nothing here yet.</p>
      )}
    </section>
  );
}

type QuestCardModel = {
  title: string;
  body: string;
  progress: number;
  target: number;
  cta: string;
  action: () => void;
  icon: string;
};

function QuestCard({ quest }: { quest: QuestCardModel }) {
  const complete = quest.progress >= quest.target;
  const percent = clampProgress(quest.progress, quest.target);
  return (
    <article className={`quest-card ${complete ? "complete" : ""}`}>
      <div className="quest-icon">{complete ? <BadgeCheck size={22} /> : quest.icon}</div>
      <div>
        <div className="review-top quest-title-row">
          <h3>{quest.title}</h3>
          <span className="tag">{Math.min(quest.progress, quest.target)}/{quest.target}</span>
        </div>
        <p className="muted">{quest.body}</p>
        <div className="progress-bar"><span style={{ width: `${percent}%` }} /></div>
        <button className={complete ? "secondary" : "primary"} onClick={quest.action}>{complete ? "Done" : quest.cta}</button>
      </div>
    </article>
  );
}

function AchievementBadge({ badge }: { badge: { title: string; body: string; progress: number; target: number } }) {
  const complete = badge.progress >= badge.target;
  return (
    <article className={`achievement-badge ${complete ? "unlocked" : ""}`}>
      <div className="badge-medal">{complete ? <Award size={24} /> : <Target size={22} />}</div>
      <div>
        <h3>{badge.title}</h3>
        <p className="muted">{badge.body}</p>
        <div className="progress-bar"><span style={{ width: `${clampProgress(badge.progress, badge.target)}%` }} /></div>
        <span className="tag">{Math.min(badge.progress, badge.target)}/{badge.target} {complete ? "unlocked" : "progress"}</span>
      </div>
    </article>
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
        <span className={`tag source-badge source-${gameSource(game).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{gameSource(game)}</span>
        <span className="tag">{logs.length} logs</span>
        {game.genre && <span className="tag">{game.genre}</span>}
        {(game.platforms ?? []).map((platform) => <span className="tag" key={platform}>{platform}</span>)}
      </div>
      <div className="actions">
        <button className="primary" onClick={onLog}><Star size={16} /> Log this game</button>
        {game.slug && <a className="secondary inline-link" href={`/g/${game.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Public game page</a>}
        <a className="secondary inline-link" href={archiveSearchUrl(game.title, "guides")} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Find manuals/guides</a>
        {archiveDetailsUrlFromGame(game) && <a className="secondary inline-link" href={archiveDetailsUrlFromGame(game) ?? "#"} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open Archive item</a>}
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

function GameListCard({ list, onShare }: { list: GameList; onShare?: (listId: string) => void }) {
  return (
    <article className="list-card list-card-v13">
      <div className="review-top">
        <div>
          <h3>{list.title}</h3>
          <p className="muted" style={{ marginBottom: 0 }}>by @{list.profiles?.username ?? "player"}</p>
        </div>
        <span className="tag">{list.list_items?.length ?? 0} games</span>
      </div>
      {list.description && <p className="muted" style={{ marginTop: 12 }}>{list.description}</p>}
      <div className="list-cover-strip">
        {(list.list_items ?? []).slice(0, 5).map((item) => item.games ? <GameCover key={item.id} game={item.games} /> : null)}
      </div>
      <div className="tag-row">
        {(list.list_items ?? []).slice(0, 8).map((item) => item.games ? <span className="tag" key={item.id}>{item.games.title}</span> : null)}
      </div>
      <div className="card-actions">
        <a className="secondary inline-link" href={`/l/${list.id}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open list</a>
        {onShare && <button className="secondary" onClick={() => onShare(list.id)}><Share2 size={15} /> Copy link</button>}
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
