import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "ECC Panini - Collection",
  description: "Album de collection avec gestion des doubles et préparation aux échanges."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div className={styles.shell}>
          <header className={styles.header}>
            <h1>ECC Panini</h1>
            <nav>
              <Link href="/">Accueil</Link>
              <Link href="/booster">Booster</Link>
              <Link href="/album">Album</Link>
              <Link href="/doubles">Mes Doubles</Link>
            </nav>
          </header>
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
