import { Card, CardRole } from "../src/data/cards";

const TOTAL_CARDS = 442;
const ROLE_DISTRIBUTION: Array<{ role: CardRole; count: number; prefix: string }> = [
  { role: "joueur", count: 300, prefix: "Joueur" },
  { role: "coach", count: 80, prefix: "Coach" },
  { role: "dirigeant", count: 62, prefix: "Dirigeant" }
];

const PLAYER_CATEGORIES = ["U9", "U11", "U13", "U15", "U17", "U19", "Senior"];

const rolePhoto = (role: CardRole): string => `/images/roles/${role}.svg`;
const roleCategory = (role: CardRole, indexWithinRole: number): string => {
  if (role === "joueur") {
    return PLAYER_CATEGORIES[(indexWithinRole - 1) % PLAYER_CATEGORIES.length];
  }
  if (role === "coach") return "Coach";
  return "Dirigeant";
};

export const seedClubCards = (): Card[] => {
  const cards: Card[] = [];
  let absolute = 1;

  ROLE_DISTRIBUTION.forEach(({ role, count, prefix }) => {
    for (let i = 1; i <= count; i += 1) {
      cards.push({
        id: `${role}-${i.toString().padStart(3, "0")}`,
        name: `${prefix} ${i}`,
        role,
        category: roleCategory(role, i),
        number: absolute,
        team: "FC Panini",
        photo: rolePhoto(role)
      });
      absolute += 1;
    }
  });

  if (cards.length !== TOTAL_CARDS) {
    throw new Error(`Le seed doit contenir ${TOTAL_CARDS} cartes, trouvé ${cards.length}.`);
  }

  return cards;
};

if (require.main === module) {
  const cards = seedClubCards();
  console.log(`Seed prêt: ${cards.length} cartes`);
}
