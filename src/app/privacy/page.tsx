import { CONTACT_EMAIL, LAST_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "Privacy — SUBSONIC",
  description: "What SUBSONIC stores, where it goes, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <article className="prose-subsonic mx-auto max-w-2xl space-y-5 text-sm leading-relaxed text-white/75">
      <div>
        <span className="label-cap">Legal</span>
        <h1 className="mt-1 text-3xl font-bold text-white">Privacy</h1>
        <p className="mt-1 text-xs text-white/40">Last updated: {LAST_UPDATED}</p>
      </div>

      <p>
        {SITE_NAME} is a small tool for DJs. This page is a plain-English description of what data
        the app collects, where it goes, and how to get rid of it.
      </p>

      <Section title="What we store">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>If you don&apos;t sign in:</strong> nothing leaves your browser. Your imported
            crate and saved sets live in this browser&apos;s <code>localStorage</code> only.
          </li>
          <li>
            <strong>If you sign in:</strong> we store your email and a password hash (via Supabase
            Auth), plus the contents of your imported crate and saved sets as JSON in our database
            (Supabase). That&apos;s the entire user record.
          </li>
          <li>
            <strong>Rate-limit counters:</strong> when you use the natural-language AI search, we
            briefly store your IP and a counter (per 24h) so we can cap abuse. Cleared on a rolling
            basis.
          </li>
          <li>
            We do <strong>not</strong> use third-party analytics, tracking pixels, or advertising
            cookies. The only cookie set is the Supabase session cookie when you sign in.
          </li>
        </ul>
      </Section>

      <Section title="Where it goes">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Supabase</strong> — database and authentication. Stores email, password hash,
            imported tracks, saved sets, rate-limit rows.
          </li>
          <li>
            <strong>Anthropic (Claude API)</strong> — when you use &ldquo;Ask in plain English&rdquo;,
            your query text (not your account) is sent to Anthropic to interpret. Subject to
            Anthropic&apos;s policies. If you never use that feature, no data goes to Anthropic.
          </li>
          <li>
            <strong>Vercel</strong> — hosting. Standard server access logs (IP, request path,
            timestamp) per their privacy policy.
          </li>
        </ul>
      </Section>

      <Section title="Your rights (GDPR / general)">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Access:</strong> everything we have about you lives in your account modal and
            in the Discover / Set Builder pages.
          </li>
          <li>
            <strong>Deletion:</strong> open the account modal (click your email in the nav) →
            Danger zone → type DELETE → Permanently delete account. This wipes your data and your
            auth record immediately. You can also stop using the app and your localStorage data
            never reaches us in the first place.
          </li>
          <li>
            <strong>Portability:</strong> the Set Builder&apos;s &ldquo;Export .txt&rdquo; gives you
            your tracklists in plain text. For raw data export, email us.
          </li>
          <li>
            <strong>Questions or complaints:</strong> <a className="text-neon-cyan hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </li>
        </ul>
      </Section>

      <Section title="Children">
        The service isn&apos;t directed at people under 16. If you believe a minor has signed up,
        contact us and we&apos;ll delete the account.
      </Section>

      <Section title="Changes">
        We may update this page; the &ldquo;Last updated&rdquo; date at the top reflects the
        most recent revision. Material changes will be flagged in the app.
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
