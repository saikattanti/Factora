use soroban_sdk::{contracttype, Address, Symbol};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum InvoiceStatus {
    Draft = 0,
    Published = 1,
    PartiallyFunded = 2,
    FullyFunded = 3,
    AwaitingPayment = 4,
    Paid = 5,
    Completed = 6,
    Cancelled = 7,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub id: Symbol,
    pub business: Address,
    pub amount: i128,            // Total invoice face value
    pub interest: u32,           // Offered interest in basis points (e.g. 500 = 5%)
    pub funding_goal: i128,      // Funding requested from investors (usually principal)
    pub current_funding: i128,   // Funded amount so far
    pub due_date: u64,           // Unix timestamp
    pub status: InvoiceStatus,
    pub funding_balance: i128,   // Funds currently held in contract
    pub repayment_balance: i128, // Repaid funds currently held in contract
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Investment {
    pub investor: Address,
    pub amount: i128,
    pub withdrawn: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    AdminRegistry, // Stores the ICC contract address
    Invoice(Symbol),
    InvoiceIds,
    Investments(Symbol), // Vec<Investment>
}
