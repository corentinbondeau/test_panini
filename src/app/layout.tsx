import type { Metadata } from "next";
import "./globals.css";
import styles from "./layout.module.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "ECC Panini - Collection",
  description: "Album de collection avec gestion des doubles et préparation aux échanges."
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
