#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, token, Address, Env, Symbol, Vec, Val
};

mod storage;
use storage::*;

const DAY_IN_LEDGERS: u32 = 17280;
const THIRTY_DAYS_IN_LEDGERS: u32 = DAY_IN_LEDGERS * 30;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvoiceNotFound = 4,
    InvoiceAlreadyExists = 5,
    InvalidAmount = 6,
    InvalidStatus = 7,
    FundingGoalExceeded = 8,
    DeadlinePassed = 9,
    InvestmentNotFound = 10,
    AlreadyWithdrawn = 11,
    BusinessNotVerified = 12,
}

fn get_token(env: &Env) -> Result<Address, Error> {
    env.storage().instance().get(&DataKey::Token).ok_or(Error::NotInitialized)
}

fn get_registry(env: &Env) -> Result<Address, Error> {
    env.storage().instance().get(&DataKey::AdminRegistry).ok_or(Error::NotInitialized)
}

fn bump_instance(env: &Env) {
    env.storage().instance().extend_ttl(DAY_IN_LEDGERS, THIRTY_DAYS_IN_LEDGERS);
}

fn bump_invoice(env: &Env, key: &DataKey) {
    env.storage().persistent().extend_ttl(key, DAY_IN_LEDGERS, THIRTY_DAYS_IN_LEDGERS);
}

#[contract]
pub struct InvoiceFactoringContract;

#[contractimpl]
impl InvoiceFactoringContract {
    pub fn initialize(env: Env, admin: Address, token: Address, registry: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::AdminRegistry, &registry);
        
        let invoice_ids: Vec<Symbol> = Vec::new(&env);
        env.storage().instance().set(&DataKey::InvoiceIds, &invoice_ids);
        
