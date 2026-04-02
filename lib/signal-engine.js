export function computeMarketSignal(globalData) {
  const change = Number(
    globalData?.market_cap_change_percentage_24h_usd || 0
  );

  const score = Math.round(Math.max(0, Math.min(100, 50 + change * 10)));

  const emotion = getEmotion(score);
  const narrative = getNarrative(emotion.key);

  return {
    score,
    change,
    emotion,
    narrative,
    ts: Date.now()
  };
}

function getEmotion(score) {
  if (score >= 85) return { key: "euphoria", label: "Euphoria", emoji: "🤩" };
  if (score >= 70) return { key: "content", label: "Content", emoji: "😌" };
  if (score >= 60) return { key: "optimism", label: "Optimism", emoji: "🙂" };
  if (score >= 45) return { key: "neutral", label: "Neutral", emoji: "😐" };
  if (score >= 35) return { key: "doubt", label: "Doubt", emoji: "🤔" };
  if (score >= 20) return { key: "concern", label: "Concern", emoji: "😟" };
  return { key: "frustration", label: "Frustration", emoji: "😡" };
}

function getNarrative(key) {
  const map = {
    euphoria: "Everything feels easy.",
    content: "Confidence is building.",
    optimism: "Momentum is improving.",
    neutral: "The market is undecided.",
    doubt: "Something feels off.",
    concern: "Pressure is building.",
    frustration: "Traders are exhausted."
  };

  return map[key] || "Market is shifting.";
}