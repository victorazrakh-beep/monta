import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getLang } from "@/lib/i18n-server";
import { env } from "@/lib/env";
import { CONTACT_EMAIL, INSTAGRAM_URL } from "@/lib/contact";
import "./globals.css";

const heading = Archivo({ variable: "--font-heading", subsets: ["latin"], weight: ["600", "700", "800"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: "Monta · Entradas para fiestas, conciertos y eventos en Panamá", template: "%s · Monta" },
  description: "Encuentra qué hacer en Panamá y compra tus entradas en un minuto. ¿Organizas algo? Vende tus entradas con Monta.",
  applicationName: "Monta",
  openGraph: { siteName: "Monta", type: "website", locale: "es_PA" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#131519", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('monta-theme')==='light')document.documentElement.classList.add('light')}catch(e){}" }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "Monta", url: env.siteUrl, logo: `${env.siteUrl}/icon.svg`, email: CONTACT_EMAIL, sameAs: [INSTAGRAM_URL] }) }} />
      </head>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
