import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Xscholar",
  description: "AI Research Intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-white">⚡ Xscholar</span>
          <span className="text-slate-500 text-sm">research intelligence</span>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
