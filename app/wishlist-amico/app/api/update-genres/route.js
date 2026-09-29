import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export async function POST(request) {
  console.log('🏷️ === AVVIO AGGIORNAMENTO GENERI ===');
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Recupera tutti i giochi senza generi
    const { data: games, error } = await supabase
      .from('games')
      .select('id, title, store_link')
      .eq('user_id', user.id)
      .is('genres', null);

    if (error) {
      console.error('❌ Errore recupero giochi:', error);
      return NextResponse.json({ error: 'Errore nel recupero dei giochi' }, { status: 500 });
    }

    if (!games || games.length === 0) {
      return NextResponse.json({ 
        message: 'Tutti i giochi hanno già i generi!',
        updated: 0 
      });
    }

    console.log(`📦 Trovati ${games.length} giochi senza generi`);

    let updated = 0;
    let failed = 0;

    // Per ogni gioco, cerca i generi su Steam
    for (const game of games) {
      try {
        console.log(`🔍 Cerco generi per: ${game.title}`);
        
        // Estrai l'ID di Steam dal link
        let appId = null;
        if (game.store_link && game.store_link.includes('steampowered.com/app/')) {
          const match = game.store_link.match(/\/app\/(\d+)/);
          if (match) appId = match[1];
        }

        if (!appId) {
          console.warn(`⚠️ Nessun ID Steam trovato per: ${game.title}`);
          failed++;
          continue;
        }

        // Recupera i dettagli del gioco da Steam
        const detailsResponse = await fetch(
          `https://store.steampowered.com/api/appdetails?appids=${appId}&l=italian`
        );
        const detailsData = await detailsResponse.json();
        
        if (detailsData[appId]?.success) {
          const gameData = detailsData[appId].data;
          const genres = gameData.genres?.map(g => g.description).join(', ') || '';

          if (genres) {
            // Aggiorna il database
            const { error: updateError } = await supabase
              .from('games')
              .update({ genres: genres })
              .eq('id', game.id);

            if (!updateError) {
              updated++;
              console.log(`✅ Aggiornato: ${game.title} - ${genres}`);
            } else {
              failed++;
              console.error(`❌ Errore update ${game.title}:`, updateError);
            }
          } else {
            failed++;
            console.warn(`⚠️ Nessun genere trovato per: ${game.title}`);
          }
        } else {
          failed++;
          console.warn(`⚠️ Gioco non trovato su Steam: ${game.title}`);
        }

        // Piccolo delay per non sovraccaricare l'API di Steam
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (gameError) {
        failed++;
        console.error(`💥 Errore per ${game.title}:`, gameError);
      }
    }

    console.log(`🎉 Completato! Aggiornati: ${updated}, Falliti: ${failed}`);

    return NextResponse.json({ 
      message: `Aggiornati ${updated} giochi con generi. ${failed} giochi non trovati.`,
      updated,
      failed
    });

  } catch (error) {
    console.error('💥 Errore generale:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}