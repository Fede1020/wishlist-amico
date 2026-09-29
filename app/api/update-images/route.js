import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export async function POST(request) {
  console.log('🖼️ === AVVIO AGGIORNAMENTO IMMAGINI ===');
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // Recupera tutti i giochi senza immagine
    const { data: games, error } = await supabase
      .from('games')
      .select('id, title')
      .eq('user_id', user.id)
      .is('image_url', null);

    if (error) {
      console.error('❌ Errore recupero giochi:', error);
      return NextResponse.json({ error: 'Errore nel recupero dei giochi' }, { status: 500 });
    }

    if (!games || games.length === 0) {
      return NextResponse.json({ 
        message: 'Tutti i giochi hanno già un\'immagine!',
        updated: 0 
      });
    }

    console.log(`📦 Trovati ${games.length} giochi senza immagine`);

    let updated = 0;
    let failed = 0;

    // Per ogni gioco, cerca l'immagine su Steam
    for (const game of games) {
      try {
        console.log(`🔍 Cerco immagine per: ${game.title}`);
        
        // Cerca il gioco su Steam
        const searchResponse = await fetch(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(game.title)}&l=italian&cc=IT`
        );
        const searchData = await searchResponse.json();

        if (searchData.items && searchData.items.length > 0) {
          // Prendi il primo risultato (il più rilevante)
          const steamGame = searchData.items[0];
          const imageUrl = steamGame.tiny_image;

          if (imageUrl) {
            // Aggiorna il database
            const { error: updateError } = await supabase
              .from('games')
              .update({ image_url: imageUrl })
              .eq('id', game.id);

            if (!updateError) {
              updated++;
              console.log(`✅ Aggiornato: ${game.title}`);
            } else {
              failed++;
              console.error(`❌ Errore update ${game.title}:`, updateError);
            }
          } else {
            failed++;
            console.warn(`⚠️ Nessuna immagine trovata per: ${game.title}`);
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
      message: `Aggiornate ${updated} immagini. ${failed} giochi non trovati.`,
      updated,
      failed
    });

  } catch (error) {
    console.error('💥 Errore generale:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}