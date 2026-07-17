export interface UserMock {
  id: string;
  walletAddress: string;
  role: 'BUSINESS' | 'INVESTOR' | 'ADMIN';
  name: string | null;
  email: string | null;
  createdAt: Date;
}

export interface InvoiceMock {
  id: string;
  contractInvoiceId: string;
  businessId: string;
  businessWallet: string;
  debtorName: string;
  debtorEmail: string;
  amount: number;
  fundingGoal: number;
  currentFunding: number;
  interestRate: number;
  dueDate: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'PARTIALLY_FUNDED' | 'FULLY_FUNDED' | 'AWAITING_PAYMENT' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  pdfUrl: string | null;
  txHash: string | null;
  createdAt: Date;
}

export interface InvestmentMock {
  id: string;
  invoiceId: string;
  investorId: string;
  investorWallet: string;
  amount: number;
  txHash: string | null;
  withdrawn: boolean;
  createdAt: Date;
}

export interface TransactionMock {
  id: string;
  txHash: string;
  type: string;
  amount: number;
  sender: string;
  status: string;
  timestamp: Date;
}

export interface ActivityLogMock {
  id: string;
  userId: string;
  userWallet: string;
  action: string;
  details: string;
  createdAt: Date;
}

// Global server-side state for mock mode
class MockStore {
  users: UserMock[] = [
    {
      id: 'usr-admin-1',
      walletAddress: 'GAADMIN2345678901234567890123456789012345678901234567890',
      role: 'ADMIN',
      name: 'Platform Administrator',
      email: 'admin@factoring.stellar',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'usr-biz-1',
      walletAddress: 'GABI1234567890123456789012345678901234567890123456789012',
      role: 'BUSINESS',
      name: 'Apex Logistics LLC',
      email: 'finance@apexlogistics.com',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'usr-biz-2',
      walletAddress: 'GABIZ888888888888888888888888888888888888888888888888888',
      role: 'BUSINESS',
      name: 'SolarTech Innovations',
      email: 'accounts@solartech.com',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    }
  ];

  invoices: InvoiceMock[] = [];
  investments: InvestmentMock[] = [];
  transactions: TransactionMock[] = [];
  activityLogs: ActivityLogMock[] = [];

  constructor() {
    // Populate Initial Mock Invoices
    this.invoices = [
      {
        id: 'inv-1',
        contractInvoiceId: 'INV001',
        businessId: 'usr-biz-1',
        businessWallet: 'GABI1234567890123456789012345678901234567890123456789012',
        debtorName: 'Walmart Inc.',
        debtorEmail: 'payable@walmart.com',
        amount: 25000,
        fundingGoal: 20000,
        currentFunding: 12000,
        interestRate: 6.5,
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days out
        status: 'PARTIALLY_FUNDED',
        pdfUrl: 'https://res.cloudinary.com/demo/image/upload/v1600000000/sample_invoice.pdf',
        txHash: 'stellar-tx-hash-01234567890abcdef',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'inv-2',
        contractInvoiceId: 'INV002',
        businessId: 'usr-biz-2',
        businessWallet: 'GABIZ888888888888888888888888888888888888888888888888888',
        debtorName: 'Amazon Web Services',
        debtorEmail: 'billing@aws.amazon.com',
        amount: 50000,
        fundingGoal: 45000,
        currentFunding: 45000,
        interestRate: 5.8,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days out
        status: 'AWAITING_PAYMENT',
        pdfUrl: 'https://res.cloudinary.com/demo/image/upload/v1600000000/sample_invoice.pdf',
        txHash: 'stellar-tx-hash-abcdef0123456789',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'inv-3',
        contractInvoiceId: 'INV003',
        businessId: 'usr-biz-1',
        businessWallet: 'GABI1234567890123456789012345678901234567890123456789012',
        debtorName: 'Home Depot',
        debtorEmail: 'ap@homedepot.com',
        amount: 15000,
        fundingGoal: 12000,
        currentFunding: 0,
        interestRate: 7.2,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'PUBLISHED',
        pdfUrl: null,
        txHash: 'stellar-tx-hash-7890abcdef0123456',
        createdAt: new Date(),
      },
      {
        id: 'inv-4',
        contractInvoiceId: 'INV004',
        businessId: 'usr-biz-2',
        businessWallet: 'GABIZ888888888888888888888888888888888888888888888888888',
        debtorName: 'Google LLC',
        debtorEmail: 'vendor-billing@google.com',
        amount: 32000,
        fundingGoal: 30000,
        currentFunding: 30000,
        interestRate: 4.5,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Overdue/Paid
        status: 'COMPLETED',
        pdfUrl: null,
        txHash: 'stellar-tx-hash-completed-001',
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      }
    ];

    // Populated Investments
    this.investments = [
      {
        id: 'invst-1',
        invoiceId: 'inv-1',
        investorId: 'usr-investor-mock',
        investorWallet: 'G-MOCK-INVESTOR-ADDRESS',
        amount: 12000,
        txHash: 'stellar-invest-tx-001',
        withdrawn: false,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'invst-2',
        invoiceId: 'inv-2',
        investorId: 'usr-investor-mock',
        investorWallet: 'G-MOCK-INVESTOR-ADDRESS',
        amount: 45000,
        txHash: 'stellar-invest-tx-002',
        withdrawn: false,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      }
    ];

    // Activity Logs
    this.activityLogs = [
      {
        id: 'act-1',
        userId: 'usr-biz-1',
        userWallet: 'GABI1234567890123456789012345678901234567890123456789012',
        action: 'CREATE_INVOICE',
        details: 'Created Invoice INV001 for Walmart Inc. valued at $25,000',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-2',
        userId: 'usr-investor-mock',
        userWallet: 'G-MOCK-INVESTOR-ADDRESS',
        action: 'FUND_INVOICE',
        details: 'Funded $12,000 into Invoice INV001 (Walmart Inc.)',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-3',
        userId: 'usr-biz-2',
        userWallet: 'GABIZ888888888888888888888888888888888888888888888888888',
        action: 'CREATE_INVOICE',
        details: 'Created Invoice INV002 for Amazon Web Services valued at $50,000',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      }
    ];
  }
}

// Global singleton for mock store
const globalForMock = global as unknown as { mockStore: MockStore };

export const mockStore = globalForMock.mockStore || new MockStore();

if (process.env.NODE_ENV !== 'production') globalForMock.mockStore = mockStore;
