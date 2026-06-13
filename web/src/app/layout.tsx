import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import ConditionalFooter from "@/components/layout/ConditionalFooter";


export const metadata: Metadata = {
  title: "OKKAZ - Location & Achat / Vente au Bénin",
  description: "Accédez aux biens et équipements essentiels via la location, l'achat ou la vente. Simple, sécurisé et inclusif.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <Navbar />
        <main>
          {children}
        </main>
        <ConditionalFooter />
      </body>
    </html>
  );
}
