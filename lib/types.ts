export type Game = {
  id: string;
  title: string;
  slug?: string | null;
  developer?: string | null;
  publisher?: string | null;
  release_year?: number | null;
  genre?: string | null;
  platforms?: string[] | null;
  cover_url?: string | null;
  summary?: string | null;
  created_by?: string | null;
  is_community?: boolean | null;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio?: string | null;
  favorite_game?: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

export type ReviewLike = {
  user_id: string;
  log_id?: string;
  created_at?: string;
};

export type ReviewComment = {
  id: string;
  user_id: string;
  log_id: string;
  body: string;
  created_at: string;
  profiles?: Pick<Profile, "username" | "display_name" | "avatar_url"> | null;
};

export type Follow = {
  follower_id: string;
  following_id: string;
  created_at?: string;
};

export type GameLog = {
  id: string;
  user_id: string;
  game_id: string;
  status: string;
  rating: number | null;
  review: string | null;
  vibe: string | null;
  played_on: string | null;
  is_spoiler?: boolean | null;
  created_at: string;
  games?: Game | null;
  profiles?: Pick<Profile, "username" | "display_name" | "avatar_url"> | null;
  review_likes?: ReviewLike[] | null;
  comments?: ReviewComment[] | null;
};

export type GameList = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_ranked?: boolean | null;
  created_at: string;
  profiles?: Pick<Profile, "username" | "display_name"> | null;
  list_items?: Array<{ id: string; games: Game | null }> | null;
};
