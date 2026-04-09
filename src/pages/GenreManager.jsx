import { useEffect, useMemo, useState } from "react";
import { FolderTree, Save, Search, CheckSquare, Square, Shuffle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const coverPool = [
  "https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516589091380-5d8e87df6999?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1514477917009-389c76a86b68?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1520034475321-cbe63696469a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1528747008803-4f5fd84aa3f7?auto=format&fit=crop&w=900&q=80"
];

function getRandomCover() {
  return coverPool[Math.floor(Math.random() * coverPool.length)];
}

function GenreManager() {
  const [novels, setNovels] = useState([]);
  const [genres, setGenres] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [batchGenreId, setBatchGenreId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [onlyUncategorized, setOnlyUncategorized] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [savingGenreId, setSavingGenreId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }

      const [novelsRes, genresRes] = await Promise.all([
        supabase.from("novels").select("id,title,author,genre_id,created_at").order("created_at", { ascending: false }),
        supabase.from("genres").select("id,name,slug").order("name", { ascending: true })
      ]);

      if (novelsRes.error) {
        setError(novelsRes.error.message || "Failed to load novels.");
        setLoading(false);
        return;
      }
      if (genresRes.error) {
        setError(genresRes.error.message || "Failed to load genres.");
        setLoading(false);
        return;
      }

      setNovels(novelsRes.data || []);
      setGenres(genresRes.data || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredNovels = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    let rows = novels;
    if (onlyUncategorized) {
      rows = rows.filter((novel) => novel.genre_id === null || novel.genre_id === undefined);
    }
    if (!keyword) return rows;
    return rows.filter((novel) => {
      return (
        String(novel.title || "").toLowerCase().includes(keyword) ||
        String(novel.author || "").toLowerCase().includes(keyword)
      );
    });
  }, [novels, search, onlyUncategorized]);

  const selectedCount = selectedIds.length;

  const handleChangeGenre = async (novelId, genreId) => {
    setSavingId(novelId);
    setNotice("");
    const payload = { genre_id: genreId ? Number(genreId) : null };
    const { error: updateError } = await supabase
      .from("novels")
      .update(payload)
      .eq("id", novelId);

    if (updateError) {
      setError(updateError.message || "Failed to update genre.");
      setSavingId(null);
      return;
    }

    setNovels((prev) =>
      prev.map((novel) => (novel.id === novelId ? { ...novel, genre_id: payload.genre_id } : novel))
    );
    setSavingId(null);
    setNotice("Da cap nhat the loai thanh cong.");
    setTimeout(() => setNotice(""), 1500);
  };

  const handleToggleSelect = (novelId) => {
    setSelectedIds((prev) =>
      prev.includes(novelId) ? prev.filter((id) => id !== novelId) : [...prev, novelId]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredNovels.map((novel) => novel.id);
    setSelectedIds(ids);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBatchAssign = async () => {
    if (!batchGenreId || selectedIds.length === 0) return;
    setBatchSaving(true);
    setError("");
    setNotice("");

    const { error: updateError } = await supabase
      .from("novels")
      .update({ genre_id: Number(batchGenreId) })
      .in("id", selectedIds);

    if (updateError) {
      setError(updateError.message || "Batch update failed.");
      setBatchSaving(false);
      return;
    }

    setNovels((prev) =>
      prev.map((novel) =>
        selectedIds.includes(novel.id) ? { ...novel, genre_id: Number(batchGenreId) } : novel
      )
    );
    setBatchSaving(false);
    setSelectedIds([]);
    setBatchGenreId("");
    setNotice("Da cap nhat the loai hang loat thanh cong.");
    setTimeout(() => setNotice(""), 1600);
  };

  const handleRandomizeGenreCover = async (genreId) => {
    const cover = getRandomCover();
    setSavingGenreId(genreId);
    const { error: updateError } = await supabase
      .from("genres")
      .update({ image: cover })
      .eq("id", genreId);
    if (updateError) {
      setError(updateError.message || "Failed to update genre cover.");
      setSavingGenreId(null);
      return;
    }
    setGenres((prev) => prev.map((g) => (g.id === genreId ? { ...g, image: cover } : g)));
    setSavingGenreId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <FolderTree className="w-5 h-5 text-accent" />
        <h1 className="text-xl font-bold text-foreground">Quan ly the loai co dinh</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Chon the loai cho tung truyen. He thong se luon loc theo <code>genre_id</code>.
      </p>

      <div className="section-shell p-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tim theo ten truyen / tac gia..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={onlyUncategorized}
              onChange={(e) => setOnlyUncategorized(e.target.checked)}
            />
            Chi hien thi chua phan loai
          </label>
        </div>
      </div>

      <div className="section-shell p-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="text-sm text-muted-foreground">
          Da chon: <span className="font-semibold text-foreground">{selectedCount}</span> truyen
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="px-3 py-1.5 text-xs rounded-lg bg-secondary border border-border hover:bg-secondary/80"
          >
            Chon tat ca dang loc
          </button>
          <button
            type="button"
            onClick={handleClearSelection}
            className="px-3 py-1.5 text-xs rounded-lg bg-secondary border border-border hover:bg-secondary/80"
          >
            Bo chon
          </button>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <select
            value={batchGenreId}
            onChange={(e) => setBatchGenreId(e.target.value)}
            className="w-full lg:w-64 text-sm rounded-lg bg-secondary border border-border px-3 py-2"
          >
            <option value="">Chon the loai de cap nhat hang loat</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!batchGenreId || selectedCount === 0 || batchSaving}
            onClick={handleBatchAssign}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-accent text-accent-foreground disabled:opacity-50"
          >
            {batchSaving ? "Dang luu..." : "Cap nhat hang loat"}
          </button>
        </div>
      </div>

      <div className="section-shell p-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Preview & random cover cho the loai</h2>
          <span className="text-xs text-muted-foreground">Nhan nut Shuffle de doi anh nen</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {genres.map((genre) => (
            <div key={`genre-preview-${genre.id}`} className="border border-border rounded-lg overflow-hidden bg-card">
              <div className="h-20 bg-secondary">
                <img
                  src={genre.image || "/default-cover.jpg"}
                  alt={genre.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2">
                <p className="text-[11px] font-medium text-foreground line-clamp-1 mb-1">{genre.name}</p>
                <button
                  type="button"
                  onClick={() => handleRandomizeGenreCover(genre.id)}
                  disabled={savingGenreId === genre.id}
                  className="w-full inline-flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border disabled:opacity-50"
                >
                  <Shuffle className="w-3 h-3" />
                  {savingGenreId === genre.id ? "Saving..." : "Random"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}
      {notice && <div className="text-sm text-[hsl(var(--success))]">{notice}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Dang tai du lieu...</div>
      ) : (
        <div className="section-shell overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">
            {filteredNovels.map((novel) => (
              <div key={novel.id} className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSelect(novel.id)}
                    className="flex items-center gap-2 text-left"
                  >
                    {selectedIds.includes(novel.id) ? (
                      <CheckSquare className="w-4 h-4 text-accent" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                    <h3 className="text-sm font-semibold text-foreground line-clamp-1">{novel.title}</h3>
                  </button>
                  <p className="text-xs text-muted-foreground">{novel.author || "Dang cap nhat"}</p>
                </div>

                <div className="w-full md:w-72 flex items-center gap-2">
                  <select
                    value={novel.genre_id ?? ""}
                    onChange={(e) => handleChangeGenre(novel.id, e.target.value)}
                    disabled={savingId === novel.id}
                    className="w-full text-sm rounded-lg bg-secondary border border-border px-3 py-2"
                  >
                    <option value="">Chua chon the loai</option>
                    {genres.map((genre) => (
                      <option key={genre.id} value={genre.id}>
                        {genre.name}
                      </option>
                    ))}
                  </select>
                  <Save className={`w-4 h-4 ${savingId === novel.id ? "text-accent animate-pulse" : "text-muted-foreground"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GenreManager;
