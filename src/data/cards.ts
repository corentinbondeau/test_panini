export type CardRole = "joueur" | "coach" | "dirigeant";

export type Card = {
  id: string;
  firstName: string;
  lastName: string;
  role: CardRole;
  category: string;
  number: number;
  team: string;
  photo: string;
};
