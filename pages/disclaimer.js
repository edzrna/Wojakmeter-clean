import LegalLayout, { LegalSection } from "../components/LegalLayout";

const SECTIONS = [
  { id: "not-advice", title: "Not financial advice" },
  { id: "mood-token", title: "The $MOOD token" },
  { id: "index", title: "What the index is and is not" },
  { id: "game", title: "Emotion Rush" },
  { id: "automation", title: "Automated tools" },
  { id: "risk", title: "Market risk" },
  { id: "data", title: "Data and third-party sources" },
  { id: "no-relationship", title: "No advisory relationship" },
  { id: "liability", title: "Limitation of liability" },
];

export default function DisclaimerPage() {
  return (
    <LegalLayout
      path="/disclaimer"
      label="Disclaimer"
      title="Disclaimer"
      subtitle="WojakMeter measures how the market feels. It does not tell you what to do about it."
      description="Disclaimer for WojakMeter. The Crypto Emotion Index is informational and entertainment content, not financial advice."
      pills={["Not financial advice", "Read the $MOOD disclosure"]}
      sections={SECTIONS}
    >
      <LegalSection id="not-advice" title="1. Not financial advice">
        <p>
          Everything on WojakMeter — the index, the character, the charts, the
          headlines, the narratives, the leaderboards — is published for
          informational and entertainment purposes only. None of it is
          financial, investment, legal, or tax advice, and none of it is a
          recommendation to buy, sell, or hold any asset.
        </p>
        <p>
          WojakMeter is not a broker-dealer, investment adviser, exchange, or
          financial institution, and is not registered with any financial
          regulator in any jurisdiction.
        </p>
      </LegalSection>

      <LegalSection id="mood-token" title="2. The $MOOD token">
        <p className="legal-callout">
          <strong>Conflict of interest disclosure.</strong> WojakMeter is
          associated with $MOOD, a token on the Solana blockchain. The operator
          of this site may create, hold, buy, sell, or otherwise have a
          financial interest in $MOOD. Read anything this site publishes with
          that interest in mind.
        </p>
        <p>
          $MOOD is a meme token. It carries no promise of profit, no revenue
          share, no equity, no governance rights, and no claim on the project or
          its assets. It is not offered or sold as an investment, and nothing on
          this site should be read as an offer or solicitation to buy it.
        </p>
        <p>
          Where the site displays $MOOD price or activity, that data is shown
          for the same reason as any other market data: because the character
          reacts to it. Its presence on the site is not an endorsement or a
          price prediction.
        </p>
        <p>
          Meme tokens are among the most volatile assets that exist. Most go to
          zero. Do not spend money on $MOOD that you are unwilling to lose
          entirely.
        </p>
      </LegalSection>

      <LegalSection id="index" title="3. What the index is and is not">
        <p>
          The Crypto Emotion Index is a composite reading built from six
          measured components — return, breadth, volatility regime, volume
          anomaly, dominance rotation, and headline tone — normalized against a
          rolling window and mapped onto a fixed curve.
        </p>
        <p>
          It is a description of conditions that have already happened. It is
          not a forecast, a signal, or a probability. A high score does not mean
          prices will rise, and a low score does not mean they will fall.
        </p>
        <p>
          The methodology changes as the project develops. Historical scores may
          be recalculated when the engine is revised, so a score you saw
          previously may not match what the site shows later.
        </p>
      </LegalSection>

      <LegalSection id="game" title="4. Emotion Rush">
        <p>
          Emotion Rush is a game. Scores, ranks, and leaderboard positions have
          no monetary value and confer no rights.
        </p>
        <p>
          Any prize, reward, or promotion announced in connection with the game
          is offered at the sole discretion of the operator, may be modified or
          withdrawn at any time, and is subject to score verification. Scores
          that appear to result from automation, tampering, or exploitation of a
          defect may be removed without notice.
        </p>
      </LegalSection>

      <LegalSection id="automation" title="5. Automated tools">
        <p>
          Any bot, alert, or automated feature distributed in connection with
          WojakMeter is experimental software provided as-is. Automated tools
          can misfire, execute unintended actions, act on stale data, or fail
          silently.
        </p>
        <p>
          If you connect any automated tool to an account that can move funds,
          you do so entirely at your own risk and remain solely responsible for
          every action it takes on your behalf, including losses caused by bugs,
          outages, or incorrect configuration.
        </p>
      </LegalSection>

      <LegalSection id="risk" title="6. Market risk">
        <p>
          Crypto markets operate continuously, are thinly regulated, and can
          move violently without warning. Liquidity can disappear. Tokens can be
          delisted, rug-pulled, or rendered worthless. You may lose some or all
          of your capital.
        </p>
        <p>Past performance tells you nothing about future results.</p>
      </LegalSection>

      <LegalSection id="data" title="7. Data and third-party sources">
        <p>
          WojakMeter depends on external APIs, market feeds, and news sources.
          That data may be delayed, incomplete, wrong, or unavailable. Charts
          may show gaps. Scores may fail to update.
        </p>
        <p>
          When a signal is missing, the index redistributes its weight across
          the remaining components, and when too much is missing it declines to
          produce a score at all rather than publishing an invented one. Even
          so, the output is only as good as the inputs.
        </p>
      </LegalSection>

      <LegalSection id="no-relationship" title="8. No advisory relationship">
        <p>
          Using this site, reading its content, or contacting its operator does
          not create an advisory, fiduciary, or professional relationship of any
          kind. No duty of care is owed to you in respect of your financial
          decisions.
        </p>
        <p>
          WojakMeter is available globally, but nothing on it is directed at any
          person in a jurisdiction where such content would be unlawful. You are
          responsible for complying with the laws that apply to you.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="9. Limitation of liability">
        <p>
          To the fullest extent permitted by law, WojakMeter and its operator
          are not liable for any loss or damage — direct, indirect, incidental,
          or consequential — arising from your use of this site, reliance on its
          content, or any decision you make in connection with it.
        </p>
        <p>Any decision you make is yours alone.</p>
      </LegalSection>
    </LegalLayout>
  );
}
