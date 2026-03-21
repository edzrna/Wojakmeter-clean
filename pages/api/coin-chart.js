function getDaysFromTimeframe(timeframe) {
  switch (timeframe) {
    case "1m":
    case "5m":
    case "15m":
    case "1h":
      return 1;
    case "4h":
      return 7;
    case "24h":
      return 30;
    case "7d":
      return 90;
    default:
      return 1;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const coin = searchParams.get("coin") || "bitcoin";
    const timeframe = searchParams.get("timeframe") || "1h";

    const days = getDaysFromTimeframe(timeframe);

    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
      coin
    )}/market_chart?vs_currency=usd&days=${days}`;

    const response = await fetch(url, {
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(
        JSON.stringify({
          error: `CoinGecko error: ${response.status} ${text}`
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.prices)) {
      return new Response(
        JSON.stringify({
          error: "NO_PRICES",
          received: data
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        prices: data.prices
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}