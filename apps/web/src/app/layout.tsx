import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Guest TV Pages",
  description: "Create and publish guest room TV pages as IPTV channels",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

function Sidebar() {
  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/pages", label: "Pages" },
    { href: "/templates", label: "Templates" },
    { href: "/rooms", label: "Rooms" },
    { href: "/assets", label: "Assets" },
    { href: "/publish", label: "Publish" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <nav className="w-56 shrink-0 border-r border-slate-800 bg-slate-900 p-4">
      <div className="mb-8">
        <h1 className="text-lg font-bold text-white">Guest TV Pages</h1>
        <p className="text-xs text-slate-400">Hospitality Channels</p>
      </div>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="block rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
