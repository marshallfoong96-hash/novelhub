import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import NovelCard from "../components/NovelCard";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function getGenreMeta(genre) {
  return {
    ...genre,
    image: genre.image || genre.cover_url || genre.banner_url || "/default-cover.jpg"
  };
}

function getNovelGenreSlug(novel, genres) {
  const directSlug = normalize(novel.genre_slug);
  if (directSlug) return directSlug;

  const genreId = novel.genre_id;
  if (genreId !== undefined && genreId !== null) {
    const byId = genres.find((genre) => String(genre.id) === String(genreId));
    if (byId?.slug) return normalize(byId.slug);
  }

  const raw = normalize(novel.genre || novel.category || novel.tags);
  if (!raw) return "";
  const matched = genres.find((genre) => {
    const slug = normalize(genre.slug);
    const name = normalize(genre.name);
    return (slug && raw.includes(slug)) || (name && raw.includes(name));
  });
  return normalize(matched?.slug);
}

function BrowseNovels({ mode = "all" }) {
  const { slug } = useParams();
  const [novels, setNovels] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNovels = async () => {
      try {
        setLoading(true);
        setError("");
        if (!isSupabaseConfigured || !supabase) {
          setError("Supabase is not configured.");
          setNovels([]);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("novels")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(120);
        const { data: genresData, error: genresError } = await supabase
          .from("genres")
          .select("*")
          .order("name", { ascending: true });

        if (fetchError) {
          setError(fetchError.message || "Failed to load novels.");
          setNovels([]);
          return;
        }
        if (genresError) {
          setError(genresError.message || "Failed to load genres.");
          setGenres([]);
        } else {
          setGenres((genresData || []).map(getGenreMeta));
        }

        setNovels(data || []);
      } finally {
        setLoading(false);
      }
    };

    fetchNovels();
  }, []);

  const filteredNovels = useMemo(() => {
    if (mode === "hot") {
      return [...novels].sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
    }
    if (mode === "recent") {
      return [...novels].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    if (mode === "completed") {
      return novels.filter((novel) => normalize(novel.status) === "completed");
    }
    if (mode === "category" && slug) {
      const normalizedSlug = normalize(slug);
      return novels.filter((novel) => getNovelGenreSlug(novel, genres) === normalizedSlug);
    }
    return novels;
  }, [mode, novels, slug, genres]);

  const activeGenre = useMemo(() => {
    if (!slug) return null;
    return genres.find((genre) => normalize(genre.slug) === normalize(slug)) || null;
  }, [genres, slug]);

  const titleMap = {
    all: "Tat ca truyen",
    hot: "Truyen Hot",
    recent: "Moi cap nhat",
    completed: "Truyen Full",
    category: `The loai: ${activeGenre?.name || slug || ""}`
  };

  return (
    <div className="space-y-6">
      {mode === "category" && slug && (
        <div className="relative overflow-hidden rounded-lg border border-border bg-card">
          <img
            src={activeGenre?.image || "/default-cover.jpg"}
            alt={activeGenre?.name || slug}
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <h1 className="text-2xl font-bold text-white">{activeGenre?.name || slug}</h1>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{titleMap[mode]}</h2>
        <Link to="/the-loai" className="text-sm text-accent hover:underline">
          Xem the loai
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Dang tai...</div>
      ) : error ? (
        <div className="text-sm text-destructive">{error}</div>
      ) : filteredNovels.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Chua co truyen phu hop.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredNovels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} showStatus variant="compact" />
          ))}
        </div>
      )}
    </div>
  );
}

export default BrowseNovels;
