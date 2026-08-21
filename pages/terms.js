import LegalLayout, { LegalSection } from "../components/LegalLayout";

const SECTIONS = [
  { id: "acceptance", title: "Acceptance" },
  { id: "service", title: "What the service is" },
  { id: "eligibility", title: "Eligibility" },
  { id: "no-advice", title: "No financial advice" },
  { id: "token", title: "$MOOD" },
  { id: "game", title: "Emotion Rush" },
  { id: "conduct", title: "Acceptable use" },
  { id: "ip", title: "Intellectual property" },
  { id: "third-party", title: "Third-party services" },
  { id: "warranty", title: "No warranty" },
  { id: "liability", title: "Limitation of liability" },
  { id: "indemnity", title: "Indemnification" },
  { id: "changes", title: "Changes and termination" },
  { id: "law", title: "Governing law" },
];

export default function TermsPage() {
  return (
    <LegalLayout
      path="/terms"
      label="Terms"
      title="Terms of Service"
      subtitle="The rules for using WojakMeter. Short, but they apply."
      description="Terms of Service for WojakMeter, the Crypto Emotion Index."
      pills={["18+", "We track emotions, not outcomes"]}
      sections={SECTIONS}
    >
      <LegalSection id="acceptance" title="1. Acceptance">
        <p>
          By using WojakMeter you agree to these terms, to the{" "}
          <a href="/privacy">Privacy Policy</a>, and to the{" "}
          <a href="/disclaimer">Disclaimer</a>. If you do not agree, do not use
          the site.
        </p>
      </LegalSection>

      <LegalSection id="service" title="2. What the service is">
        <p>
          WojakMeter publishes a composite crypto sentiment index, expressed
          through an animated character, together with related features such as
          market charts, headline analysis, community voting, and a game.
        </p>
        <p>
          It is an independent project built and operated by one person. It is
          provided free of charge, has no accounts, and offers no service level
          of any kind. Features may be added, changed, degraded, or removed
          without notice.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" title="3. Eligibility">
        <p>
          You must be at least 18 years old, or the age of majority where you
          live, to use this site. You are responsible for ensuring that your use
          is lawful in your jurisdiction.
        </p>
      </LegalSection>

      <LegalSection id="no-advice" title="4. No financial advice">
        <p>
          Nothing here is financial, investment, legal, or tax advice, and no
          part of the site is a recommendation to transact in any asset. The{" "}
          <a href="/disclaimer">Disclaimer</a> covers this in full and forms
          part of these terms.
        </p>
      </LegalSection>

      <LegalSection id="token" title="5. $MOOD">
        <p>
          The operator of this site may hold a financial interest in the $MOOD
          token on Solana. That interest is disclosed in the{" "}
          <a href="/disclaimer">Disclaimer</a>.
        </p>
        <p>
          Nothing on this site is an offer, solicitation, or invitation to buy,
          sell, or otherwise transact in $MOOD or any other token. $MOOD carries
          no promise of profit, no revenue share, no equity, no governance
          rights, and no claim on the project.
        </p>
      </LegalSection>

      <LegalSection id="game" title="6. Emotion Rush">
        <p>
          Scores submitted to the leaderboard are verified server-side.
          Submissions that appear automated, tampered with, or the product of
          exploiting a defect may be rejected or removed without notice, and
          access to the feature may be blocked.
        </p>
        <p>
          Display names are public. Names that are abusive, impersonating, or
          otherwise inappropriate may be removed at our discretion. Any prize or
          promotion is discretionary, may be changed or withdrawn at any time,
          and creates no obligation to any player.
        </p>
      </LegalSection>

      <LegalSection id="conduct" title="7. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>
            scrape, crawl, or bulk-download the site or its APIs beyond normal
            browsing
          </li>
          <li>
            attempt to interfere with, overload, probe, or gain unauthorized
            access to any part of the infrastructure
          </li>
          <li>submit automated, falsified, or manipulated votes or scores</li>
          <li>
            republish or redistribute the index, artwork, or data as your own,
            or present it as endorsed by us
          </li>
          <li>use the site for anything unlawful</li>
        </ul>
      </LegalSection>

      <LegalSection id="ip" title="8. Intellectual property">
        <p>
          The WojakMeter name and logo, the character artwork, the animation
          sheets, the game assets, the index methodology, and the site code
          belong to their creator and are protected by copyright. You may not
          copy, redistribute, or build derivative products from them without
          written permission.
        </p>
        <p>
          You may reference the index and share screenshots for commentary,
          news, or personal use, with attribution to wojakmeter.com.
        </p>
        <p>
          The underlying Wojak meme is a public internet character in wide
          circulation and is not claimed as our property. The specific artwork,
          rigs, and derivative works produced for this site are.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="9. Third-party services">
        <p>
          The site relies on external data providers, links to external
          platforms, and may display information about assets it has no
          relationship with. We do not control those services, do not endorse
          them, and are not responsible for their content, accuracy, or
          availability.
        </p>
      </LegalSection>

      <LegalSection id="warranty" title="10. No warranty">
        <p>
          The site is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo;, without warranties of any kind, express or implied,
          including merchantability, fitness for a particular purpose,
          accuracy, and non-infringement.
        </p>
        <p>
          We do not warrant that the site will be uninterrupted, error-free, or
          that its data will be correct or current.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="11. Limitation of liability">
        <p>
          To the fullest extent permitted by law, the operator of WojakMeter is
          not liable for any indirect, incidental, special, consequential, or
          punitive damages, or for any loss of profits, capital, data, or
          goodwill, arising from your use of the site.
        </p>
        <p>
          Where liability cannot be excluded, it is limited to one hundred US
          dollars (USD 100).
        </p>
      </LegalSection>

      <LegalSection id="indemnity" title="12. Indemnification">
        <p>
          You agree to indemnify and hold harmless the operator of WojakMeter
          from any claim, loss, or expense arising from your use of the site,
          your breach of these terms, or your violation of any law or
          third-party right.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes and termination">
        <p>
          These terms may be updated at any time; the date at the top reflects
          the current version, and continued use means acceptance. We may
          suspend or discontinue the site, or block access to it, at any time
          and for any reason.
        </p>
      </LegalSection>

      <LegalSection id="law" title="14. Governing law">
        <p>
          These terms are governed by the laws of the State of California, USA,
          without regard to conflict-of-law rules. Any dispute will be brought
          in the state or federal courts located in California, and you consent
          to their jurisdiction.
        </p>
        <p>
          If any provision is found unenforceable, the rest remains in effect.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
