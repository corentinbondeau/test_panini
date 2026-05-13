import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.css";
import { Header } from "@/components/Header";
import Head from "next/head";

export const metadata: Metadata = {
  title: "ECC Panini - Collection",
  description: "Album de collection avec gestion des doubles et préparation aux échanges."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <Head>
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
        <title>ECC Panini - Collection</title>
        <meta name="description" content="Album de collection avec gestion des doubles et préparation aux échanges." />
      </Head>
      <body>
        <div className={styles.shell}>
          <Header />
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
