'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function SharedWishlistPage() {
  const params = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`/api/share?token=${params.token}`);
        const data = await response.json();
        setData(data);
      } catch (error) {
        console.error('Errore:', error);
      }
      setLoading(false);
    }
    loadData();
  }, [params.token]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-white">Caricamento...</div>;
  if (!data || data.error) return <div className="flex min-h-screen items-center justify-center text-white">Link non valido</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🎮 Wishlist di {data.username}</h1>
        <p className="text-white/60 mb-8">I giochi che vorrebbe ricevere in regalo!</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.games.map(game => (
            <div key={game.id} className="bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/10">
              {game.image_url && <img src={game.image_url} alt={game.title} className="w-full h-40 object-cover" />}
              <div className="p-5">
                <span className="bg-indigo-500/30 text-indigo-200 text-xs font-bold px-2 py-1 rounded-md uppercase">{game.platform}</span>
                <h3 className="text-xl font-bold mt-3 mb-2">{game.title}</h3>
                {game.description && <p className="text-white/70 text-sm mb-4 line-clamp-3" dangerouslySetInnerHTML={{ __html: game.description }} />}
                {game.price > 0 && <p className="text-2xl font-bold text-green-400 mb-4">€{game.price.toFixed(2)}</p>}
                {game.store_link && (
                  <a href={game.store_link} target="_blank" rel="noopener noreferrer" className="block text-center bg-blue-500 hover:bg-blue-600 py-2 rounded-lg font-semibold transition">
                    Acquista su Steam
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}