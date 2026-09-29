import Link from 'next/link';

export default function Home() {
  const platforms = ['STEAM', 'EPIC GAMES', 'EA APP', 'UBISOFT', 'XBOX', 'ROCKSTAR'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 animate-fade-in" style={{ backgroundColor: '#050810' }}>
      <div className="max-w-3xl w-full text-center">
        <p className="text-cyan-400 text-sm font-semibold tracking-[0.3em] mb-6 uppercase">
          Wishlist · Player One
        </p>

        <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tight select-none">
          <span className="text-white">Da</span>
          <span className="text-cyan-400">Comprare</span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Tutti i giochi da prendere, divisi per negozio. Spunta quelli comprati e fatti consigliare dall'AI.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {platforms.map((p) => (
            <span
              key={p}
              className="px-4 py-2 border border-cyan-400/40 rounded-full text-cyan-400 text-sm font-semibold hover:bg-cyan-400/10 transition-all duration-300 cursor-default"
            >
              {p}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/store"
            className="btn-primary btn-press inline-block bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-lg px-8 py-4 rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-400/30"
          >
            🎮 Esplora lo Store
          </Link>
          <Link
            href="/dashboard"
            className="btn-press inline-block bg-white/5 hover:bg-white/10 border border-white/20 text-white font-bold text-lg px-8 py-4 rounded-lg transition-all hover:border-cyan-400/50"
          >
            Apri la mia lista →
          </Link>
        </div>
      </div>
    </div>
  );
}