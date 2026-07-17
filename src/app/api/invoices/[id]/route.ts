import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mockStore } from '@/lib/mock-db-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          business: true,
          investments: {
            include: { investor: true },
          },
        },
      });

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      return NextResponse.json(invoice);
    } catch {
      // Fallback
      const invoice = mockStore.invoices.find((inv) => inv.id === id || inv.contractInvoiceId === id);
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const biz = mockStore.users.find((u) => u.id === invoice.businessId);
      const investments = mockStore.investments
        .filter((invst) => invst.invoiceId === invoice.id)
        .map((invst) => {
          const investor = mockStore.users.find((u) => u.id === invst.investorId);
          return {
            ...invst,
            investor: investor || { walletAddress: invst.investorWallet, role: 'INVESTOR' },
          };
        });

      return NextResponse.json({
        ...invoice,
        business: biz || { walletAddress: invoice.businessWallet, role: 'BUSINESS' },
        investments,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, investorWallet, payerWallet, amount, txHash } = body;

    try {
      // Find invoice
      const invoice = await prisma.invoice.findUnique({ where: { id } });
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      if (action === 'fund') {
        const fundAmount = parseFloat(amount);
        let investor = await prisma.user.findUnique({ where: { walletAddress: investorWallet } });
        if (!investor) {
          investor = await prisma.user.create({ data: { walletAddress: investorWallet, role: 'INVESTOR' } });
        }

        // Create investment
        await prisma.investment.create({
          data: {
            invoiceId: invoice.id,
            investorId: investor.id,
            amount: fundAmount,
            txHash,
          },
        });

        // Update current funding
        const newFunding = invoice.currentFunding + fundAmount;
        const fullyFunded = newFunding >= invoice.fundingGoal;

        const updated = await prisma.invoice.update({
          where: { id },
          data: {
            currentFunding: newFunding,
            status: fullyFunded ? 'AWAITING_PAYMENT' : 'PARTIALLY_FUNDED',
          },
        });

        // Record global transaction
        await prisma.transaction.create({
          data: {
            txHash: txHash || `mock-tx-${Math.random()}`,
            type: 'FUND',
            amount: fundAmount,
            sender: investorWallet,
            status: 'SUCCESS',
          },
        });

        return NextResponse.json(updated);
      }

      if (action === 'pay') {
        const updated = await prisma.invoice.update({
          where: { id },
          data: { status: 'PAID' },
        });

        const interestAmount = (invoice.fundingGoal * invoice.interestRate) / 100;
        const totalRepay = invoice.fundingGoal + interestAmount;

        await prisma.transaction.create({
          data: {
            txHash: txHash || `mock-tx-${Math.random()}`,
            type: 'REPAY',
            amount: totalRepay,
            sender: payerWallet || invoice.businessId,
            status: 'SUCCESS',
          },
        });

        return NextResponse.json(updated);
      }

      if (action === 'cancel') {
        const updated = await prisma.invoice.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });

        await prisma.transaction.create({
          data: {
            txHash: txHash || `mock-tx-${Math.random()}`,
            type: 'CANCEL',
            amount: invoice.currentFunding,
            sender: invoice.businessId,
            status: 'SUCCESS',
          },
        });

        return NextResponse.json(updated);
      }

      if (action === 'withdraw') {
        let investor = await prisma.user.findUnique({ where: { walletAddress: investorWallet } });
        if (!investor) {
          return NextResponse.json({ error: 'Investor user not found' }, { status: 404 });
        }

        // Find investment
        const investment = await prisma.investment.findFirst({
          where: { invoiceId: invoice.id, investorId: investor.id, withdrawn: false },
        });

        if (!investment) {
          return NextResponse.json({ error: 'Investment not found or already withdrawn' }, { status: 404 });
        }

        await prisma.investment.update({
          where: { id: investment.id },
          data: { withdrawn: true },
        });

        // Check if all investments are withdrawn
        const remaining = await prisma.investment.count({
          where: { invoiceId: invoice.id, withdrawn: false },
        });

        let updatedInvoice = invoice;
        if (remaining === 0) {
          updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: { status: 'COMPLETED' },
          });
        }

        const payout = investment.amount * (1 + invoice.interestRate / 100);

        await prisma.transaction.create({
          data: {
            txHash: txHash || `mock-tx-${Math.random()}`,
            type: 'WITHDRAW',
            amount: payout,
            sender: investorWallet,
            status: 'SUCCESS',
          },
        });

        return NextResponse.json(updatedInvoice);
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (dbError) {
      console.warn('Prisma PUT invoice action failed, running mock store update:', dbError);

      // MOCK DB UPDATE FALLBACK
      const mockInvoice = mockStore.invoices.find((inv) => inv.id === id || inv.contractInvoiceId === id);
      if (!mockInvoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      if (action === 'fund') {
        const fundAmount = parseFloat(amount);
        let investor = mockStore.users.find((u) => u.walletAddress === investorWallet);
        if (!investor) {
          investor = {
            id: `usr-${Math.random().toString(36).substring(2, 9)}`,
            walletAddress: investorWallet,
            role: 'INVESTOR',
            name: investorWallet.substring(0, 6) + '...' + investorWallet.substring(50),
            email: null,
            createdAt: new Date(),
          };
          mockStore.users.push(investor);
        }

        // Create mock investment
        const mockInvestment = {
          id: `invst-${Math.random().toString(36).substring(2, 9)}`,
          invoiceId: mockInvoice.id,
          investorId: investor.id,
          investorWallet: investor.walletAddress,
          amount: fundAmount,
          txHash: txHash || `mock-tx-${Math.random()}`,
          withdrawn: false,
          createdAt: new Date(),
        };
        mockStore.investments.push(mockInvestment);

        mockInvoice.currentFunding += fundAmount;
        if (mockInvoice.currentFunding >= mockInvoice.fundingGoal) {
          mockInvoice.status = 'AWAITING_PAYMENT';
        } else {
          mockInvoice.status = 'PARTIALLY_FUNDED';
        }

        // Create transaction log
        mockStore.transactions.push({
          id: `tx-${Math.random().toString(36).substring(2, 9)}`,
          txHash: txHash || `mock-tx-${Math.random()}`,
          type: 'FUND',
          amount: fundAmount,
          sender: investorWallet,
          status: 'SUCCESS',
          timestamp: new Date(),
        });

        return NextResponse.json(mockInvoice);
      }

      if (action === 'pay') {
        mockInvoice.status = 'PAID';

        const interestAmount = (mockInvoice.fundingGoal * mockInvoice.interestRate) / 100;
        const totalRepay = mockInvoice.fundingGoal + interestAmount;

        mockStore.transactions.push({
          id: `tx-${Math.random().toString(36).substring(2, 9)}`,
          txHash: txHash || `mock-tx-${Math.random()}`,
          type: 'REPAY',
          amount: totalRepay,
          sender: payerWallet || mockInvoice.businessWallet,
          status: 'SUCCESS',
          timestamp: new Date(),
        });

        return NextResponse.json(mockInvoice);
      }

      if (action === 'cancel') {
        mockInvoice.status = 'CANCELLED';

        // Return mock balances back to investors in mock store
        const associatedInvestments = mockStore.investments.filter(i => i.invoiceId === mockInvoice.id);
        associatedInvestments.forEach(invst => {
          const balanceKey = `wallet_balance_${invst.investorWallet}`;
          const current = parseFloat(localStorage.getItem(balanceKey) || '10000');
          localStorage.setItem(balanceKey, (current + invst.amount).toString());
        });

        mockStore.transactions.push({
          id: `tx-${Math.random().toString(36).substring(2, 9)}`,
          txHash: txHash || `mock-tx-${Math.random()}`,
          type: 'CANCEL',
          amount: mockInvoice.currentFunding,
          sender: mockInvoice.businessWallet,
          status: 'SUCCESS',
          timestamp: new Date(),
        });

        return NextResponse.json(mockInvoice);
      }

      if (action === 'withdraw') {
        let investor = mockStore.users.find((u) => u.walletAddress === investorWallet);
        if (!investor) {
          return NextResponse.json({ error: 'Investor not found' }, { status: 404 });
        }

        const investment = mockStore.investments.find(
          (invst) => invst.invoiceId === mockInvoice.id && invst.investorId === investor.id && !invst.withdrawn
        );

        if (!investment) {
          return NextResponse.json({ error: 'Investment not found or already withdrawn' }, { status: 404 });
        }

        investment.withdrawn = true;

        const remaining = mockStore.investments.filter(
          (invst) => invst.invoiceId === mockInvoice.id && !invst.withdrawn
        ).length;

        if (remaining === 0) {
          mockInvoice.status = 'COMPLETED';
        }

        const payout = investment.amount * (1 + mockInvoice.interestRate / 100);

        // Increase investor balance
        const balanceKey = `wallet_balance_${investorWallet}`;
        const current = parseFloat(localStorage.getItem(balanceKey) || '10000');
        localStorage.setItem(balanceKey, (current + payout).toString());

        mockStore.transactions.push({
          id: `tx-${Math.random().toString(36).substring(2, 9)}`,
          txHash: txHash || `mock-tx-${Math.random()}`,
          type: 'WITHDRAW',
          amount: payout,
          sender: investorWallet,
          status: 'SUCCESS',
          timestamp: new Date(),
        });

        return NextResponse.json(mockInvoice);
      }

      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
