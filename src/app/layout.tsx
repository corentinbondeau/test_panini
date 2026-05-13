import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "ECC Panini - Collection",
  description: "ECC Panini - Album de collection de cartes du club",
  icons: {
    icon: [
      { url: "/logo.jpg", type: "image/jpeg" },
      { url: "/logo.jpg", sizes: "32x32", type: "image/jpeg" },
      { url: "/logo.jpg", sizes: "96x96", type: "image/jpeg" },
    ],
    apple: [{ url: "/logo.jpg", sizes: "180x180", type: "image/jpeg" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className={styles.shell}>
          <Header />
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
