import LegalLayout, { LegalSection } from "../components/LegalLayout";

const SECTIONS = [
  { id: "summary", title: "The short version" },
  { id: "automatic", title: "Collected automatically" },
  { id: "submitted", title: "What you submit" },
  { id: "local", title: "Stored in your browser" },
  { id: "use", title: "How it is used" },
  { id: "processors", title: "Who processes it" },
  { id: "retention", title: "How long it is kept" },
  { id: "rights", title: "Your rights" },
  { id: "security", title: "Security" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      path="/privacy"
      label="Privacy"
      title="Privacy Policy"
      subtitle="What WojakMeter collects, why, and what stays on your device."
      description="Privacy Policy for WojakMeter. What data is collected, how it is used, and what remains local to your browser."
      pills={["No accounts", "No data sales"]}
      sections={SECTIONS}
    >
      <LegalSection id="summary" title="The short version">
        <p className="legal-callout">
          WojakMeter has no user accounts and no login. You can read the whole
          site without giving us anything. Two features — the Emotion Pulse vote
          and the Emotion Rush leaderboard — store what you submit on a server,
          because they would not work otherwise. Nothing is sold.
        </p>
      </LegalSection>

      <LegalSection id="automatic" title="1. Collected automatically">
        <p>
          Like any website, WojakMeter receives certain technical information
          when your browser makes a request:
        </p>
        <ul>
          <li>IP address and approximate region derived from it</li>
          <li>Browser type, operating system, and device characteristics</li>
          <li>Pages requested, referring page, and timestamps</li>
          <li>Performance and error diagnostics</li>
        </ul>
        <p>
          This is standard server and platform logging. It is used to operate
          the site, diagnose failures, and detect abuse.
        </p>
      </LegalSection>

      <LegalSection id="submitted" title="2. What you submit">
        <p>Two features write to a database:</p>
        <p>
          <strong>Emotion Pulse.</strong> When you vote on how the market feels,
          we store your vote, the time, and the market index score at that
          moment — so community sentiment can be compared against the measured
          index. To keep one voter to one active vote without creating accounts,
          your voter identity is derived from a one-way cryptographic hash with
          a server-side secret. We do not store your raw identifier alongside
          the vote, and the hash cannot be reversed back into it.
        </p>
        <p>
          <strong>Emotion Rush.</strong> If you submit a score to the
          leaderboard, we store the score, the time, and whatever display name
          you typed. That display name is public. Do not enter your real name,
          email, wallet address, or anything else you would not want shown to
          strangers.
        </p>
      </LegalSection>

      <LegalSection id="local" title="3. Stored in your browser">
        <p>
          Some features keep their data on your device rather than on our
          servers, using local storage. This includes preferences such as your
          selected character style, and — where the feature offers it —
          portfolio entries you add to Bag Mood.
        </p>
        <p>
          Data held this way never reaches us. Clearing your browser data
          deletes it permanently, and we cannot recover it for you.
        </p>
      </LegalSection>

      <LegalSection id="use" title="4. How it is used">
        <p>
          To run and improve the site: serving pages, keeping features working,
          fixing bugs, understanding which parts get used, comparing community
          sentiment against the index, and preventing abuse of the vote and the
          leaderboard.
        </p>
        <p>
          We do not use your data for advertising, we do not build profiles
          about you, and we do not sell or rent it to anyone.
        </p>
      </LegalSection>

      <LegalSection id="processors" title="5. Who processes it">
        <p>
          WojakMeter runs on third-party infrastructure. These providers process
          data on our behalf as part of normal operation:
        </p>
        <ul>
          <li>
            <strong>Hosting and delivery</strong> — serves the site and keeps
            request logs
          </li>
          <li>
            <strong>Database</strong> — stores Emotion Pulse votes and Emotion
            Rush scores
          </li>
          <li>
            <strong>Market and news data providers</strong> — supply the price,
            volume, and headline data the index is built from
          </li>
        </ul>
        <p>
          Requests to external data providers are made from our servers where
          possible, so those providers generally do not receive your IP address.
          Where the site embeds or links to external platforms, those platforms
          apply their own privacy policies, not this one.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. How long it is kept">
        <p>
          Technical logs are retained for a limited period by our hosting
          provider and then discarded. Emotion Pulse votes are evaluated on a
          rolling 24-hour window; older rows are kept only in aggregate form for
          historical comparison. Leaderboard scores are retained while the
          leaderboard exists.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="7. Your rights">
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, or restrict processing of your personal data, and to object to
          it. Residents of California and of the European Economic Area and the
          United Kingdom have such rights under the CCPA/CPRA and the GDPR
          respectively.
        </p>
        <p>
          Write to{" "}
          <a className="legal-contact" href="mailto:contact@wojakmeter.com">
            contact@wojakmeter.com
          </a>{" "}
          and we will act on your request. Note the practical limit: because
          there are no accounts, we usually cannot connect a request to specific
          rows. For a leaderboard entry, tell us the display name and roughly
          when you submitted it and we can remove it.
        </p>
        <p>
          We do not sell personal information, so there is nothing to opt out of
          on that front.
        </p>
      </LegalSection>

      <LegalSection id="security" title="8. Security">
        <p>
          Traffic is served over HTTPS, secrets are held as server-side
          environment variables, and voter identifiers are hashed rather than
          stored raw. That said, no online service can promise absolute
          security, and this one is run by an independent developer, not a
          security team.
        </p>
      </LegalSection>

      <LegalSection id="children" title="9. Children">
        <p>
          WojakMeter is not directed at children under 13 and we do not
          knowingly collect their data. If you believe a child has submitted
          information, contact us and we will remove it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="10. Changes">
        <p>
          This policy will change as the site does. The date at the top reflects
          the current version. Continuing to use the site after a change means
          you accept the updated policy.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