        bump_instance(&env);
        Ok(())
    }

    pub fn create_invoice(
        env: Env,
        id: Symbol,
        business: Address,
        amount: i128,
        interest: u32,
        funding_goal: i128,
        due_date: u64,
    ) -> Result<(), Error> {
        business.require_auth();
        bump_instance(&env);

        // ICC: Inter-Contract Communication to verify business
        let registry_addr = get_registry(&env)?;
        let mut invoke_args: Vec<Val> = Vec::new(&env);
        invoke_args.push_back(business.to_val());
        
        let is_verified: bool = env.invoke_contract(&registry_addr, &Symbol::new(&env, "is_verified"), invoke_args);
        if !is_verified {
            return Err(Error::BusinessNotVerified);
        }

        if amount <= 0 || funding_goal <= 0 || funding_goal > amount {
            return Err(Error::InvalidAmount);
        }

        let current_time = env.ledger().timestamp();
        if due_date <= current_time {
            return Err(Error::DeadlinePassed);
        }

        let key = DataKey::Invoice(id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::InvoiceAlreadyExists);
        }

        let invoice = Invoice {
            id: id.clone(),
            business: business.clone(),
            amount,
            interest,
            funding_goal,
            current_funding: 0,
            due_date,
            status: InvoiceStatus::Published,
            funding_balance: 0,
            repayment_balance: 0,
        };

        env.storage().persistent().set(&key, &invoice);
        bump_invoice(&env, &key);

        let mut invoice_ids: Vec<Symbol> = env
            .storage()
            .instance()
            .get(&DataKey::InvoiceIds)
            .unwrap_or_else(|| Vec::new(&env));
        invoice_ids.push_back(id.clone());
        env.storage().instance().set(&DataKey::InvoiceIds, &invoice_ids);

        let investments_key = DataKey::Investments(id.clone());
        let investments: Vec<Investment> = Vec::new(&env);
        env.storage().persistent().set(&investments_key, &investments);
        bump_invoice(&env, &investments_key);

        Ok(())
    }

    pub fn fund_invoice(env: Env, id: Symbol, investor: Address, amount: i128) -> Result<(), Error> {
        investor.require_auth();
        bump_instance(&env);

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Invoice(id.clone());
        let mut invoice: Invoice = env.storage().persistent().get(&key).ok_or(Error::InvoiceNotFound)?;
        bump_invoice(&env, &key);

        if invoice.status != InvoiceStatus::Published && invoice.status != InvoiceStatus::PartiallyFunded {
            return Err(Error::InvalidStatus);
        }

        let current_time = env.ledger().timestamp();
        if invoice.due_date <= current_time {
            return Err(Error::DeadlinePassed);
        }

        let remaining = invoice.funding_goal - invoice.current_funding;
        if amount > remaining {
            return Err(Error::FundingGoalExceeded);
        }

        let token_addr = get_token(&env)?;
        let token_client = token::Client::new(&env, &token_addr);

        let contract_address = env.current_contract_address();
        token_client.transfer(&investor, &contract_address, &amount);

        invoice.current_funding += amount;
        invoice.funding_balance += amount;

        if invoice.current_funding == invoice.funding_goal {
            token_client.transfer(&contract_address, &invoice.business, &invoice.funding_goal);
            invoice.funding_balance = 0;
            invoice.status = InvoiceStatus::AwaitingPayment;
        } else {
            invoice.status = InvoiceStatus::PartiallyFunded;
        }

        env.storage().persistent().set(&key, &invoice);

        let investments_key = DataKey::Investments(id.clone());
        let investments: Vec<Investment> = env
            .storage()
            .persistent()
            .get(&investments_key)
            .ok_or(Error::InvoiceNotFound)?;
        bump_invoice(&env, &investments_key);

        let mut found = false;
        let mut updated_investments = Vec::new(&env);

        for inv in investments.iter() {
            let mut current_inv = inv;
            if current_inv.investor == investor {
                current_inv.amount += amount;
                found = true;
            }
            updated_investments.push_back(current_inv);
        }

        if !found {
            updated_investments.push_back(Investment {
                investor: investor.clone(),
                amount,
                withdrawn: false,
            });
        }

        env.storage().persistent().set(&investments_key, &updated_investments);

        env.events().publish(
            (Symbol::new(&env, "invoice_funded"), id),
            (investor, amount, invoice.current_funding),
        );

        Ok(())
    }

    pub fn cancel_invoice(env: Env, id: Symbol) -> Result<(), Error> {
        bump_instance(&env);
        let key = DataKey::Invoice(id.clone());
        let mut invoice: Invoice = env.storage().persistent().get(&key).ok_or(Error::InvoiceNotFound)?;
        bump_invoice(&env, &key);

        invoice.business.require_auth();

        if invoice.status != InvoiceStatus::Published && invoice.status != InvoiceStatus::PartiallyFunded {
            return Err(Error::InvalidStatus);
        }

        if invoice.current_funding > 0 {
            let token_addr = get_token(&env)?;
            let token_client = token::Client::new(&env, &token_addr);
            let contract_address = env.current_contract_address();

            let investments_key = DataKey::Investments(id.clone());
            let investments: Vec<Investment> = env
                .storage()
                .persistent()
                .get(&investments_key)
                .unwrap_or_else(|| Vec::new(&env));
            bump_invoice(&env, &investments_key);

            for inv in investments.iter() {
                if inv.amount > 0 {
                    token_client.transfer(&contract_address, &inv.investor, &inv.amount);
                }
            }
            invoice.funding_balance = 0;
        }

        invoice.status = InvoiceStatus::Cancelled;
        env.storage().persistent().set(&key, &invoice);

        env.events().publish((Symbol::new(&env, "invoice_cancelled"), id), ());

        Ok(())
    }

    pub fn mark_paid(env: Env, id: Symbol, payer: Address) -> Result<(), Error> {
        payer.require_auth();
        bump_instance(&env);

        let key = DataKey::Invoice(id.clone());
        let mut invoice: Invoice = env.storage().persistent().get(&key).ok_or(Error::InvoiceNotFound)?;
        bump_invoice(&env, &key);

        if invoice.status != InvoiceStatus::AwaitingPayment && invoice.status != InvoiceStatus::FullyFunded {
            return Err(Error::InvalidStatus);
        }

        let interest_amount = (invoice.funding_goal * invoice.interest as i128) / 10000;
        let total_repayment = invoice.funding_goal + interest_amount;

        let token_addr = get_token(&env)?;
        let token_client = token::Client::new(&env, &token_addr);
        let contract_address = env.current_contract_address();

        token_client.transfer(&payer, &contract_address, &total_repayment);

        invoice.repayment_balance = total_repayment;
        invoice.status = InvoiceStatus::Paid;

        env.storage().persistent().set(&key, &invoice);

        env.events().publish(
            (Symbol::new(&env, "invoice_paid"), id),
            (payer, total_repayment),
        );

        Ok(())
    }

    pub fn withdraw_return(env: Env, id: Symbol, investor: Address) -> Result<(), Error> {
        investor.require_auth();
        bump_instance(&env);

        let key = DataKey::Invoice(id.clone());
        let mut invoice: Invoice = env.storage().persistent().get(&key).ok_or(Error::InvoiceNotFound)?;
        bump_invoice(&env, &key);

        if invoice.status != InvoiceStatus::Paid && invoice.status != InvoiceStatus::Completed {
            return Err(Error::InvalidStatus);
        }

        let investments_key = DataKey::Investments(id.clone());
        let mut investments: Vec<Investment> = env
            .storage()
            .persistent()
            .get(&investments_key)
            .ok_or(Error::InvoiceNotFound)?;
        bump_invoice(&env, &investments_key);

        let mut found = false;
        let mut investor_amount = 0i128;
        let mut updated_investments = Vec::new(&env);

        for inv in investments.iter() {
            let mut current_inv = inv;
            if current_inv.investor == investor {
                if current_inv.withdrawn {
                    return Err(Error::AlreadyWithdrawn);
                }
                investor_amount = current_inv.amount;
                current_inv.withdrawn = true;
                found = true;
            }
            updated_investments.push_back(current_inv);
        }

        if !found {
            return Err(Error::InvestmentNotFound);
        }

        let interest_share = (investor_amount * invoice.interest as i128) / 10000;
        let payout = investor_amount + interest_share;

        let token_addr = get_token(&env)?;
        let token_client = token::Client::new(&env, &token_addr);
        let contract_address = env.current_contract_address();

        token_client.transfer(&contract_address, &investor, &payout);

        invoice.repayment_balance -= payout;

        let mut all_withdrawn = true;
        for inv in updated_investments.iter() {
            if !inv.withdrawn {
                all_withdrawn = false;
                break;
            }
        }

        if all_withdrawn {
            invoice.status = InvoiceStatus::Completed;
        }

        env.storage().persistent().set(&key, &invoice);
        env.storage().persistent().set(&investments_key, &updated_investments);

        env.events().publish(
            (Symbol::new(&env, "return_withdrawn"), id),
            (investor, payout),
        );

        Ok(())
    }

    pub fn get_invoice(env: Env, id: Symbol) -> Option<Invoice> {
        let key = DataKey::Invoice(id);
        env.storage().persistent().get(&key)
    }

    pub fn get_all_invoices(env: Env) -> Vec<Invoice> {
        let invoice_ids: Vec<Symbol> = env
            .storage()
            .instance()
            .get(&DataKey::InvoiceIds)
            .unwrap_or_else(|| Vec::new(&env));

        let mut list = Vec::new(&env);
        for id in invoice_ids.iter() {
            if let Some(invoice) = Self::get_invoice(env.clone(), id.clone()) {
                list.push_back(invoice);
            }
        }
        list
    }
}

#[cfg(test)]
mod test;
