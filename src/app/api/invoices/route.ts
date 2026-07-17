import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mockStore } from '@/lib/mock-db-store';

export async function POST(req: NextRequest) {
  try {
    const {
      contractInvoiceId,
      businessWallet,
      debtorName,
      debtorEmail,
      amount,
      fundingGoal,
      interestRate,
      dueDate,
      pdfUrl,
      txHash,
    } = await req.json();

    if (!contractInvoiceId || !businessWallet || !debtorName || !amount || !fundingGoal || !dueDate) {
      return NextResponse.json({ error: 'Missing required invoice parameters' }, { status: 400 });
    }

    try {
      let business = await prisma.user.findUnique({ where: { walletAddress: businessWallet } });
      if (!business) {
        business = await prisma.user.create({ data: { walletAddress: businessWallet, role: 'BUSINESS' } });
      }

      const invoice = await prisma.invoice.create({
        data: {
          contractInvoiceId,
          businessId: business.id,
          debtorName,
          debtorEmail: debtorEmail || '',
          amount: parseFloat(amount),
          fundingGoal: parseFloat(fundingGoal),
          currentFunding: 0,
          interestRate: parseFloat(interestRate),
          dueDate: new Date(dueDate),
          status: 'PUBLISHED',
          pdfUrl: pdfUrl || null,
          txHash: txHash || null,
        },
      });

      return NextResponse.json(invoice);
    } catch (dbError) {
      console.warn('Prisma create invoice failed, falling back to mock:', dbError);

      let mockBiz = mockStore.users.find(u => u.walletAddress === businessWallet);
      if (!mockBiz) {
        mockBiz = {
          id: `usr-${Math.random().toString(36).substring(2, 9)}`,
          walletAddress: businessWallet,
          role: 'BUSINESS',
          name: 'Apex Innovations Mock',
          email: 'finance@apexmock.com',
          createdAt: new Date(),
        };
        mockStore.users.push(mockBiz);
      }

      const mockInvoice = {
        id: `inv-${Math.random().toString(36).substring(2, 9)}`,
        contractInvoiceId,
        businessId: mockBiz.id,
        businessWallet,
        debtorName,
        debtorEmail: debtorEmail || '',
        amount: parseFloat(amount),
        fundingGoal: parseFloat(fundingGoal),
        currentFunding: 0,
        interestRate: parseFloat(interestRate),
        dueDate: new Date(dueDate),
        status: 'PUBLISHED' as const,
        pdfUrl: pdfUrl || null,
        txHash: txHash || null,
        createdAt: new Date(),
      };
      mockStore.invoices.push(mockInvoice);
      return NextResponse.json(mockInvoice);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const businessWallet = searchParams.get('businessWallet');

    try {
      const where: any = {};
      if (status) {
        where.status = status;
      }
      if (businessWallet) {
        where.business = { walletAddress: businessWallet };
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: { business: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(invoices);
    } catch {
      let list = [...mockStore.invoices];
      if (status) {
        list = list.filter(inv => inv.status === status);
      }
      if (businessWallet) {
        list = list.filter(inv => inv.businessWallet === businessWallet);
      }

      const mappedList = list.map(inv => {
        const biz = mockStore.users.find(u => u.id === inv.businessId || u.walletAddress === inv.businessWallet);
        return {
          ...inv,
          business: biz || { walletAddress: inv.businessWallet, role: 'BUSINESS' },
        };
      });
      return NextResponse.json(mappedList);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
