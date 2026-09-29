'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase';

const PLATFORMS = ['Steam', 'Epic', 'EA', 'Ubisoft', 'Xbox', 'Rockstar', 'Altro'];

const PRIORITIES = {
  high: { label: '🔥', color: 'text-red-400' },
  medium: { label: '⭐', color: 'text-yellow-400' },
  low: { label: '💤', color: 'text-blue-400' },
  none: { label: '', color: '' }
};

const COMMON_GENRES = ['GDR', 'Azione', 'Avventura', 'Indie', 'Strategia', 'Simulazione', 'Sport', 'Puzzle', 'Horror', 'Multiplayer', 'Open World', 'Roguelike'];

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lista');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('Steam');

  const [gamingTastes, setGamingTastes] = useState('');
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isGettingAI, setIsGettingAI] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [editingGenresId, setEditingGenresId] = useState(null);
  const [genreInput, setGenreInput] = useState('');

  const [isUpdatingImages, setIsUpdatingImages] = useState(false);
  const [isUpdatingGenres, setIsUpdatingGenres] = useState(false);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);
      await fetchGames(user.id);
      await fetchProfile(user.id);
    }
    loadData();
  }, []);

  async function fetchGames(userId) {
    setLoading(true);
    const { data } = await supabase.from('games').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (data) setGames(data);
    setLoading(false);
  }

  async function fetchProfile(userId) {
    const { data } = await supabase.from('profiles').select('gaming_tastes').eq('id', userId).single();
    if (data) setGamingTastes(data.gaming_tastes || '');
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          setSearchResults(data.items || []);
        } catch (error) { setSearchResults([]); }
        setIsSearching(false);
      } else { setSearchResults([]); }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleAddGame(gameData) {
    try {
      const { error } = await supabase.from('games').insert({
        user_id: user.id, 
        title: gameData.name, 
        platform: selectedPlatform,
        description: gameData.short_description || '',
        store_link: `https://store.steampowered.com/app/${gameData.id}`,
        image_url: gameData.header_image || gameData.tiny_image || null,
        genres: gameData.genres || null,
        price: gameData.price || 0,
        instant_gaming_link: gameData.instant_gaming_link || null,
        cheapest_price: gameData.cheapest_price || null,
        cheapest_store: gameData.cheapest_store || null,
        cheapest_link: gameData.cheapest_link || null,
        priority: 'medium', 
        purchased: false
      });

      if (!error) {
        setSearchQuery(''); 
        setSearchResults([]);
        await fetchGames(user.id);
      }
    } catch (error) { alert('Errore nell\'aggiunta del gioco'); }
  }

  async function handleManualAdd(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const { error } = await supabase.from('games').insert({
      user_id: user.id, title: searchQuery, platform: selectedPlatform,
      description: '', store_link: '', image_url: null, genres: null,
      price: 0, priority: 'medium', purchased: false
    });
    if (!error) { setSearchQuery(''); await fetchGames(user.id); }
  }

  async function togglePurchased(gameId, currentStatus) {
    const { error } = await supabase.from('games').update({ purchased: !currentStatus }).eq('id', gameId);
    if (!error) await fetchGames(user.id);
  }

  async function changePriority(gameId, newPriority) {
    const { error } = await supabase.from('games').update({ priority: newPriority }).eq('id', gameId);
    if (!error) await fetchGames(user.id);
  }

  async function deleteGame(gameId) {
    if (!confirm('Rimuovere questo gioco?')) return;
    const { error } = await supabase.from('games').delete().eq('id', gameId);
    if (!error) await fetchGames(user.id);
  }

  function startEditingNote(gameId, currentNote) { setEditingNoteId(gameId); setNoteText(currentNote || ''); }
  function cancelEditingNote() { setEditingNoteId(null); setNoteText(''); }
  async function saveNote(gameId) {
    const { error } = await supabase.from('games').update({ notes: noteText || null }).eq('id', gameId);
    if (!error) { setEditingNoteId(null); setNoteText(''); await fetchGames(user.id); }
  }

  function startEditingGenres(gameId, currentGenres) { setEditingGenresId(gameId); setGenreInput(currentGenres || ''); }
  function cancelEditingGenres() { setEditingGenresId(null); setGenreInput(''); }
  async function saveGenres(gameId) {
    const { error } = await supabase.from('games').update({ genres: genreInput || null }).eq('id', gameId);
    if (!error) { setEditingGenresId(null); setGenreInput(''); await fetchGames(user.id); }
  }

  function addGenreTag(gameId, currentGenres, tag) {
    const genres = currentGenres ? currentGenres.split(',').map(g => g.trim()) : [];
    if (!genres.includes(tag)) { genres.push(tag); saveGenresDirect(gameId, genres.join(', ')); }
  }

  function removeGenreTag(gameId, currentGenres, tagToRemove) {
    const genres = currentGenres ? currentGenres.split(',').map(g => g.trim()) : [];
    const newGenres = genres.filter(g => g !== tagToRemove).join(', ');
    saveGenresDirect(gameId, newGenres || null);
  }

  async function saveGenresDirect(gameId, genres) {
    const { error } = await supabase.from('games').update({ genres }).eq('id', gameId);
    if (!error) await fetchGames(user.id);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function getAIRecommendations() {
    setIsGettingAI(true);
    setAiRecommendations([]);
    try {
      const response = await fetch('/api/suggest', { method: 'POST' });
      const data = await response.json();
      if (data.recommendations) setAiRecommendations(data.recommendations);
      else alert('⚠️ ' + (data.error || 'Errore sconosciuto'));
    } catch (error) { alert('Errore di connessione.'); }
    setIsGettingAI(false);
  }

  async function addRecommendedGame(game) {
    const { error } = await supabase.from('games').insert({
      user_id: user.id, title: game.title, platform: game.platform || 'Steam',
      description: game.description, store_link: game.store_link,
      image_url: game.image_url || null, priority: 'medium', purchased: false
    });
    if (!error) { alert(`"${game.title}" aggiunto!`); await fetchGames(user.id); }
    else alert('Errore: ' + error.message);
  }

  async function updateAllImages() {
    if (!confirm('Aggiornare le immagini di tutti i giochi?')) return;
    setIsUpdatingImages(true);
    try {
      const response = await fetch('/api/update-images', { method: 'POST' });
      const data = await response.json();
      if (data.error) alert('❌ Errore: ' + data.error);
      else { alert(`✅ ${data.message}`); await fetchGames(user.id); }
    } catch (error) { alert('Errore di connessione.'); }
    setIsUpdatingImages(false);
  }

  async function updateAllGenres() {
    if (!confirm('Aggiornare i generi di tutti i giochi?')) return;
    setIsUpdatingGenres(true);
    try {
      const response = await fetch('/api/update-genres', { method: 'POST' });
      const data = await response.json();
      if (data.error) alert('❌ Errore: ' + data.error);
      else { alert(`✅ ${data.message}`); await fetchGames(user.id); }
    } catch (error) { alert('Errore di connessione.'); }
    setIsUpdatingGenres(false);
  }

  async function updateAllPrices() {
    if (!confirm('Aggiornare i prezzi di tutti i giochi?')) return;
    setIsUpdatingPrices(true);
    try {
      const response = await fetch('/api/update-prices', { method: 'POST' });
      const data = await response.json();
      if (data.error) alert(' Errore: ' + data.error);
      else { alert(`✅ ${data.message}`); await fetchGames(user.id); }
    } catch (error) { alert('Errore di connessione.'); }
    setIsUpdatingPrices(false);
  }

  async function shareWishlist() {
    setIsSharing(true);
    try {
      const response = await fetch('/api/share', { method: 'POST' });
      const data = await response.json();
      if (data.url) {
        const fullUrl = `${window.location.origin}${data.url}`;
        await navigator.clipboard.writeText(fullUrl);
        alert('✅ Link copiato negli appunti!');
      }
    } catch (error) { alert('Errore di connessione.'); }
    setIsSharing(false);
  }

  const gamesByPlatform = useMemo(() => {
    const grouped = {};
    PLATFORMS.forEach(p => { grouped[p] = []; });
    games.forEach(g => {
      const platform = g.platform || 'Altro';
      if (!grouped[platform]) grouped[platform] = [];
      grouped[platform].push(g);
    });
    return grouped;
  }, [games]);

  const platformStats = useMemo(() => {
    const stats = {};
    PLATFORMS.forEach(p => {
      const list = gamesByPlatform[p] || [];
      stats[p] = { total: list.length, purchased: list.filter(g => g.purchased).length };
    });
    return stats;
  }, [gamesByPlatform]);

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#050810' }}>
        <div className="text-cyan-400 text-xl font-semibold">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#050810' }}>
      <header className="border-b border-white/10 sticky top-0 z-40" style={{ backgroundColor: '#050810' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="group flex items-center gap-2 transition-transform hover:scale-105 duration-300">
            <h1 className="text-2xl font-black tracking-tight cursor-default select-none">
              <span className="text-white group-hover:text-cyan-400 transition-colors duration-300">Da</span>
              <span className="text-cyan-400">Comprare</span>
            </h1>
          </Link>
          <nav className="flex gap-6">
            <Link href="/store" className="nav-link text-sm font-bold tracking-wider text-gray-400 hover:text-white transition-colors">STORE</Link>
            <button onClick={() => setActiveTab('lista')} className={`nav-link text-sm font-bold tracking-wider transition-colors ${activeTab === 'lista' ? 'text-cyan-400 active' : 'text-gray-400 hover:text-white'}`}>LISTA</button>
            <button onClick={() => setActiveTab('ai')} className={`nav-link text-sm font-bold tracking-wider transition-colors ${activeTab === 'ai' ? 'text-cyan-400 active' : 'text-gray-400 hover:text-white'}`}>CONSIGLI AI</button>
            <button onClick={handleLogout} className="nav-link text-sm font-bold tracking-wider text-gray-400 hover:text-white transition-colors">ESCI</button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'lista' && (
          <>
            <div className="mb-8 animate-fade-in">
              <form onSubmit={handleManualAdd} className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={`Cerca gioco (verrà aggiunto a ${selectedPlatform})...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0f1528] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 transition-all"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-[#0a0e1a] border border-white/10 rounded-lg shadow-2xl max-h-[500px] overflow-y-auto">
                      {searchResults.map(game => (
                        <div key={game.id} className="search-result-item flex items-start p-4 border-b border-white/5 last:border-0 cursor-pointer gap-4">
                          <img 
                            src={game.header_image || game.tiny_image || 'https://via.placeholder.com/100'} 
                            alt={game.name} 
                            className="w-32 h-20 object-cover rounded-lg flex-shrink-0" 
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-base mb-1">{game.name}</h4>
                            {game.short_description && (
                              <p className="text-xs text-gray-400 line-clamp-2 mb-2" dangerouslySetInnerHTML={{ __html: game.short_description }} />
                            )}
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              {game.price > 0 ? (
                                <span className="text-cyan-400 font-bold text-sm">Steam: €{game.price.toFixed(2)}</span>
                              ) : (
                                <span className="text-green-400 font-bold text-xs">Gratis su Steam</span>
                              )}
                              {game.cheapest_price && game.cheapest_price < game.price && (
                                <a 
                                  href={game.cheapest_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-green-400 hover:text-green-300 text-xs font-bold flex items-center gap-1 transition-colors bg-green-500/10 px-2 py-1 rounded"
                                >
                                  💰 Prezzo più basso: €{game.cheapest_price.toFixed(2)} ↗
                                </a>
                              )}
                              {game.instant_gaming_link && (
                                <a 
                                  href={game.instant_gaming_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-orange-400 hover:text-orange-300 text-xs font-bold flex items-center gap-1 transition-colors"
                                >
                                  🧡 Instant Gaming ↗
                                </a>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddGame(game)}
                            className="btn-primary btn-press px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-sm font-bold rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
                          >
                            Aggiungi a {selectedPlatform}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="bg-[#0f1528] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-400/50 transition-all cursor-pointer hover:border-cyan-400/30"
                >
                  {PLATFORMS.map(p => <option key={p} value={p} className="bg-[#0a0e1a]">{p}</option>)}
                </select>
                <button
                  type="submit"
                  className="btn-primary btn-press bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-6 py-3 rounded-lg transition-all whitespace-nowrap hover:shadow-lg hover:shadow-cyan-400/30"
                >
                  Aggiungi
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-2">💡 La ricerca usa Steam. I prezzi più bassi vengono cercati automaticamente su CheapShark.</p>
            </div>

            {PLATFORMS.map(platform => {
              const platformGames = gamesByPlatform[platform] || [];
              if (platformGames.length === 0) return null;
              const stats = platformStats[platform];

              return (
                <div key={platform} className="mb-8 animate-fade-in">
                  <div className="bg-[#0f1a2e] border border-white/10 rounded-2xl p-6">
                    <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
                      {platform.toUpperCase()}
                      <span className="text-gray-400 text-base font-semibold ml-3">
                        {stats.purchased}/{stats.total} COMPRATI
                      </span>
                    </h2>

                    <div className="mt-4 space-y-3">
                      {platformGames.map(game => {
                        const isEditingNote = editingNoteId === game.id;
                        const isEditingGenres = editingGenresId === game.id;
                        const gameGenres = game.genres ? game.genres.split(',').map(g => g.trim()).filter(Boolean) : [];
                        const priorityInfo = PRIORITIES[game.priority || 'none'];

                        return (
                          <div key={game.id} className={`game-card bg-[#1a2d45] border border-white/10 rounded-xl p-4 ${game.purchased ? 'opacity-50' : ''}`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`font-bold text-lg text-white ${game.purchased ? 'line-through' : ''}`}>{game.title}</h3>
                                  {priorityInfo.label && <span className={`text-sm ${priorityInfo.color}`}>{priorityInfo.label}</span>}
                                </div>
                                {game.description && <p className="text-gray-400 text-sm mb-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: game.description }} />}
                                
                                {/* PREZZI E LINK STORE */}
                                <div className="flex flex-wrap items-center gap-4 mb-2">
                                  {game.price > 0 && <p className="text-cyan-400 font-bold text-sm">Steam: €{game.price.toFixed(2)}</p>}
                                  {game.cheapest_price && game.cheapest_price < game.price && (
                                    <a href={game.cheapest_link} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 text-sm font-bold flex items-center gap-1 transition-colors bg-green-500/10 px-2 py-1 rounded">
                                       Più basso: €{game.cheapest_price.toFixed(2)} ↗
                                    </a>
                                  )}
                                  {game.instant_gaming_link && (
                                    <a href={game.instant_gaming_link} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 text-sm font-bold flex items-center gap-1 transition-colors">
                                      🧡 Instant Gaming ↗
                                    </a>
                                  )}
                                </div>

                                {gameGenres.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {gameGenres.map(genre => <span key={genre} className="tag-hover text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded cursor-default">{genre}</span>)}
                                  </div>
                                )}
                                {isEditingNote ? (
                                  <div className="mt-2">
                                    <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Aggiungi una nota..." className="w-full bg-[#0f1528] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 resize-none" rows={2} autoFocus />
                                    <div className="flex gap-2 mt-2">
                                      <button onClick={() => saveNote(game.id)} className="btn-press text-xs text-cyan-400 hover:text-cyan-300 font-bold">Salva</button>
                                      <button onClick={cancelEditingNote} className="btn-press text-xs text-gray-400 hover:text-gray-300">Annulla</button>
                                    </div>
                                  </div>
                                ) : game.notes ? <p className="text-gray-400 text-xs italic mt-1">📝 {game.notes}</p> : null}
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => togglePurchased(game.id, game.purchased)} className={`btn-press px-4 py-2 rounded-lg text-sm font-bold transition-all ${game.purchased ? 'bg-cyan-400 text-black hover:bg-cyan-300' : 'bg-cyan-400/20 text-cyan-400 hover:bg-cyan-400/30'}`}>
                                  {game.purchased ? 'Comprato ✓' : 'Da comprare'}
                                </button>
                                {game.store_link && <a href={game.store_link} target="_blank" rel="noopener noreferrer" className="btn-press px-4 py-2 rounded-lg text-sm font-bold border border-white/20 text-white hover:bg-white/5 hover:border-cyan-400/50 transition-all">Steam ↗</a>}
                                <button onClick={() => deleteGame(game.id)} className="btn-press px-3 py-2 text-sm text-gray-500 hover:text-red-400 transition-colors" title="Rimuovi">Rimuovi</button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                              <button onClick={() => startEditingNote(game.id, game.notes)} className="btn-press text-xs text-gray-400 hover:text-cyan-400 transition-colors">📝 {game.notes ? 'Modifica nota' : 'Aggiungi nota'}</button>
                              <button onClick={() => startEditingGenres(game.id, game.genres)} className="btn-press text-xs text-gray-400 hover:text-cyan-400 transition-colors">🏷️ Modifica generi</button>
                              <div className="flex gap-1 ml-auto">
                                {Object.entries(PRIORITIES).map(([key, info]) => (
                                  <button key={key} onClick={() => changePriority(game.id, key)} className={`btn-press text-xs px-2 py-1 rounded transition-all ${game.priority === key ? 'bg-white/10 text-white hover:bg-white/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`} title={info.label}>{info.label || '—'}</button>
                                ))}
                              </div>
                            </div>
                            {isEditingGenres && (
                              <div className="mt-3 pt-3 border-t border-white/5 animate-slide-in">
                                <input type="text" value={genreInput} onChange={(e) => setGenreInput(e.target.value)} placeholder="Es: GDR, Azione, Indie" className="w-full bg-[#0f1528] border border-white/10 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 mb-2" autoFocus />
                                <div className="flex gap-2 mb-2">
                                  <button onClick={() => saveGenres(game.id)} className="btn-press text-xs text-cyan-400 hover:text-cyan-300 font-bold">Salva</button>
                                  <button onClick={cancelEditingGenres} className="btn-press text-xs text-gray-400 hover:text-gray-300">Annulla</button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {COMMON_GENRES.map(genre => <button key={genre} onClick={() => addGenreTag(game.id, genreInput, genre)} className="btn-press tag-hover text-xs text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20 px-2 py-1 rounded transition-all">+ {genre}</button>)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {games.length === 0 && <div className="text-center py-20 animate-fade-in"><p className="text-gray-500 text-lg">Nessun gioco nella lista. Aggiungine uno qui sopra!</p></div>}

            {games.length > 0 && (
              <div className="mt-12 pt-8 border-t border-white/10">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider font-semibold">Strumenti</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={updateAllImages} disabled={isUpdatingImages} className="btn-press px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 rounded-lg text-sm text-gray-300 hover:text-white transition-all disabled:opacity-50">{isUpdatingImages ? '🔄...' : '🖼️ Aggiorna immagini'}</button>
                  <button onClick={updateAllGenres} disabled={isUpdatingGenres} className="btn-press px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 rounded-lg text-sm text-gray-300 hover:text-white transition-all disabled:opacity-50">{isUpdatingGenres ? '...' : '🏷️ Aggiorna generi'}</button>
                  <button onClick={updateAllPrices} disabled={isUpdatingPrices} className="btn-press px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 rounded-lg text-sm text-gray-300 hover:text-white transition-all disabled:opacity-50">{isUpdatingPrices ? '🔄...' : '💰 Aggiorna prezzi'}</button>
                  <button onClick={shareWishlist} disabled={isSharing} className="btn-press px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 rounded-lg text-sm text-gray-300 hover:text-white transition-all disabled:opacity-50">{isSharing ? '🔄...' : '📤 Condividi lista'}</button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'ai' && (
          <div className="max-w-2xl mx-auto animate-fade-in">
            <h2 className="text-3xl font-black mb-2"><span className="text-white">Consigli </span><span className="text-cyan-400">AI</span></h2>
            <p className="text-gray-400 mb-8">Descrivi i tuoi gusti e l'AI ti consiglierà giochi perfetti per te.</p>
            <div className="bg-[#0f1a2e] border border-white/10 rounded-2xl p-6">
              <label className="text-sm font-semibold text-gray-300 mb-2 block">I tuoi gusti videoludici</label>
              <textarea value={gamingTastes} onChange={(e) => setGamingTastes(e.target.value)} placeholder="Es: Amo i GDR con una storia profonda tipo The Witcher 3..." className="w-full bg-[#050810] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 transition-all resize-none mb-4" rows={5} />
              <div className="flex gap-3">
                <button onClick={async () => { const { error } = await supabase.from('profiles').update({ gaming_tastes: gamingTastes }).eq('id', user.id); if (!error) alert('Gusti salvati!'); }} className="btn-press px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 rounded-lg text-sm font-bold text-white transition-all">Salva gusti</button>
                <button onClick={getAIRecommendations} disabled={isGettingAI || !gamingTastes.trim()} className="btn-primary btn-press flex-1 bg-cyan-400 hover:bg-cyan-300 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-lg transition-all disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-400/30">{isGettingAI ? 'L\'AI sta pensando...' : '✨ Genera Consigli'}</button>
              </div>
            </div>
            {aiRecommendations.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-bold text-white mb-4">Giochi consigliati per te</h3>
                <div className="space-y-3">
                  {aiRecommendations.map((game, idx) => (
                    <div key={idx} className="game-card bg-[#0f1a2e] border border-white/10 rounded-xl p-4 flex items-center gap-4">
                      {game.image_url && <img src={game.image_url} alt={game.title} className="w-24 h-16 object-cover rounded-lg flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white">{game.title}</h4>
                        <p className="text-xs text-cyan-400 mb-1">{game.platform}</p>
                        <p className="text-sm text-gray-400">{game.description}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => addRecommendedGame(game)} className="btn-primary btn-press px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-black text-sm font-bold rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-400/30">+ Aggiungi</button>
                        {game.store_link && <a href={game.store_link} target="_blank" rel="noopener noreferrer" className="btn-press px-4 py-2 border border-white/20 text-white text-sm font-bold rounded-lg hover:bg-white/5 hover:border-cyan-400/50 transition-all"></a>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}