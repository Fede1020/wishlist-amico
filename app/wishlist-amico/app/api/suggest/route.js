import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export async function POST(request) {
  console.log('🔍 === AVVIO API SUGGEST (GROQ) ===');
  
  try {
    // 1. Verifica autenticazione
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    // 2. Recupera gusti
    let tastes = 'Nessun gusto specificato';
    const { data: profile } = await supabase.from('profiles').select('gaming_tastes').eq('id', user.id).single();
    if (profile?.gaming_tastes) tastes = profile.gaming_tastes;

    // 3. Recupera giochi attuali
    let currentGames = 'Nessun gioco';
    const { data: games } = await supabase.from('games').select('title, platform').eq('user_id', user.id);
    if (games && games.length > 0) {
      currentGames = games.map(g => `${g.title} (${g.platform})`).join(', ');
    }

    // Fallback di sicurezza
    const fallbackGames = [
      { title: "Hades II", platform: "Steam", description: "Un roguelike d'azione con una narrativa profonda e gameplay avvincente.", store_link: "https://store.steampowered.com/app/1145350/Hades_II/" },
      { title: "Baldur's Gate 3", platform: "Steam", description: "Un GDR epico con scelte che contano davvero e combattimenti a turni strategici.", store_link: "https://store.steampowered.com/app/1086940/Baldurs_Gate_3/" },
      { title: "Cyberpunk 2077", platform: "Steam", description: "Un GDR d'azione in un mondo aperto futuristico, ora migliorato con espansioni fantastiche.", store_link: "https://store.steampowered.com/app/1091500/Cyberpunk_2077/" }
    ];

    // 4. Se non c'è la chiave Groq, usa fallback
    if (!process.env.GROQ_API_KEY) {
      console.log('⚠️ Nessuna chiave Groq, uso fallback');
      return NextResponse.json({ recommendations: fallbackGames });
    }

    // 5. Chiama Groq API (Llama 3.3 70B)
    console.log('🤖 Chiamata a Groq (Llama 3.3)...');
    const prompt = `Sei un esperto di videogiochi. Basandoti su questi gusti: "${tastes}" e considerando che l'utente ha già nella wishlist: ${currentGames}, suggerisci 3 giochi da aggiungere. 
Rispondi SOLO con un array JSON valido in questo formato esatto (niente testo prima o dopo, niente markdown):
[{"title": "Nome Gioco", "platform": "Steam", "description": "Breve descrizione di 1-2 frasi.", "store_link": "https://store.steampowered.com/..."}]`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Sei un esperto di videogiochi che consiglia giochi in italiano. Rispondi sempre con JSON valido.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore Groq:', errorText);
      return NextResponse.json({ recommendations: fallbackGames });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('❌ Risposta Groq vuota');
      return NextResponse.json({ recommendations: fallbackGames });
    }

    // Pulisci la risposta (rimuovi eventuali ```json ... ```)
    const jsonStr = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    let recommendations;
    
    try {
      const parsed = JSON.parse(jsonStr);
      // Groq con response_format json_object a volte wrappa in un oggetto
      recommendations = parsed.recommendations || parsed.games || parsed;
      if (!Array.isArray(recommendations)) {
        recommendations = fallbackGames;
      }
    } catch (parseError) {
      console.error('❌ Errore parsing JSON:', parseError);
      recommendations = fallbackGames;
    }

    console.log('✅ Consigli Groq generati con successo!');
    return NextResponse.json({ recommendations });

  } catch (error) {
    console.error('💥 Errore generale:', error);
    return NextResponse.json({ 
      recommendations: [
        { title: "Hades II", platform: "Steam", description: "Un roguelike d'azione con una narrativa profonda.", store_link: "https://store.steampowered.com/app/1145350/Hades_II/" },
        { title: "Baldur's Gate 3", platform: "Steam", description: "Un GDR epico con scelte che contano davvero.", store_link: "https://store.steampowered.com/app/1086940/Baldurs_Gate_3/" },
        { title: "Cyberpunk 2077", platform: "Steam", description: "Un GDR d'azione in un mondo aperto futuristico.", store_link: "https://store.steampowered.com/app/1091500/Cyberpunk_2077/" }
      ]
    });
  }
}