import { supabase, isSupabaseConfigured } from "./supabase";
import { fetchWithTtl } from "./ttlCache";
import { GENRES_CACHE_KEY } from "./cacheKeys";

/** Match common ISR example: 5 minutes */
export const DEFAULT_DATA_TTL_MS = 5 * 60 * 1000;

const GENRES_PAGE_SIZE = 1000;

/**
 * Load every row from `genres` (PostgREST may cap a single response; batch with .range).
 * @param {string} select e.g. "*" or "id,name,slug,image"
 */
export async function fetchAllGenresRows(select = "*") {
  if (!isSupabaseConfigured || !supabase) return [];
  const all = [];
  for (let from = 0; ; from += GENRES_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("genres")
      .select(select)
      .order("name", { ascending: true })
      .range(from, from + GENRES_PAGE_SIZE - 1);
    if (error) {
      console.error("[cachedQueries] genres", error);
      return [];
    }
    const chunk = data || [];
    all.push(...chunk);
    if (chunk.length < GENRES_PAGE_SIZE) break;
  }
  return all;
}

/**
 * Shared genres list — Header, Browse, Home can reuse the same cached result.
 */
export async function fetchGenresCached(ttlMs = DEFAULT_DATA_TTL_MS) {
  if (!isSupabaseConfigured || !supabase) return [];
  return fetchWithTtl(GENRES_CACHE_KEY, ttlMs, async () => fetchAllGenresRows("*"));
}
