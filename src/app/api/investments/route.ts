import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mockStore } from '@/lib/mock-db-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const investorWallet = searchParams.get('investorWallet');

    if (!investorWallet) {
      return NextResponse.json({ error: 'Investor wallet required' }, { status: 400 });
    }

    try {
      const investments = await prisma.investment.findMany({
        where: {
          investor: { walletAddress: investorWallet },
        },
        include: {
          invoice: {
            include: { business: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(investments);
    } catch {
      // Fallback: Filter mock investments by wallet
      const filtered = mockStore.investments.filter(i => i.investorWallet === investorWallet);
      
      const mapped = filtered.map(invst => {
        const invoice = mockStore.invoices.find(inv => inv.id === invst.invoiceId);
        const business = invoice ? mockStore.users.find(u => u.id === invoice.businessId) : null;
        
        return {
          ...invst,
          invoice: invoice ? {
            ...invoice,
            business: business || { walletAddress: invoice.businessWallet, role: 'BUSINESS' },
          } : null,
        };
      });

      return NextResponse.json(mapped);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
