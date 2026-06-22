import type { Game } from "@/lib/types";

export type CompletionBucket = "Short" | "Weekend" | "Long" | "Massive" | "Ongoing";

export type CompletionEstimate = {
  mainHours: number;
  extraHours: number;
  completionistHours: number;
  bucket: CompletionBucket;
  label: string;
  compactLabel: string;
  reason: string;
};

function cleanNumber(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function explicitHours(game: Partial<Game>) {
  const record = game as Partial<Game> & Record<string, unknown>;
  return cleanNumber(record.time_to_beat_main_hours)
    ?? cleanNumber(record.how_long_to_beat_main_hours)
    ?? cleanNumber(record.main_story_hours)
    ?? cleanNumber(record.completion_hours)
    ?? null;
}

export function formatCompletionHours(hours: number | null | undefined) {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return "Unknown";
  if (hours < 1) return "<1h";
  if (hours < 10) return `${Math.round(hours * 2) / 2}h`;
  return `${Math.round(hours)}h`;
}

export function completionBucketForHours(hours: number, ongoing = false): CompletionBucket {
  if (ongoing) return "Ongoing";
  if (hours <= 12) return "Short";
  if (hours <= 30) return "Weekend";
  if (hours <= 70) return "Long";
  return "Massive";
}

export function timeBucketLabel(bucket: CompletionBucket) {
  switch (bucket) {
    case "Short": return "Short finish";
    case "Weekend": return "Weekend game";
    case "Long": return "Long run";
    case "Massive": return "Massive save";
    case "Ongoing": return "Ongoing";
  }
}

export function completionEstimateForGame(game: Partial<Game>): CompletionEstimate {
  const title = (game.title ?? "").toLowerCase();
  const genre = (game.genre ?? "").toLowerCase();
  const summary = (game.summary ?? "").toLowerCase();
  const developer = (game.developer ?? "").toLowerCase();
  const publisher = (game.publisher ?? "").toLowerCase();
  const platforms = (game.platforms ?? []).join(" ").toLowerCase();
  const text = [title, genre, summary, developer, publisher, platforms].join(" ");
  const productType = game.product_type ?? null;

  const explicit = explicitHours(game);
  let mainHours = explicit ?? 18;
  let reason = explicit ? "Catalog time data" : "GameLog estimate";
  let ongoing = false;

  if (!explicit) {
    if (productType === "soundtrack") {
      mainHours = 1;
      reason = "Soundtrack / extra";
    } else if (productType === "dlc") {
      mainHours = /expansion|campaign|story|episode|chapter|quest/.test(text) ? 8 : 3;
      reason = "DLC estimate";
    } else if (productType === "edition" || productType === "bundle") {
      mainHours = 28;
      reason = "Edition / bundle estimate";
    } else if (/mmo|live service|battle royale|fortnite|warzone|destiny|league of legends|valorant|apex|rocket league|overwatch|minecraft|roblox|counter-strike|sports|nba|madden|fifa|ea sports|manager|football manager/.test(text)) {
      mainHours = 90;
      ongoing = true;
      reason = "Ongoing / live game";
    } else if (/4x|grand strategy|civilization|crusader kings|stellaris|total war|rimworld|factorio|satisfactory|oxygen not included|city|builder|management|simulation|simulator|sandbox|survival/.test(text)) {
      mainHours = 75;
      reason = "Systems-heavy game";
    } else if (/open world|open-world|elder scrolls|skyrim|fallout|witcher|red dead|assassin|far cry|zelda|tears of the kingdom|breath of the wild|elden ring/.test(text)) {
      mainHours = 65;
      reason = "Open-world estimate";
    } else if (/jrpg|crpg|rpg|role-playing|baldur|persona|final fantasy|dragon quest|mass effect|dragon age|cyberpunk|yakuza|like a dragon/.test(text)) {
      mainHours = 48;
      reason = "RPG estimate";
    } else if (/rogue|roguelike|roguelite|hades|dead cells|slay the spire|vampire survivors|run-based|deckbuilder/.test(text)) {
      mainHours = 14;
      reason = "Run-based estimate";
    } else if (/horror|resident evil|silent hill|amnesia|outlast|inside|limbo|little nightmares/.test(text)) {
      mainHours = 9;
      reason = "Short horror/story estimate";
    } else if (/platformer|metroidvania|metroid|hollow knight|celeste|ori|shovel knight|cuphead/.test(text)) {
      mainHours = 16;
      reason = "Platform/adventure estimate";
    } else if (/shooter|fps|call of duty|halo|doom|battlefield|titanfall|gears/.test(text)) {
      mainHours = 10;
      reason = "Shooter campaign estimate";
    } else if (/visual novel|walking simulator|narrative|story|detective|mystery|choice/.test(text)) {
      mainHours = 8;
      reason = "Story-first estimate";
    } else if (/cozy|farm|farming|life sim|stardew|animal crossing|dave the diver|unpacking|chill/.test(text)) {
      mainHours = 35;
      reason = "Cozy long-tail estimate";
    } else if (/indie|arcade|puzzle/.test(text)) {
      mainHours = 7;
      reason = "Indie / puzzle estimate";
    }
  }

  const bucket = completionBucketForHours(mainHours, ongoing);
  const extraHours = Math.max(mainHours, Math.round(mainHours * (ongoing ? 1.6 : 1.45)));
  const completionistHours = Math.max(extraHours, Math.round(mainHours * (ongoing ? 2.2 : 2.1)));
  const compactLabel = bucket === "Ongoing" ? "Ongoing" : `${formatCompletionHours(mainHours)} main`;
  const label = bucket === "Ongoing" ? "Ongoing / no clean ending" : `${formatCompletionHours(mainHours)} main · ${timeBucketLabel(bucket)}`;

  return { mainHours, extraHours, completionistHours, bucket, label, compactLabel, reason };
}

export function completionSortValue(game: Partial<Game>) {
  const estimate = completionEstimateForGame(game);
  return estimate.bucket === "Ongoing" ? estimate.mainHours + 40 : estimate.mainHours;
}

export function totalCompletionHours(games: Array<Partial<Game> | null | undefined>) {
  return games.reduce((sum, game) => sum + (game ? completionEstimateForGame(game).mainHours : 0), 0);
}

export function formatCompletionTotal(hours: number) {
  if (!hours) return "0h";
  if (hours < 100) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 10) * 10}h`;
}
