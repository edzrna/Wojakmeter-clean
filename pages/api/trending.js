export async function GET() {
  try {
    const trendingRes = await fetch("https://api.coingecko.com/api/v3/search/trending");
    const trendingData = await trendingRes.json();

    const ids = trendingData.coins
      .map(c => c.item.id)
      .slice(0, 10)
      .join(",");

    const marketsRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=1h,24h,7d`
    );

    const coins = await marketsRes.json();

    return new Response(JSON.stringify({ coins }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}