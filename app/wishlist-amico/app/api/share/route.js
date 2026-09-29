import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

    // Genera token unico
    const token = Math.random().toString(36).substring(2, 15);

    // Salva nel database
    await supabase.from('shared_wishlists').insert({
      user_id: user.id,
      share_token: token
    });

    return NextResponse.json({ token, url: `/shared/${token}` });
  } catch (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) return NextResponse.json({ error: 'Token mancante' }, { status: 400 });

  try {
    const supabase = await createClient();
    const { data: shared } = await supabase.from('shared_wishlists').select('user_id').eq('share_token', token).single();
    
    if (!shared) return NextResponse.json({ error: 'Link non valido' }, { status: 404 });

    const { data: games } = await supabase.from('games').select('*').eq('user_id', shared.user_id).eq('purchased', false);
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', shared.user_id).single();

    return NextResponse.json({ games: games || [], username: profile?.username || 'Utente' });
  } catch (error) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}