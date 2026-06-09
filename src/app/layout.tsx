import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.css";
import { Header } from "@/components/Header";
import NotificationBanner from "@/components/NotificationBanner";
import { HappyHourBanner } from "@/components/HappyHourBanner";

export const metadata: Metadata = {
  title: "ECC Panini - Collection",
  description: "ECC Panini - Album de collection de cartes du club",
  icons: {
    icon: [
      { url: "/logo-club.png", type: "image/png" },
      { url: "/logo-club.png", sizes: "32x32", type: "image/png" },
      { url: "/logo-club.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/logo-club.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className={styles.shell}>
          <Header />
          <HappyHourBanner />
          <main className={styles.main}>{children}</main>
          <NotificationBanner />
        </div>
      </body>
    </html>
  );
}
