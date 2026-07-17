#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
}

#[contracttype]
pub enum DataKey {
    Admin,
    VerifiedBusiness(Address),
}

#[contract]
pub struct AdminRegistryContract;

#[contractimpl]
impl AdminRegistryContract {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    pub fn verify_business(env: Env, business: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().persistent().set(&DataKey::VerifiedBusiness(business), &true);
        Ok(())
    }

    pub fn revoke_business(env: Env, business: Address) -> Result<(), Error> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)?;
        admin.require_auth();
        env.storage().persistent().remove(&DataKey::VerifiedBusiness(business));
        Ok(())
    }

    pub fn is_verified(env: Env, business: Address) -> bool {
        env.storage().persistent().has(&DataKey::VerifiedBusiness(business))
    }
}

#[cfg(test)]
mod test;
