import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // API Steam Featured - restituisce giochi in evidenza, top sellers, novità, offerte
    const [featuredRes, categoriesRes] = await Promise.all([
      fetch('https://store.steampowered.com/api/featured/?cc=IT&l=italian'),
      fetch('https://store.steampowered.com/api/featuredcategories/?cc=IT&l=italian')
    ]);

    const featured = await featuredRes.json();
    const categories = await categoriesRes.json();

    // Helper per pulire i dati
    const cleanGame = (game) => ({
      id: game.id,
      name: game.name,
      discounted: game.discounted || false,
      discount_percent: game.discount_percent || 0,
      original_price: game.original_price ? game.original_price / 100 : 0,
      final_price: game.final_price ? game.final_price / 100 : 0,
      header_image: game.header_image || '',
      large_capsule_image: game.large_capsule_image || game.header_image || '',
      windows: game.windows || false,
      mac: game.mac || false,
      linux: game.linux || false,
      streamingvideo: game.streamingvideo || false,
      controller_support: game.controller_support || ''
    });

    const result = {
      hero: featured.large_capsule ? cleanGame(featured.large_capsule) : null,
      featured: (featured.featured_win || []).map(cleanGame),
      topSellers: (featured.top_sellers || []).map(cleanGame),
      newReleases: (featured.new_releases || []).map(cleanGame),
      comingSoon: (featured.coming_soon || []).map(cleanGame),
      specials: (featured.specials || []).map(cleanGame),
      categories: categories.items || []
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Errore Store API:', error);
    return NextResponse.json({ error: 'Errore nel caricamento dello store' }, { status: 500 });
  }
}