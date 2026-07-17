import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { mockStore } from '@/lib/mock-db-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('walletAddress');

    try {
      // DB calculation
      const allInvoices = await prisma.invoice.findMany();
      const allInvestments = await prisma.investment.findMany({
        include: { invoice: true },
      });
      const allUsers = await prisma.user.findMany();

      const totalFactored = allInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount), 0);
      const totalFunding = allInvoices.reduce((sum: number, inv: any) => sum + Number(inv.currentFunding), 0);
      
      const activeInvestments = allInvoices
        .filter((inv: any) => inv.status === 'PARTIALLY_FUNDED' || inv.status === 'FULLY_FUNDED' || inv.status === 'AWAITING_PAYMENT')
        .reduce((sum: number, inv: any) => sum + Number(inv.currentFunding), 0);
      
      const pendingPayments = allInvoices
        .filter((inv: any) => inv.status === 'AWAITING_PAYMENT')
        .reduce((sum: number, inv: any) => sum + Number(inv.fundingGoal) * (1 + Number(inv.interestRate) / 100), 0);

      // Returns paid to date
      const totalReturns = allInvestments
        .filter(i => i.withdrawn && i.invoice.status === 'COMPLETED')
        .reduce((sum: number, i) => sum + Number(i.amount) * (Number(i.invoice.interestRate) / 100), 0);

      // Filtered user-specific stats
      let userStats = null;
      if (walletAddress) {
        const user = allUsers.find(u => u.walletAddress === walletAddress);
        if (user) {
          const userInvestments = allInvestments.filter(i => i.investorId === user.id);
          const myInvoices = allInvoices.filter(i => i.businessId === user.id);

          const myTotalFunded = userInvestments.reduce((sum: number, i) => sum + Number(i.amount), 0);
          const myExpectedReturns = userInvestments.reduce(
            (sum: number, i) => sum + Number(i.amount) * (1 + Number(i.invoice.interestRate) / 100),
            0
          );
          const myTotalWithdrawn = userInvestments
            .filter(i => i.withdrawn)
            .reduce((sum: number, i) => sum + Number(i.amount) * (1 + Number(i.invoice.interestRate) / 100), 0);

          userStats = {
            totalFunded: myTotalFunded,
            expectedReturns: myExpectedReturns,
            totalWithdrawn: myTotalWithdrawn,
            activeCount: userInvestments.filter(i => !i.withdrawn).length,
            invoicesCount: myInvoices.length,
            invoicesValue: myInvoices.reduce((sum: number, i) => sum + Number(i.amount), 0),
          };
        }
      }

      return NextResponse.json({
        totalFactored,
        totalFunding,
        activeInvestments,
        pendingPayments,
        totalReturns,
        usersCount: allUsers.length,
        invoicesCount: allInvoices.length,
        userStats,
        chartData: getMockChartData(), // Shared helper for charting
      });
    } catch {
      // Fallback calculation using mockStore
      const allInvoices = mockStore.invoices;
      const allInvestments = mockStore.investments;
      const allUsers = mockStore.users;

      const totalFactored = allInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      const totalFunding = allInvoices.reduce((sum, inv) => sum + inv.currentFunding, 0);
      
      const activeInvestments = allInvoices
        .filter(inv => inv.status === 'PARTIALLY_FUNDED' || inv.status === 'FULLY_FUNDED' || inv.status === 'AWAITING_PAYMENT')
        .reduce((sum, inv) => sum + inv.currentFunding, 0);
      
      const pendingPayments = allInvoices
        .filter(inv => inv.status === 'AWAITING_PAYMENT')
        .reduce((sum, inv) => sum + inv.fundingGoal * (1 + inv.interestRate / 100), 0);

      const totalReturns = allInvestments
        .filter(i => i.withdrawn)
        .reduce((sum, i) => {
          const inv = allInvoices.find(v => v.id === i.invoiceId);
          const rate = inv ? inv.interestRate : 5.0;
          return sum + i.amount * (rate / 100);
        }, 0);

      let userStats = null;
      if (walletAddress) {
        const user = allUsers.find(u => u.walletAddress === walletAddress) || { id: 'usr-investor-mock' };
        
        const userInvestments = allInvestments.filter(i => i.investorId === user.id || i.investorWallet === walletAddress);
        const myInvoices = allInvoices.filter(i => i.businessWallet === walletAddress);

        const myTotalFunded = userInvestments.reduce((sum, i) => sum + i.amount, 0);
        const myExpectedReturns = userInvestments.reduce((sum, i) => {
          const inv = allInvoices.find(v => v.id === i.invoiceId);
          const rate = inv ? inv.interestRate : 5.0;
          return sum + i.amount * (1 + rate / 100);
        }, 0);
        const myTotalWithdrawn = userInvestments
          .filter(i => i.withdrawn)
          .reduce((sum, i) => {
            const inv = allInvoices.find(v => v.id === i.invoiceId);
            const rate = inv ? inv.interestRate : 5.0;
            return sum + i.amount * (1 + rate / 100);
          }, 0);

        userStats = {
          totalFunded: myTotalFunded,
          expectedReturns: myExpectedReturns,
          totalWithdrawn: myTotalWithdrawn,
          activeCount: userInvestments.filter(i => !i.withdrawn).length,
          invoicesCount: myInvoices.length,
          invoicesValue: myInvoices.reduce((sum, i) => sum + i.amount, 0),
        };
      }

      return NextResponse.json({
        totalFactored,
        totalFunding,
        activeInvestments,
        pendingPayments,
        totalReturns,
        usersCount: allUsers.length,
        invoicesCount: allInvoices.length,
        userStats,
        chartData: getMockChartData(),
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

function getMockChartData() {
  return [
    { name: 'Jan', volume: 45000, funded: 38000, returns: 2400 },
    { name: 'Feb', volume: 55000, funded: 48000, returns: 3100 },
    { name: 'Mar', volume: 68000, funded: 59000, returns: 3900 },
    { name: 'Apr', volume: 80000, funded: 71000, returns: 4800 },
    { name: 'May', volume: 95000, funded: 84000, returns: 5600 },
    { name: 'Jun', volume: 122000, funded: 107000, returns: 7100 },
  ];
}
