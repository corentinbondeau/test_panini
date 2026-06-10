import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cette adresse email est déjà utilisée.' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role: 'member',
      },
    });

    const defaultCollection = await prisma.collection.findUnique({
      where: { slug: "s25-26" },
    });

    if (defaultCollection) {
      await prisma.userCollection.create({
        data: {
          userId: user.id,
          collectionId: defaultCollection.id,
        },
      });
    }

    const token = generateToken(user.id);

    return NextResponse.json(
      {
        message: 'Inscription réussie',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          role: user.role,
          tokens: 0,
          totalCardsObtained: 0,
          showcase: [],
          unlockedCardBacks: ['default'],
          activeCardBack: 'default',
          charms: 0,
          dust: 0,
          isPublicAlbum: false,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}
