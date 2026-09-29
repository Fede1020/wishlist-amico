import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    // 1. Ricerca base su Steam
    const searchResponse = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=italian&cc=IT`
    );
    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // 2. Arricchiamo i primi 5 risultati
    const enrichedItems = await Promise.all(
      searchData.items.slice(0, 5).map(async (game) => {
        try {
          const detailsResponse = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${game.id}&l=italian&cc=IT`
          );
          const detailsData = await detailsResponse.json();

          let price = 0;
          let shortDescription = '';
          let genres = '';
          let headerImage = game.tiny_image;

          // Link di ricerca Instant Gaming (senza API)
          const instantGamingLink = `https://www.instant-gaming.com/it/search/?query=${encodeURIComponent(game.name)}`;
          
          // Variabili per CheapShark
          let cheapestPrice = null;
          let cheapestStore = '';
          let cheapestLink = '';

          if (detailsData[game.id]?.success) {
            const details = detailsData[game.id].data;
            if (details.price_overview) {
              price = details.price_overview.final / 100;
            }
            shortDescription = details.short_description || '';
            genres = details.genres?.map(g => g.description).join(', ') || '';
            headerImage = details.header_image || game.tiny_image;
          }

          // 3. Cerca il prezzo più basso su CheapShark (NESSUNA CHIAVE RICHIESTA!)
          try {
            const cheapSharkRes = await fetch(
              `https://www.cheapshark.com/api/1.0/deals?title=${encodeURIComponent(game.name)}&page_size=1&sortBy=Savings`
            );
            const cheapSharkData = await cheapSharkRes.json();

            if (cheapSharkData && cheapSharkData.length > 0) {
              const bestDeal = cheapSharkData[0];
              cheapestPrice = parseFloat(bestDeal.salePrice);
              cheapestStore = bestDeal.storeID === '1' ? 'Steam' : 'Altro Store';
              cheapestLink = `https://www.cheapshark.com/redirect?dealID=${bestDeal.dealID}`;
            }
          } catch (error) {
            console.error(`Errore CheapShark per ${game.name}:`, error);
          }

          return {
            ...game,
            short_description: shortDescription,
            price: price,
            genres: genres,
            header_image: headerImage,
            tiny_image: game.tiny_image,
            instant_gaming_link: instantGamingLink,
            cheapest_price: cheapestPrice,
            cheapest_store: cheapestStore,
            cheapest_link: cheapestLink
          };
        } catch (error) {
          console.error(`Errore dettagli per ${game.name}:`, error);
        }
        return {
          ...game,
          instant_gaming_link: `https://www.instant-gaming.com/it/search/?query=${encodeURIComponent(game.name)}`
        };
      })
    );

    return NextResponse.json({ items: enrichedItems });
  } catch (error) {
    console.error('Errore Steam API:', error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}