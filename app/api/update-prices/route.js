import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export async function POST(request) {
  console.log('💰 === AVVIO AGGIORNAMENTO PREZZI ===');
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { data: games } = await supabase
      .from('games')
      .select('id, store_link')
      .eq('user_id', user.id);

    if (!games || games.length === 0) {
      return NextResponse.json({ message: 'Nessun gioco da aggiornare', updated: 0 });
    }

    let updated = 0;
    let failed = 0;

    for (const game of games) {
      try {
        let appId = null;
        if (game.store_link?.includes('steampowered.com/app/')) {
          const match = game.store_link.match(/\/app\/(\d+)/);
          if (match) appId = match[1];
        }

        if (!appId) { failed++; continue; }

        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=it`);
        const data = await response.json();
        
        if (data[appId]?.success) {
          const priceData = data[appId].data.price_overview;
          const price = priceData ? priceData.final / 100 : 0;

          await supabase.from('games').update({ price }).eq('id', game.id);
          updated++;
          console.log(`✅ ${game.store_link} - €${price}`);
        } else {
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        failed++;
      }
    }

    return NextResponse.json({ message: `Aggiornati ${updated} prezzi. ${failed} falliti.`, updated, failed });
  } catch (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}