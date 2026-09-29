import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export async function POST(request) {
  try {
    const { steamId } = await request.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

    // Recupera la lista giochi da Steam
    const response = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=YOUR_STEAM_API_KEY&steamid=${steamId}&format=json`);
    const data = await response.json();
    
    if (!data.response?.games) {
      return NextResponse.json({ error: 'Steam ID non valido o profilo privato' }, { status: 400 });
    }

    let imported = 0;
    for (const game of data.response.games.slice(0, 20)) { // Limita a 20 per ora
      const detailsResponse = await fetch(`https://store.steampowered.com/api/appdetails?appids=${game.appid}&l=italian`);
      const details = await detailsResponse.json();
      
      if (details[game.appid]?.success) {
        const gameData = details[game.appid].data;
        
        await supabase.from('games').insert({
          user_id: user.id,
          title: gameData.name,
          platform: 'Steam',
          description: gameData.short_description || '',
          store_link: `https://store.steampowered.com/app/${game.appid}`,
          image_url: gameData.header_image || '',
          genres: gameData.genres?.map(g => g.description).join(', ') || '',
          price: gameData.price_overview?.final / 100 || 0,
          priority: 'medium',
          purchased: true // Giochi già posseduti
        });
        imported++;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return NextResponse.json({ message: `Importati ${imported} giochi da Steam!`, imported });
  } catch (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}