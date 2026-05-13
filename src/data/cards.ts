export type CardRole = "joueur" | "coach" | "dirigeant";

export type CardRarity = "commune";

export type Card = {
  id: string;
  firstName: string;
  lastName: string;
  role: CardRole;
  category: string;
  number: number;
  team: string;
  photo: string;
  rarity: CardRarity;
  collectionId: string;
  imageUrl?: string | null;
};

export type CollectionInfo = {
  id: string;
  name: string;
};

export const COLLECTIONS: CollectionInfo[] = [
  { id: "s25-26", name: "Saison 25-26" },
  { id: "s26-27", name: "Saison 26-27" },
];

export const DEFAULT_COLLECTION_ID = "s25-26";
export const ALL_COLLECTIONS_ID = "all";
