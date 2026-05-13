import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { MAX_TRADES_PER_DAY } from '@/lib/quota';
import { ALL_CLUB_CARDS } from '@/data/clubCards';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { code } = await params;
    const { cardGivenId } = await request.json();

    if (!cardGivenId) {
      return NextResponse.json({ error: 'cardGivenId requis' }, { status: 400 });
    }

    const joinerId = decoded.userId;

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.tradeSession.findUnique({ where: { code: code.toUpperCase() } });

      if (!session) {
        throw { status: 404, message: 'Code invalide' };
      }

      if (session.status !== 'OPEN') {
        throw { status: 400, message: 'Cette session n\'est plus ouverte' };
      }

      if (session.creatorId === joinerId) {
        throw { status: 400, message: 'Vous ne pouvez pas échanger avec vous-même' };
      }

      // Check expiration
      const age = Date.now() - session.createdAt.getTime();
      if (age > 60 * 60 * 1000) {
        await tx.tradeSession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
        throw { status: 410, message: 'Code expiré' };
      }

      // Check & reset quotas for both users
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [creator, joiner] = await Promise.all([
        tx.user.findUnique({ where: { id: session.creatorId } }),
        tx.user.findUnique({ where: { id: joinerId } }),
      ]);

      if (!creator || !joiner) {
        throw { status: 404, message: 'Utilisateur introuvable' };
      }

      // Reset quotas if needed
      for (const user of [creator, joiner]) {
        const lastReset = user.lastResetDate;
        const isSameDay = lastReset &&
          lastReset.getFullYear() === now.getFullYear() &&
          lastReset.getMonth() === now.getMonth() &&
          lastReset.getDate() === now.getDate();
        if (!isSameDay) {
          await tx.user.update({
            where: { id: user.id },
            data: { tradesMadeToday: 0, lastResetDate: todayStart },
          });
        }
      }

      // Re-fetch with potentially reset counts
      const [freshCreator, freshJoiner] = await Promise.all([
        tx.user.findUnique({ where: { id: session.creatorId } }),
        tx.user.findUnique({ where: { id: joinerId } }),
      ]);

      if ((freshCreator?.tradesMadeToday ?? 0) >= MAX_TRADES_PER_DAY) {
        throw { status: 429, message: 'Le créateur a atteint sa limite quotidienne (5/jour)' };
      }
      if ((freshJoiner?.tradesMadeToday ?? 0) >= MAX_TRADES_PER_DAY) {
        throw { status: 429, message: 'Vous avez atteint votre limite quotidienne (5/jour)' };
      }

      // Resolve collection slugs
      const offeredCard = ALL_CLUB_CARDS.find(c => c.id === session.cardOfferedId);
      const givenCard = ALL_CLUB_CARDS.find(c => c.id === cardGivenId);

      if (!offeredCard) {
        throw { status: 400, message: 'Carte proposée introuvable' };
      }
      if (!givenCard) {
        throw { status: 400, message: 'Carte donnée introuvable' };
      }

      // Get collection ObjectIds
      const [offeredColl, givenColl] = await Promise.all([
        tx.collection.findUnique({ where: { slug: offeredCard.collectionId } }),
        tx.collection.findUnique({ where: { slug: givenCard.collectionId } }),
      ]);

      if (!offeredColl || !givenColl) {
        throw { status: 500, message: 'Collection introuvable' };
      }

      // Helper to get or create UserCollection
      async function getOrCreateUC(uid: string, collId: string) {
        let uc = await tx.userCollection.findUnique({
          where: { userId_collectionId: { userId: uid, collectionId: collId } },
        });
        if (!uc) {
          uc = await tx.userCollection.create({
            data: { userId: uid, collectionId: collId, cards: {} },
          });
        }
        return uc;
      }

      // Get both UserCollections for each user
      const creatorOfferedUC = await getOrCreateUC(session.creatorId, offeredColl.id);
      const creatorGivenUC = offeredColl.id === givenColl.id
        ? creatorOfferedUC
        : await getOrCreateUC(session.creatorId, givenColl.id);

      const joinerOfferedUC = offeredColl.id === givenColl.id
        ? await getOrCreateUC(joinerId, offeredColl.id)
        : await getOrCreateUC(joinerId, offeredColl.id);
      const joinerGivenUC = offeredColl.id === givenColl.id
        ? joinerOfferedUC
        : await getOrCreateUC(joinerId, givenColl.id);

      // Parse current card quantities
      const creatorOfferedCards = (creatorOfferedUC.cards as Record<string, number>) || {};
      const creatorGivenCards = offeredColl.id === givenColl.id
        ? creatorOfferedCards
        : (creatorGivenUC.cards as Record<string, number>) || {};

      const joinerOfferedCards = (joinerOfferedUC.cards as Record<string, number>) || {};
      const joinerGivenCards = offeredColl.id === givenColl.id
        ? joinerOfferedCards
        : (joinerGivenUC.cards as Record<string, number>) || {};

      // Verify creator has the offered card
      if ((creatorOfferedCards[session.cardOfferedId] ?? 0) < 1) {
        throw { status: 400, message: 'Le créateur ne possède plus cette carte' };
      }

      // Verify joiner has the given card
      if ((joinerGivenCards[cardGivenId] ?? 0) < 1) {
        throw { status: 400, message: 'Vous ne possédez pas cette carte' };
      }

      // Perform transfers
      // Creator loses offeredCard, gains givenCard
      const newCreatorOffered = { ...creatorOfferedCards };
      newCreatorOffered[session.cardOfferedId] = (newCreatorOffered[session.cardOfferedId] ?? 0) - 1;
      if (newCreatorOffered[session.cardOfferedId] <= 0) delete newCreatorOffered[session.cardOfferedId];

      let newCreatorGiven: Record<string, number>;
      if (offeredColl.id === givenColl.id) {
        newCreatorGiven = newCreatorOffered;
      } else {
        newCreatorGiven = { ...creatorGivenCards };
      }
      newCreatorGiven[cardGivenId] = (newCreatorGiven[cardGivenId] ?? 0) + 1;

      // Joiner loses givenCard, gains offeredCard
      const newJoinerGiven = { ...joinerGivenCards };
      newJoinerGiven[cardGivenId] = (newJoinerGiven[cardGivenId] ?? 0) - 1;
      if (newJoinerGiven[cardGivenId] <= 0) delete newJoinerGiven[cardGivenId];

      let newJoinerOffered: Record<string, number>;
      if (offeredColl.id === givenColl.id) {
        newJoinerOffered = newJoinerGiven;
      } else {
        newJoinerOffered = { ...joinerOfferedCards };
      }
      newJoinerOffered[session.cardOfferedId] = (newJoinerOffered[session.cardOfferedId] ?? 0) + 1;

      // Save all UserCollection updates
      await tx.userCollection.update({
        where: { id: creatorOfferedUC.id },
        data: { cards: newCreatorOffered },
      });

      if (creatorGivenUC.id !== creatorOfferedUC.id) {
        await tx.userCollection.update({
          where: { id: creatorGivenUC.id },
          data: { cards: newCreatorGiven },
        });
      }

      await tx.userCollection.update({
        where: { id: joinerGivenUC.id },
        data: { cards: newJoinerGiven },
      });

      if (joinerOfferedUC.id !== joinerGivenUC.id) {
        await tx.userCollection.update({
          where: { id: joinerOfferedUC.id },
          data: { cards: newJoinerOffered },
        });
      }

      // Increment trade counts
      await tx.user.update({
        where: { id: session.creatorId },
        data: { tradesMadeToday: { increment: 1 } },
      });

      await tx.user.update({
        where: { id: joinerId },
        data: { tradesMadeToday: { increment: 1 } },
      });

      // Mark session COMPLETED
      await tx.tradeSession.update({
        where: { id: session.id },
        data: { status: 'COMPLETED' },
      });

      return {
        offeredCard: { id: offeredCard.id, firstName: offeredCard.firstName, lastName: offeredCard.lastName },
        givenCard: { id: givenCard.id, firstName: givenCard.firstName, lastName: givenCard.lastName },
      };
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status) {
      return NextResponse.json({ error: err.message || 'Erreur' }, { status: err.status });
    }
    console.error('Join trade session error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la finalisation de l\'échange' },
      { status: 500 }
    );
  }
}
