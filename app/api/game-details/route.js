import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appId = searchParams.get('id');

  if (!appId) {
    return NextResponse.json({ error: 'ID mancante' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&l=italian`
    );
    const data = await response.json();
    
    if (data[appId]?.success) {
      const gameData = data[appId].data;
      const genres = gameData.genres?.map(g => g.description).join(', ') || '';
      
      return NextResponse.json({
        genres: genres,
        short_description: gameData.short_description || '',
        header_image: gameData.header_image || ''
      });
    } else {
      return NextResponse.json({ genres: '', short_description: '', header_image: '' });
    }
  } catch (error) {
    console.error('Errore dettagli gioco:', error);
    return NextResponse.json({ genres: '', short_description: '', header_image: '' });
  }
}