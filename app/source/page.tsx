import Link from "next/link";
export const metadata = { title: "Crossed · Open source" };
export default function Source() {
  return (
    <main style={{ maxWidth: 760, padding: "60px 24px" }}>
      <Link className="text-button" href="/">
        ← Back to Crossed
      </Link>
      <div className="intro-label eyebrow" style={{ marginTop: 40 }}>
        SMALL BY DESIGN. OPEN BY DEFAULT.
      </div>
      <h1
        style={{
          fontFamily: "var(--serif)",
          fontSize: 54,
          fontWeight: 400,
          lineHeight: 1.1,
        }}
      >
        Make it your own.
      </h1>
      <p style={{ lineHeight: 1.9, margin: "24px 0", color: "var(--muted)" }}>
        Crossed is a small missed-connections app. The application code is
        MIT-licensed: run it, change it, and share it. The source includes the
        web interface, API routes, database schema, tests, and setup
        instructions. Third-party libraries, fonts and map data retain their own
        licenses.
      </p>
      <p style={{ marginBottom: 20 }}>
        <a className="text-button" href="https://github.com/whoist/crossed-missed-connections">
          View on GitHub ↗
        </a>
      </p>
      <a className="primary" href="/crossed-source.zip" download>
        Download the source code ↓
      </a>
      <div className="info-body" style={{ marginTop: 32 }}>
        <h3>A small, open stack</h3>
        <p>
          React · TypeScript · Next.js · MapLibre · Firebase Auth · Firestore.
          The app supports email/password and Google sign-in through Firebase,
          with secure server sessions. No ChatGPT account is required.
        </p>
        <h3>Maps without a paid API key</h3>
        <p>
          OpenFreeMap serves the map. Photon searches OpenStreetMap places and
          addresses. Map use is free; Photon’s public demo has fair-use limits
          and no SLA. This app deliberately limits external search traffic. It
          does not promise complete business coverage or free unlimited hosting.
        </p>
        <h3>Start locally</h3>
        <p>
          The README walks through installation, local Firebase emulators,
          account setup, and deployment. No Bul Beni code, users or data are
          included.
        </p>
      </div>
    </main>
  );
}
