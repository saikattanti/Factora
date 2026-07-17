import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mockStore } from '@/lib/mock-db-store';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, role } = await req.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    // Try Prisma DB first
    try {
      let user = await prisma.user.findUnique({
        where: { walletAddress },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            walletAddress,
            role: role || 'INVESTOR',
          },
        });
      }

      return NextResponse.json(user);
    } catch (dbError) {
      console.warn('Prisma Database failed, falling back to mockStore:', dbError);
      
      // Fallback: Check mock store
      let mockUser = mockStore.users.find(u => u.walletAddress === walletAddress);
      
      if (!mockUser) {
        mockUser = {
          id: `usr-${Math.random().toString(36).substring(2, 9)}`,
          walletAddress,
          role: role || 'INVESTOR',
          name: walletAddress.substring(0, 6) + '...' + walletAddress.substring(50),
          email: null,
          createdAt: new Date(),
        };
        mockStore.users.push(mockUser);
      }

      return NextResponse.json(mockUser);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(users);
    } catch {
      // Fallback
      return NextResponse.json(mockStore.users);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
