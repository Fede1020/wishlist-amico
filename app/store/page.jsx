'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase';

export default function StorePage() {
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);
  const [addingGame, setAddingGame] = useState(null);
  const [user, setUser] = useState(null);

  // Ricerca
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        const response = await fetch('/api/store');
        const data = await response.json();
        setStoreData(data);
      } catch (error) {
        console.error('Errore:', error);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Ricerca in tempo reale
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          setSearchResults(data.items || []);
        } catch (error) {
          setSearchResults([]);
        }
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function addToWishlist(game, platform = 'Steam') {
    if (!user) {
      alert('Devi accedere per aggiungere giochi alla wishlist!');
      router.push('/login');
      return;
    }

    setAddingGame(game.id);
    try {
      const { error } = await supabase.from('games').insert({
        user_id: user.id,
        title: game.name,
        platform: platform,
        description: game.short_description || '',
        store_link: `https://store.steampowered.com/app/${game.id}`,
        image_url: game.large_capsule_image || game.header_image || null,
        genres: game.genres || null,
        price: game.final_price || game.price || 0,
        priority: 'medium',
        purchased: false
      });

      if (!error) {
        alert(`✅ "${game.name}" aggiunto alla wishlist!`);
        setSelectedGame(null);
      } else {
        alert('Errore: ' + error.message);
      }
    } catch (error) {
      alert('Errore di connessione');
    }
    setAddingGame(null);
  }

  const formatPrice = (price) => {
    if (price === 0) return 'Gratis';
    return `€${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#050810' }}>
        <div className="text-cyan-400 text-xl font-semibold animate-pulse">Caricamento Store...</div>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#050810' }}>
        <p className="text-gray-400">Errore nel caricamento dello store</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#050810' }}>
      {/* HEADER */}
      <header className="border-b border-white/10 sticky top-0 z-40" style={{ backgroundColor: '#050810' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="group flex items-center gap-2 transition-transform hover:scale-105 duration-300">
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-white group-hover:text-cyan-400 transition-colors duration-300">Da</span>
              <span className="text-cyan-400">Comprare</span>
            </h1>
          </Link>
          <nav className="flex gap-6">
            <Link href="/store" className="nav-link text-sm font-bold tracking-wider text-cyan-400 active">STORE</Link>
            <Link href="/dashboard" className="nav-link text-sm font-bold tracking-wider text-gray-400 hover:text-white transition-colors">LA MIA LISTA</Link>
            {user ? (
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/'); }} className="nav-link text-sm font-bold tracking-wider text-gray-400 hover:text-white transition-colors">ESCI</button>
            ) : (
              <Link href="/login" className="nav-link text-sm font-bold tracking-wider text-gray-400 hover:text-white transition-colors">ACCEDI</Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* BARRA DI RICERCA CENTRALE */}
        <div className="mb-12 animate-fade-in">
          <div className="relative max-w-3xl mx-auto">
            <input
              type="text"
              placeholder=" Cerca giochi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f1528] border-2 border-white/10 rounded-xl px-6 py-4 text-white text-lg placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 transition-all"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin">🔄</div>
            )}
          </div>

          {/* RISULTATI RICERCA */}
          {searchResults.length > 0 && (
            <div className="max-w-4xl mx-auto mt-6">
              <h2 className="text-2xl font-black text-white mb-4">Risultati per "{searchQuery}"</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map(game => (
                  <div
                    key={game.id}
                    onClick={() => setSelectedGame(game)}
                    className="game-card bg-[#0f1a2e] border border-white/10 rounded-xl p-4 flex items-center gap-4 cursor-pointer"
                  >
                    <img
                      src={game.header_image || game.tiny_image || 'https://via.placeholder.com/100'}
                      alt={game.name}
                      className="w-32 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-lg mb-1">{game.name}</h3>
                      {game.short_description && (
                        <p className="text-xs text-gray-400 line-clamp-2 mb-2" dangerouslySetInnerHTML={{ __html: game.short_description }} />
                      )}
                      <div className="flex items-center gap-3">
                        {game.price > 0 ? (
                          <span className="text-cyan-400 font-bold text-sm">€{game.price.toFixed(2)}</span>
                        ) : (
                          <span className="text-green-400 font-bold text-xs">Gratis</span>
                        )}
                        {game.cheapest_price && game.cheapest_price < game.price && (
                          <a
                            href={game.cheapest_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-green-400 hover:text-green-300 text-xs font-bold transition-colors"
                          >
                            💰 Più basso: €{game.cheapest_price.toFixed(2)}
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToWishlist(game);
                      }}
                      disabled={addingGame === game.id}
                      className="btn-primary btn-press px-4 py-2 bg-cyan-400 hover:bg-cyan-300 disabled:bg-gray-700 text-black text-sm font-bold rounded-lg transition-all flex-shrink-0"
                    >
                      {addingGame === game.id ? '' : '+ Aggiungi'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SEZIONI CONSIGLIATI (visibili solo se non stai cercando) */}
        {searchQuery.length <= 2 && (
          <>
            {/* HERO - Gioco in evidenza */}
            {storeData.hero && (
              <section className="mb-12 animate-fade-in">
                <div
                  className="relative rounded-2xl overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedGame(storeData.hero)}
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(5,8,16,0.9) 0%, rgba(5,8,16,0.3) 50%, transparent 100%), url(${storeData.hero.large_capsule_image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    height: '400px'
                  }}
                >
                  <div className="absolute bottom-0 left-0 p-8 max-w-xl">
                    <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-2">In Evidenza</p>
                    <h2 className="text-4xl font-black text-white mb-3 group-hover:text-cyan-400 transition-colors">{storeData.hero.name}</h2>
                    <div className="flex items-center gap-3">
                      {storeData.hero.discounted ? (
                        <>
                          <span className="bg-green-500 text-black text-xs font-bold px-2 py-1 rounded">-{storeData.hero.discount_percent}%</span>
                          <span className="text-gray-400 line-through text-sm">€{storeData.hero.original_price.toFixed(2)}</span>
                          <span className="text-cyan-400 font-bold text-lg">€{storeData.hero.final_price.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="text-cyan-400 font-bold text-lg">{formatPrice(storeData.hero.final_price)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <StoreSection title="In Evidenza" games={storeData.featured} onSelect={setSelectedGame} />
            <StoreSection title="🔥 Top Sellers" games={storeData.topSellers} onSelect={setSelectedGame} />
            <StoreSection title="✨ Novità" games={storeData.newReleases} onSelect={setSelectedGame} />
            <StoreSection title="💰 Offerte Speciali" games={storeData.specials} onSelect={setSelectedGame} highlightDiscount />
            <StoreSection title="📅 Prossimamente" games={storeData.comingSoon} onSelect={setSelectedGame} />
          </>
        )}
      </main>

      {/* MODAL DETTAGLIO GIOCO */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedGame(null)}>
          <div className="bg-[#0f1a2e] border border-white/10 rounded-2xl max-w-2xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedGame.large_capsule_image || selectedGame.header_image}
              alt={selectedGame.name}
              className="w-full h-64 object-cover"
            />
            <div className="p-6">
              <h2 className="text-3xl font-black text-white mb-3">{selectedGame.name}</h2>

              <div className="flex items-center gap-3 mb-6">
                {selectedGame.discounted ? (
                  <>
                    <span className="bg-green-500 text-black text-sm font-bold px-3 py-1 rounded">-{selectedGame.discount_percent}%</span>
                    <span className="text-gray-400 line-through">€{selectedGame.original_price.toFixed(2)}</span>
                    <span className="text-cyan-400 font-bold text-2xl">€{selectedGame.final_price.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-cyan-400 font-bold text-2xl">{formatPrice(selectedGame.final_price || selectedGame.price)}</span>
                )}
              </div>

              <div className="flex gap-3 mb-6 text-xs text-gray-400">
                {selectedGame.windows && <span className="bg-white/5 px-2 py-1 rounded">🪟 Windows</span>}
                {selectedGame.mac && <span className="bg-white/5 px-2 py-1 rounded">🍎 Mac</span>}
                {selectedGame.linux && <span className="bg-white/5 px-2 py-1 rounded">🐧 Linux</span>}
                {selectedGame.controller_support && <span className="bg-white/5 px-2 py-1 rounded">🎮 Controller</span>}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => addToWishlist(selectedGame)}
                  disabled={addingGame === selectedGame.id}
                  className="btn-primary btn-press flex-1 bg-cyan-400 hover:bg-cyan-300 disabled:bg-gray-700 text-black font-bold py-3 rounded-lg transition-all"
                >
                  {addingGame === selectedGame.id ? ' Aggiunta...' : '➕ Aggiungi alla Wishlist'}
                </button>
                <a
                  href={`https://store.steampowered.com/app/${selectedGame.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press px-6 py-3 border border-white/20 text-white font-bold rounded-lg hover:bg-white/5 transition-all"
                >
                  Steam ↗
                </a>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="btn-press px-4 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente sezione scrollabile
function StoreSection({ title, games, onSelect, highlightDiscount = false }) {
  if (!games || games.length === 0) return null;

  return (
    <section className="mb-12 animate-fade-in">
      <h2 className="text-2xl font-black text-white mb-4 tracking-tight">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {games.map((game) => (
          <div
            key={game.id}
            onClick={() => onSelect(game)}
            className="game-card flex-shrink-0 w-64 bg-[#0f1a2e] border border-white/10 rounded-xl overflow-hidden cursor-pointer group"
          >
            <div className="relative overflow-hidden">
              <img
                src={game.header_image}
                alt={game.name}
                className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {game.discounted && highlightDiscount && (
                <div className="absolute top-2 right-2 bg-green-500 text-black text-xs font-bold px-2 py-1 rounded">
                  -{game.discount_percent}%
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-bold text-white text-sm mb-2 line-clamp-1 group-hover:text-cyan-400 transition-colors">{game.name}</h3>
              <div className="flex items-center gap-2">
                {game.discounted ? (
                  <>
                    <span className="text-gray-500 line-through text-xs">€{game.original_price.toFixed(2)}</span>
                    <span className="text-cyan-400 font-bold text-sm">€{game.final_price.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-cyan-400 font-bold text-sm">
                    {game.final_price === 0 ? 'Gratis' : `€${game.final_price.toFixed(2)}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}