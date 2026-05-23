import { CONTACT_EMAIL, LAST_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "Terms — SUBSONIC",
  description: "Terms of service for using SUBSONIC.",
};

export default function TermsPage() {
  return (
    <article className="prose-subsonic mx-auto max-w-2xl space-y-5 text-sm leading-relaxed text-white/75">
      <div>
        <span className="label-cap">Legal</span>
        <h1 className="mt-1 text-3xl font-bold text-white">Terms of service</h1>
        <p className="mt-1 text-xs text-white/40">Last updated: {LAST_UPDATED}</p>
      </div>

      <p>
        By using {SITE_NAME}, you agree to the terms below. They&apos;re written in plain English
        because the service is small and the rules are simple.
      </p>

      <Section title="The service">
        {SITE_NAME} is an AI-assisted crate-digging and set-building tool. It runs primarily in
        your browser. Some optional features (cloud sync, natural-language search) call third-party
        services on your behalf. Features may change or be discontinued at any time.
      </Section>

      <Section title="Your account">
        You&apos;re responsible for your password and any activity from your account. We may
        suspend accounts that abuse the service, attempt to break it, send spam, or violate the
        acceptable-use rules below.
      </Section>

      <Section title="Acceptable use">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Don&apos;t use the service to break any law.</li>
          <li>Don&apos;t scrape, abuse, or attempt to exceed the published rate limits.</li>
          <li>Don&apos;t upload content you don&apos;t have the right to use as your library data.</li>
          <li>Don&apos;t attempt to extract other users&apos; data or break the access controls.</li>
        </ul>
      </Section>

      <Section title="Music content">
        You provide your own library metadata (imported via CSV, Rekordbox, Traktor, etc.). We
        store that metadata to give the app its functionality; we don&apos;t claim ownership of
        anything you import. The demo / seed crate shipped with the app is fictional.
      </Section>

      <Section title="No warranty">
        The service is provided <strong>as is</strong>, without warranties of any kind. We make
        no promise that it will be uninterrupted, error-free, or that AI-generated suggestions are
        accurate. Don&apos;t use it as the sole source of truth for anything critical.
      </Section>

      <Section title="Limitation of liability">
        To the maximum extent permitted by law, {SITE_NAME} and its operators aren&apos;t liable
        for indirect, incidental, or consequential damages arising from your use of the service.
      </Section>

      <Section title="Changes">
        We may update these terms. Continued use after a change means you accept the updated
        terms. Material changes will be flagged in the app.
      </Section>

      <Section title="Contact">
        Questions about these terms: <a className="text-neon-cyan hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
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
