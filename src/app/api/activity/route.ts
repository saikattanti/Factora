import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mockStore } from '@/lib/mock-db-store';

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, action, details } = await req.json();

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    try {
      let user = await prisma.user.findUnique({ where: { walletAddress } });
      if (!user) {
        user = await prisma.user.create({ data: { walletAddress, role: 'INVESTOR' } });
      }

      const log = await prisma.activityLog.create({
        data: {
          userId: user.id,
          action,
          details,
        },
      });
      return NextResponse.json(log);
    } catch (dbError) {
      console.warn('Prisma activity logger failed, falling back to mock:', dbError);
      
      let mockUser = mockStore.users.find(u => u.walletAddress === walletAddress);
      if (!mockUser) {
        mockUser = {
          id: `usr-${Math.random().toString(36).substring(2, 9)}`,
          walletAddress,
          role: 'INVESTOR',
          name: walletAddress.substring(0, 6) + '...' + walletAddress.substring(50),
          email: null,
          createdAt: new Date(),
        };
        mockStore.users.push(mockUser);
      }

      const mockLog = {
        id: `act-${Math.random().toString(36).substring(2, 9)}`,
        userId: mockUser.id,
        userWallet: walletAddress,
        action,
        details,
        createdAt: new Date(),
      };
      mockStore.activityLogs.unshift(mockLog);
      return NextResponse.json(mockLog);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    try {
      const logs = await prisma.activityLog.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return NextResponse.json(logs);
    } catch {
      const mappedLogs = mockStore.activityLogs.map(log => {
        const user = mockStore.users.find(u => u.id === log.userId || u.walletAddress === log.userWallet);
        return {
          ...log,
          user: user || { walletAddress: log.userWallet, role: 'INVESTOR' },
        };
      });
      return NextResponse.json(mappedLogs);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
