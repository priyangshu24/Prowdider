import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prowider Mini Lead Distribution System",
  description: "Database-backed lead capture, fair allocation, quota control, and live dashboards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="app-frame">
          <header className="site-header">
            <Link href="/" className="brand-mark">
              <span className="brand-pill">P</span>
              <div>
                <strong>Prowider Mini Lead Distribution</strong>
                <p>Reliable routing for service enquiries</p>
              </div>
            </Link>

            <nav className="site-nav">
              <Link href="/request-service">Request Service</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/test-tools">Test Tools</Link>
            </nav>
          </header>

          <main className="site-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
