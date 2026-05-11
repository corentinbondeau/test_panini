export type CardRole = "joueur" | "coach" | "dirigeant";

export type Card = {
  id: string;
  name: string;
  role: CardRole;
  category: string;
  number: number;
  team: string;
  photo: string;
};
