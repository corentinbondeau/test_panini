import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const QUEST_POOL: Array<{ key: string; title: string; description: string; target: number; type: string; params: Record<string, string | number> }> = [
  // === BOOSTER QUESTS (15) ===
  { key: 'open_booster_1', title: 'Petit ouvreur', description: 'Ouvre 1 booster', target: 1, type: 'OPEN_BOOSTER', params: {} },
  { key: 'open_booster_3', title: 'Collectionneur du jour', description: 'Ouvre 3 boosters', target: 3, type: 'OPEN_BOOSTER', params: {} },
  { key: 'open_booster_5', title: 'Habitué des boosters', description: 'Ouvre 5 boosters', target: 5, type: 'OPEN_BOOSTER', params: {} },
  { key: 'open_booster_10', title: 'Dévoreur de boosters', description: 'Ouvre 10 boosters', target: 10, type: 'OPEN_BOOSTER', params: {} },
  { key: 'open_booster_s25', title: 'Boosters 25-26', description: 'Ouvre 3 boosters de la saison 25-26', target: 3, type: 'OPEN_BOOSTER', params: { collection: 's25-26' } },
  { key: 'open_booster_happy', title: 'Happy Hour', description: 'Ouvre un booster pendant l\'Happy Hour', target: 1, type: 'HAPPY_HOUR_BOOSTER', params: {} },
  { key: 'open_booster_matin', title: 'Lève-tôt', description: 'Ouvre un booster avant midi', target: 1, type: 'MORNING_BOOSTER', params: {} },
  { key: 'open_booster_soir', title: 'Collectionneur nocturne', description: 'Ouvre un booster après 20h', target: 1, type: 'EVENING_BOOSTER', params: {} },
  { key: 'open_booster_2', title: 'Double portion', description: 'Ouvre 2 boosters', target: 2, type: 'OPEN_BOOSTER', params: {} },
  { key: 'open_booster_7', title: 'Semaine de collections', description: 'Ouvre 7 boosters', target: 7, type: 'OPEN_BOOSTER', params: {} },
  { key: 'open_booster_15', title: 'Master booster', description: 'Ouvre 15 boosters', target: 15, type: 'OPEN_BOOSTER', params: {} },
  { key: 'open_booster_rapide', title: 'Ouverture express', description: 'Ouvre 2 boosters en moins de 5 minutes', target: 2, type: 'QUICK_BOOSTER', params: {} },
  { key: 'open_booster_consec_3', title: 'Série de boosters', description: 'Ouvre 3 boosters d\'affilée', target: 3, type: 'CONSECUTIVE_BOOSTER', params: {} },
  { key: 'open_booster_consec_5', title: 'Rafale de boosters', description: 'Ouvre 5 boosters d\'affilée', target: 5, type: 'CONSECUTIVE_BOOSTER', params: {} },
  { key: 'open_booster_legendary_hunt', title: 'Chasse aux légendes', description: 'Ouvre 10 boosters en un jour', target: 10, type: 'OPEN_BOOSTER', params: {} },

  // === RECYCLE QUESTS (12) ===
  { key: 'recycle_1', title: 'Recycleur débutant', description: 'Recycle 1 carte', target: 1, type: 'RECYCLE_CARD', params: {} },
  { key: 'recycle_3', title: 'Petit recycleur', description: 'Recycle 3 cartes', target: 3, type: 'RECYCLE_CARD', params: {} },
  { key: 'recycle_5', title: 'Recycleur du jour', description: 'Recycle 5 cartes', target: 5, type: 'RECYCLE_CARD', params: {} },
  { key: 'recycle_10', title: 'Grand recycleur', description: 'Recycle 10 cartes', target: 10, type: 'RECYCLE_CARD', params: {} },
  { key: 'recycle_commune', title: 'Tri sélectif', description: 'Recycle 5 cartes communes', target: 5, type: 'RECYCLE_RARITY', params: { rarity: 'COMMUNE' } },
  { key: 'recycle_rare', title: 'Recycleur de raretés', description: 'Recycle 3 cartes rares', target: 3, type: 'RECYCLE_RARITY', params: { rarity: 'RARE' } },
  { key: 'recycle_bulk', title: 'En masse !', description: 'Recycle 15 cartes en une fois', target: 15, type: 'RECYCLE_CARD', params: {} },
  { key: 'recycle_commune_10', title: 'Nettoyeur de communes', description: 'Recycle 10 cartes communes', target: 10, type: 'RECYCLE_RARITY', params: { rarity: 'COMMUNE' } },
  { key: 'recycle_all', title: 'Recyclage intensif', description: 'Recycle 20 cartes', target: 20, type: 'RECYCLE_CARD', params: {} },
  { key: 'recycle_25', title: 'Maître du recyclage', description: 'Recycle 25 cartes', target: 25, type: 'RECYCLE_CARD', params: {} },
  { key: 'recycle_rare_5', title: 'Chasseur de rares', description: 'Recycle 5 cartes rares', target: 5, type: 'RECYCLE_RARITY', params: { rarity: 'RARE' } },
  { key: 'recycle_streak', title: 'Recycleur en série', description: 'Recycle au moins 1 carte 3 jours de suite', target: 3, type: 'RECYCLE_STREAK', params: {} },

  // === RARITY QUESTS (14) ===
  { key: 'obtain_rare_1', title: 'Une petite rare', description: 'Obtiens 1 carte rare', target: 1, type: 'OBTAIN_RARITY', params: { rarity: 'RARE' } },
  { key: 'obtain_rare_3', title: 'Collection de rares', description: 'Obtiens 3 cartes rares', target: 3, type: 'OBTAIN_RARITY', params: { rarity: 'RARE' } },
  { key: 'obtain_rare_5', title: 'Amateur de raretés', description: 'Obtiens 5 cartes rares', target: 5, type: 'OBTAIN_RARITY', params: { rarity: 'RARE' } },
  { key: 'obtain_legendary_1', title: 'Légende en devenir', description: 'Obtiens 1 carte légendaire', target: 1, type: 'OBTAIN_RARITY', params: { rarity: 'LEGENDAIRE' } },
  { key: 'obtain_legendary_2', title: 'Chasseur de légendes', description: 'Obtiens 2 cartes légendaires', target: 2, type: 'OBTAIN_RARITY', params: { rarity: 'LEGENDAIRE' } },
  { key: 'obtain_commune_5', title: 'Basiques mais utiles', description: 'Obtiens 5 cartes communes', target: 5, type: 'OBTAIN_RARITY', params: { rarity: 'COMMUNE' } },
  { key: 'obtain_commune_10', title: 'Collection de communes', description: 'Obtiens 10 cartes communes', target: 10, type: 'OBTAIN_RARITY', params: { rarity: 'COMMUNE' } },
  { key: 'obtain_shiny_1', title: 'Brillant !', description: 'Obtiens 1 carte shiny par fusion', target: 1, type: 'FUSE_CARD', params: {} },
  { key: 'obtain_shiny_2', title: 'Duo brillant', description: 'Obtiens 2 cartes shiny par fusion', target: 2, type: 'FUSE_CARD', params: {} },
  { key: 'obtain_shiny_3', title: 'Trésor scintillant', description: 'Obtiens 3 cartes shiny', target: 3, type: 'FUSE_CARD', params: {} },
  { key: 'obtain_rare_commune', title: 'Mix de raretés', description: 'Obtiens 2 rares et 3 communes', target: 1, type: 'OBTAIN_MIX', params: { rare: 2, common: 3 } },
  { key: 'obtain_any_10', title: 'Dix nouvelles cartes', description: 'Obtiens 10 nouvelles cartes', target: 10, type: 'OBTAIN_NEW', params: {} },
  { key: 'obtain_any_20', title: 'Vingtaine de cartes', description: 'Obtiens 20 nouvelles cartes', target: 20, type: 'OBTAIN_NEW', params: {} },
  { key: 'obtain_any_5_collection', title: 'Cinq nouvelles', description: 'Obtiens 5 nouvelles cartes', target: 5, type: 'OBTAIN_NEW', params: {} },

  // === UNIQUE COUNT (8) ===
  { key: 'unique_10', title: 'Petite collection', description: 'Atteins 10 cartes uniques', target: 10, type: 'UNIQUE_COUNT', params: {} },
  { key: 'unique_25', title: 'Quart de l\'album', description: 'Atteins 25 cartes uniques', target: 25, type: 'UNIQUE_COUNT', params: {} },
  { key: 'unique_50', title: 'Moitié d\'album', description: 'Atteins 50 cartes uniques', target: 50, type: 'UNIQUE_COUNT', params: {} },
  { key: 'unique_75', title: 'Presque complet !', description: 'Atteins 75 cartes uniques', target: 75, type: 'UNIQUE_COUNT', params: {} },
  { key: 'unique_100', title: 'Album complet !', description: 'Atteins 100 cartes uniques', target: 100, type: 'UNIQUE_COUNT', params: {} },
  { key: 'unique_150', title: 'Collection massive', description: 'Atteins 150 cartes uniques', target: 150, type: 'UNIQUE_COUNT', params: {} },
  { key: 'unique_200', title: 'Légende vivante', description: 'Atteins 200 cartes uniques', target: 200, type: 'UNIQUE_COUNT', params: {} },
  { key: 'unique_progress_10', title: 'Progression', description: 'Augmente ta collection de 10 cartes uniques', target: 10, type: 'UNIQUE_PROGRESS', params: {} },

  // === MARKETPLACE QUESTS (8) ===
  { key: 'market_buy_1', title: 'Premier achat', description: 'Achète 1 carte sur le marché', target: 1, type: 'MARKET_BUY', params: {} },
  { key: 'market_buy_3', title: 'Client régulier', description: 'Achète 3 cartes sur le marché', target: 3, type: 'MARKET_BUY', params: {} },
  { key: 'market_buy_5', title: 'Acheteur compulsif', description: 'Achète 5 cartes sur le marché', target: 5, type: 'MARKET_BUY', params: {} },
  { key: 'market_sell_1', title: 'Première vente', description: 'Vends 1 carte sur le marché', target: 1, type: 'MARKET_SELL', params: {} },
  { key: 'market_sell_3', title: 'Marchand du temple', description: 'Vends 3 cartes sur le marché', target: 3, type: 'MARKET_SELL', params: {} },
  { key: 'market_sell_5', title: 'Homme d\'affaires', description: 'Vends 5 cartes sur le marché', target: 5, type: 'MARKET_SELL', params: {} },
  { key: 'market_earn_50', title: 'Petit bénéfice', description: 'Gagne 50 tokens sur le marché', target: 50, type: 'MARKET_EARN', params: {} },
  { key: 'market_earn_100', title: 'Gros bénéfice', description: 'Gagne 100 tokens sur le marché', target: 100, type: 'MARKET_EARN', params: {} },

  // === EXCHANGE / TRADE QUESTS (6) ===
  { key: 'trade_1', title: 'Premier échange', description: 'Effectue 1 échange avec un autre joueur', target: 1, type: 'TRADE_COUNT', params: {} },
  { key: 'trade_3', title: 'Commerçant', description: 'Effectue 3 échanges', target: 3, type: 'TRADE_COUNT', params: {} },
  { key: 'trade_5', title: 'Roi du troc', description: 'Effectue 5 échanges', target: 5, type: 'TRADE_COUNT', params: {} },
  { key: 'trade_session_1', title: 'Session de trade', description: 'Crée ou rejoins 1 session d\'échange', target: 1, type: 'TRADE_SESSION', params: {} },
  { key: 'trade_session_3', title: 'Habitué des trades', description: 'Participe à 3 sessions d\'échange', target: 3, type: 'TRADE_SESSION', params: {} },
  { key: 'trade_rare', title: 'Échange de prestige', description: 'Échange une carte rare ou légendaire', target: 1, type: 'TRADE_RARE', params: {} },

  // === SHOWCASE / ALBUM QUESTS (6) ===
  { key: 'showcase_pin_1', title: 'Vitrine personnelle', description: 'Épingle 1 carte dans ta vitrine', target: 1, type: 'SHOWCASE_PIN', params: {} },
  { key: 'showcase_pin_3', title: 'Vitrine garnie', description: 'Épingle 3 cartes dans ta vitrine', target: 3, type: 'SHOWCASE_PIN', params: {} },
  { key: 'showcase_pin_5', title: 'Vitrine complète', description: 'Épingle 5 cartes dans ta vitrine', target: 5, type: 'SHOWCASE_PIN', params: {} },
  { key: 'album_public', title: 'Album public', description: 'Active l\'album public', target: 1, type: 'ALBUM_PUBLIC', params: {} },
  { key: 'album_visit_1', title: 'Visite guidée', description: 'Reçois 1 visite sur ton album public', target: 1, type: 'ALBUM_VISIT', params: {} },
  { key: 'album_visit_5', title: 'Célébrité', description: 'Reçois 5 visites sur ton album public', target: 5, type: 'ALBUM_VISIT', params: {} },

  // === CLAN QUESTS (8) ===
  { key: 'clan_join', title: 'Esprit d\'équipe', description: 'Rejoins ou crée un clan', target: 1, type: 'CLAN_JOIN', params: {} },
  { key: 'clan_donate_1', title: 'Donateur', description: 'Fais 1 don dans ton clan', target: 1, type: 'CLAN_DONATE', params: {} },
  { key: 'clan_donate_3', title: 'Généreux', description: 'Fais 3 dons dans ton clan', target: 3, type: 'CLAN_DONATE', params: {} },
  { key: 'clan_donate_5', title: 'Philanthrope', description: 'Fais 5 dons dans ton clan', target: 5, type: 'CLAN_DONATE', params: {} },
  { key: 'clan_chest', title: 'Coffre de clan', description: 'Ouvre le coffre de clan', target: 1, type: 'CLAN_CHEST', params: {} },
  { key: 'clan_xp_50', title: 'XP de clan', description: 'Gagne 50 XP pour ton clan', target: 50, type: 'CLAN_XP', params: {} },
  { key: 'clan_xp_100', title: 'Moteur du clan', description: 'Gagne 100 XP pour ton clan', target: 100, type: 'CLAN_XP', params: {} },
  { key: 'clan_request_fulfill', title: 'Entraide', description: 'Réponds à 1 demande de carte dans ton clan', target: 1, type: 'CLAN_FULFILL', params: {} },

  // === STREAK / CONNEXION (6) ===
  { key: 'streak_3', title: 'Régulier', description: 'Atteins 3 jours de connexion consécutifs', target: 3, type: 'STREAK_DAYS', params: {} },
  { key: 'streak_5', title: 'Assidu', description: 'Atteins 5 jours de connexion consécutifs', target: 5, type: 'STREAK_DAYS', params: {} },
  { key: 'streak_7', title: 'Semaine complète', description: 'Atteins 7 jours de connexion consécutifs', target: 7, type: 'STREAK_DAYS', params: {} },
  { key: 'streak_14', title: 'Collectionneur acharné', description: 'Atteins 14 jours de connexion consécutifs', target: 14, type: 'STREAK_DAYS', params: {} },
  { key: 'streak_30', title: 'Mois complet !', description: 'Atteins 30 jours de connexion consécutifs', target: 30, type: 'STREAK_DAYS', params: {} },
  { key: 'login_connect', title: 'Connexion du jour', description: 'Connecte-toi au jeu', target: 1, type: 'DAILY_LOGIN', params: {} },

  // === TOKEN / ECONOMY (5) ===
  { key: 'token_save_20', title: 'Économie', description: 'Économise 20 tokens', target: 20, type: 'TOKEN_SAVE', params: {} },
  { key: 'token_save_50', title: 'Trésor personnel', description: 'Économise 50 tokens', target: 50, type: 'TOKEN_SAVE', params: {} },
  { key: 'token_save_100', title: 'Banquier', description: 'Économise 100 tokens', target: 100, type: 'TOKEN_SAVE', params: {} },
  { key: 'token_spend_30', title: 'Dépensier', description: 'Dépense 30 tokens', target: 30, type: 'TOKEN_SPEND', params: {} },
  { key: 'token_spend_50', title: 'Gros dépensier', description: 'Dépense 50 tokens', target: 50, type: 'TOKEN_SPEND', params: {} },

  // === CRAFT / FUSION (6) ===
  { key: 'craft_common', title: 'Artisan débutant', description: 'Crée 1 carte commune avec de la poussière', target: 1, type: 'CRAFT_CARD', params: { rarity: 'COMMUNE' } },
  { key: 'craft_rare', title: 'Artisan confirmé', description: 'Crée 1 carte rare avec de la poussière', target: 1, type: 'CRAFT_CARD', params: { rarity: 'RARE' } },
  { key: 'craft_any_2', title: 'Artisanat', description: 'Crée 2 cartes avec de la poussière', target: 2, type: 'CRAFT_CARD', params: {} },
  { key: 'craft_any_5', title: 'Artisan acharné', description: 'Crée 5 cartes avec de la poussière', target: 5, type: 'CRAFT_CARD', params: {} },
  { key: 'fuse_1', title: 'Fusion', description: 'Fusionne 3 cartes identiques en shiny', target: 1, type: 'FUSE_CARD', params: {} },
  { key: 'fuse_3', title: 'Maître fondeur', description: 'Fusionne 3 cartes en shiny', target: 3, type: 'FUSE_CARD', params: {} },

  // === CHARM / AMULETTE (5) ===
  { key: 'charm_buy', title: 'Amulette', description: 'Achète 1 amulette de chance', target: 1, type: 'CHARM_BUY', params: {} },
  { key: 'charm_use', title: 'Chance', description: 'Utilise 1 amulette de chance', target: 1, type: 'CHARM_USE', params: {} },
  { key: 'charm_use_3', title: 'Très chanceux', description: 'Utilise 3 amulettes de chance', target: 3, type: 'CHARM_USE', params: {} },
  { key: 'charm_buy_3', title: 'Collection d\'amulettes', description: 'Achète 3 amulettes de chance', target: 3, type: 'CHARM_BUY', params: {} },
  { key: 'charm_legendary', title: 'Amulette légendaire', description: 'Obtiens une légendaire avec une amulette active', target: 1, type: 'CHARM_LEGENDARY', params: {} },

  // === MISCELLANEOUS QUESTS (10) ===
  { key: 'badge_unlock', title: 'Badge de collection', description: 'Débloque 1 badge', target: 1, type: 'BADGE_UNLOCK', params: {} },
  { key: 'badge_unlock_3', title: 'Chasseur de badges', description: 'Débloque 3 badges', target: 3, type: 'BADGE_UNLOCK', params: {} },
  { key: 'badge_unlock_5', title: 'Collectionneur de badges', description: 'Débloque 5 badges', target: 5, type: 'BADGE_UNLOCK', params: {} },
  { key: 'login_streak_3', title: 'Fidèle', description: 'Connecte-toi 3 jours de suite', target: 3, type: 'STREAK_DAYS', params: {} },
  { key: 'login_hour_specific', title: 'À la bonne heure', description: 'Connecte-toi entre 18h et 20h', target: 1, type: 'TIME_LOGIN', params: { hourStart: '18', hourEnd: '20' } },
  { key: 'obtain_consecutive_legendary', title: 'Doublé légendaire', description: 'Obtiens 2 légendaires dans la même journée', target: 2, type: 'OBTAIN_RARITY', params: { rarity: 'LEGENDAIRE', sameDay: 1 } },
  { key: 'album_complete_percent_25', title: 'Quart de l\'album', description: 'Atteins 25% de l\'album complet', target: 25, type: 'ALBUM_PERCENT', params: {} },
  { key: 'album_complete_percent_50', title: 'Demi-album', description: 'Atteins 50% de l\'album complet', target: 50, type: 'ALBUM_PERCENT', params: {} },
  { key: 'album_complete_percent_75', title: 'Presque complet !', description: 'Atteins 75% de l\'album complet', target: 75, type: 'ALBUM_PERCENT', params: {} },
  { key: 'album_complete_100', title: 'Album complété !', description: 'Complète l\'album à 100%', target: 100, type: 'ALBUM_PERCENT', params: {} },
];

async function main() {
  console.log(`🌱 Seeding ${QUEST_POOL.length} quests into QuestPool...`);

  for (const q of QUEST_POOL) {
    await prisma.questPool.upsert({
      where: { key: q.key },
      update: {
        title: q.title,
        description: q.description,
        target: q.target,
        type: q.type,
        params: q.params,
      },
      create: {
        key: q.key,
        title: q.title,
        description: q.description,
        target: q.target,
        type: q.type,
        params: q.params,
      },
    });
  }

  console.log(`✅ ${QUEST_POOL.length} quêtes insérées avec succès !`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Erreur lors du seed :', e);
  prisma.$disconnect();
  process.exit(1);
});
