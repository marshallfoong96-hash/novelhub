import { supabase, isSupabaseConfigured } from "./supabase";
import { fetchWithTtl } from "./ttlCache";

/** Match common ISR example: 5 minutes */
export const DEFAULT_DATA_TTL_MS = 5 * 60 * 1000;

const KEY_GENRES = "mitruyen:genres:all:v1";

/**
 * Shared genres list — Header, Browse, Home can reuse the same cached result.
 */
export async function fetchGenresCached(ttlMs = DEFAULT_DATA_TTL_MS) {
  if (!isSupabaseConfigured || !supabase) return [];
  return fetchWithTtl(KEY_GENRES, ttlMs, async () => {
    const { data, error } = await supabase
      .from("genres")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error("[cachedQueries] genres", error);
      return [];
    }
    return data || [];
  });
}
