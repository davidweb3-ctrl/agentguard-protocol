use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("3AfwmYdCAd9LeRdbiKAJuWBcGVQFtCEStbanoU5TW838");

const DAY_SECONDS: i64 = 86_400;

#[program]
pub mod agentguard_protocol {
    use super::*;

    pub fn initialize_agent(
        ctx: Context<InitializeAgent>,
        agent_authority: Pubkey,
        per_tx_limit: u64,
        daily_limit: u64,
    ) -> Result<()> {
        require!(per_tx_limit > 0, ErrorCode::InvalidLimits);
        require!(daily_limit >= per_tx_limit, ErrorCode::InvalidLimits);

        let now = Clock::get()?.unix_timestamp;
        let profile = &mut ctx.accounts.agent_profile;

        profile.owner = ctx.accounts.owner.key();
        profile.agent_authority = agent_authority;
        profile.mint = ctx.accounts.mint.key();
        profile.vault = ctx.accounts.vault.key();
        profile.per_tx_limit = per_tx_limit;
        profile.daily_limit = daily_limit;
        profile.spent_in_window = 0;
        profile.window_start = current_window_start(now);
        profile.paused = false;
        profile.created_at = now;
        profile.bump = ctx.bumps.agent_profile;
        profile.vault_authority_bump = ctx.bumps.vault_authority;

        emit!(AgentInitialized {
            agent_profile: profile.key(),
            owner: profile.owner,
            agent_authority,
            vault: profile.vault,
        });

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let cpi_accounts = Transfer {
            from: ctx.accounts.owner_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.owner.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn set_policy(ctx: Context<SetPolicy>, per_tx_limit: u64, daily_limit: u64) -> Result<()> {
        require!(per_tx_limit > 0, ErrorCode::InvalidLimits);
        require!(daily_limit >= per_tx_limit, ErrorCode::InvalidLimits);

        let profile = &mut ctx.accounts.agent_profile;
        profile.per_tx_limit = per_tx_limit;
        profile.daily_limit = daily_limit;

        emit!(PolicyUpdated {
            agent_profile: profile.key(),
            per_tx_limit,
            daily_limit,
        });

        Ok(())
    }

    pub fn set_pause(ctx: Context<SetPause>, paused: bool) -> Result<()> {
        let profile = &mut ctx.accounts.agent_profile;
        profile.paused = paused;

        emit!(PauseUpdated {
            agent_profile: profile.key(),
            paused,
        });

        Ok(())
    }

    pub fn add_merchant(
        ctx: Context<AddMerchant>,
        merchant: Pubkey,
        max_per_payment: u64,
    ) -> Result<()> {
        require!(max_per_payment > 0, ErrorCode::InvalidLimits);

        let merchant_policy = &mut ctx.accounts.merchant_policy;
        merchant_policy.agent_profile = ctx.accounts.agent_profile.key();
        merchant_policy.merchant = merchant;
        merchant_policy.max_per_payment = max_per_payment;
        merchant_policy.active = true;
        merchant_policy.bump = ctx.bumps.merchant_policy;

        emit!(MerchantAdded {
            agent_profile: merchant_policy.agent_profile,
            merchant,
            max_per_payment,
        });

        Ok(())
    }

    pub fn agent_pay(ctx: Context<AgentPay>, amount: u64, request_hash: [u8; 32]) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(
            ctx.accounts.merchant_policy.active,
            ErrorCode::MerchantInactive
        );

        let now = Clock::get()?.unix_timestamp;
        let window_start = current_window_start(now);
        let profile_key = ctx.accounts.agent_profile.key();
        let merchant = ctx.accounts.merchant_policy.merchant;

        {
            let profile = &mut ctx.accounts.agent_profile;
            require!(!profile.paused, ErrorCode::AgentPaused);
            require!(
                amount <= profile.per_tx_limit,
                ErrorCode::PerTxLimitExceeded
            );
            require!(
                amount <= ctx.accounts.merchant_policy.max_per_payment,
                ErrorCode::MerchantLimitExceeded
            );

            if profile.window_start != window_start {
                profile.window_start = window_start;
                profile.spent_in_window = 0;
            }

            let new_spent = profile
                .spent_in_window
                .checked_add(amount)
                .ok_or(ErrorCode::MathOverflow)?;
            require!(
                new_spent <= profile.daily_limit,
                ErrorCode::DailyLimitExceeded
            );
            profile.spent_in_window = new_spent;
        }

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault-authority",
            profile_key.as_ref(),
            &[ctx.accounts.agent_profile.vault_authority_bump],
        ]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.merchant_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );

        token::transfer(cpi_ctx, amount)?;

        let receipt = &mut ctx.accounts.receipt;
        receipt.agent_profile = profile_key;
        receipt.agent_authority = ctx.accounts.agent_authority.key();
        receipt.merchant = merchant;
        receipt.amount = amount;
        receipt.request_hash = request_hash;
        receipt.timestamp = now;
        receipt.window_start = window_start;
        receipt.bump = ctx.bumps.receipt;

        emit!(AgentPayment {
            agent_profile: profile_key,
            agent_authority: ctx.accounts.agent_authority.key(),
            merchant,
            amount,
            request_hash,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(agent_authority: Pubkey)]
pub struct InitializeAgent<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = owner,
        space = 8 + AgentProfile::INIT_SPACE,
        seeds = [b"agent", owner.key().as_ref(), agent_authority.as_ref()],
        bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,
    /// CHECK: This PDA owns the token vault and only signs inside program-controlled CPI.
    #[account(
        seeds = [b"vault-authority", agent_profile.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = owner,
        token::mint = mint,
        token::authority = vault_authority,
        seeds = [b"vault", agent_profile.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        mut,
        has_one = owner @ ErrorCode::UnauthorizedOwner,
        has_one = mint @ ErrorCode::WrongMint,
        has_one = vault @ ErrorCode::InvalidVault
    )]
    pub agent_profile: Account<'info, AgentProfile>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = owner_token_account.owner == owner.key() @ ErrorCode::UnauthorizedOwner,
        constraint = owner_token_account.mint == mint.key() @ ErrorCode::WrongMint
    )]
    pub owner_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetPolicy<'info> {
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner @ ErrorCode::UnauthorizedOwner)]
    pub agent_profile: Account<'info, AgentProfile>,
}

#[derive(Accounts)]
pub struct SetPause<'info> {
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner @ ErrorCode::UnauthorizedOwner)]
    pub agent_profile: Account<'info, AgentProfile>,
}

#[derive(Accounts)]
#[instruction(merchant: Pubkey)]
pub struct AddMerchant<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(has_one = owner @ ErrorCode::UnauthorizedOwner)]
    pub agent_profile: Account<'info, AgentProfile>,
    #[account(
        init,
        payer = owner,
        space = 8 + MerchantPolicy::INIT_SPACE,
        seeds = [b"merchant", agent_profile.key().as_ref(), merchant.as_ref()],
        bump
    )]
    pub merchant_policy: Account<'info, MerchantPolicy>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, request_hash: [u8; 32])]
pub struct AgentPay<'info> {
    #[account(mut)]
    pub agent_authority: Signer<'info>,
    #[account(
        mut,
        has_one = mint @ ErrorCode::WrongMint,
        has_one = vault @ ErrorCode::InvalidVault,
        constraint = agent_profile.agent_authority == agent_authority.key() @ ErrorCode::UnauthorizedAgent
    )]
    pub agent_profile: Account<'info, AgentProfile>,
    pub mint: Account<'info, Mint>,
    /// CHECK: Program-derived vault authority. Seeds and bump enforce identity.
    #[account(
        seeds = [b"vault-authority", agent_profile.key().as_ref()],
        bump = agent_profile.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"merchant", agent_profile.key().as_ref(), merchant_policy.merchant.as_ref()],
        bump = merchant_policy.bump
    )]
    pub merchant_policy: Account<'info, MerchantPolicy>,
    #[account(
        mut,
        constraint = merchant_token_account.owner == merchant_policy.merchant @ ErrorCode::MerchantTokenOwnerMismatch,
        constraint = merchant_token_account.mint == mint.key() @ ErrorCode::WrongMint
    )]
    pub merchant_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = agent_authority,
        space = 8 + PaymentReceipt::INIT_SPACE,
        seeds = [b"receipt", agent_profile.key().as_ref(), request_hash.as_ref()],
        bump
    )]
    pub receipt: Account<'info, PaymentReceipt>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct AgentProfile {
    pub owner: Pubkey,
    pub agent_authority: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub per_tx_limit: u64,
    pub daily_limit: u64,
    pub spent_in_window: u64,
    pub window_start: i64,
    pub paused: bool,
    pub created_at: i64,
    pub bump: u8,
    pub vault_authority_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct MerchantPolicy {
    pub agent_profile: Pubkey,
    pub merchant: Pubkey,
    pub max_per_payment: u64,
    pub active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PaymentReceipt {
    pub agent_profile: Pubkey,
    pub agent_authority: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
    pub request_hash: [u8; 32],
    pub timestamp: i64,
    pub window_start: i64,
    pub bump: u8,
}

#[event]
pub struct AgentInitialized {
    pub agent_profile: Pubkey,
    pub owner: Pubkey,
    pub agent_authority: Pubkey,
    pub vault: Pubkey,
}

#[event]
pub struct PolicyUpdated {
    pub agent_profile: Pubkey,
    pub per_tx_limit: u64,
    pub daily_limit: u64,
}

#[event]
pub struct PauseUpdated {
    pub agent_profile: Pubkey,
    pub paused: bool,
}

#[event]
pub struct MerchantAdded {
    pub agent_profile: Pubkey,
    pub merchant: Pubkey,
    pub max_per_payment: u64,
}

#[event]
pub struct AgentPayment {
    pub agent_profile: Pubkey,
    pub agent_authority: Pubkey,
    pub merchant: Pubkey,
    pub amount: u64,
    pub request_hash: [u8; 32],
}

#[error_code]
pub enum ErrorCode {
    #[msg("Amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Limits are invalid.")]
    InvalidLimits,
    #[msg("Only the owner can perform this action.")]
    UnauthorizedOwner,
    #[msg("Only the configured agent authority can perform this action.")]
    UnauthorizedAgent,
    #[msg("Agent is paused.")]
    AgentPaused,
    #[msg("Payment exceeds the per-transaction limit.")]
    PerTxLimitExceeded,
    #[msg("Payment exceeds the daily limit.")]
    DailyLimitExceeded,
    #[msg("Payment exceeds this merchant limit.")]
    MerchantLimitExceeded,
    #[msg("Merchant is not active.")]
    MerchantInactive,
    #[msg("Merchant token account owner does not match merchant.")]
    MerchantTokenOwnerMismatch,
    #[msg("Token mint does not match the configured mint.")]
    WrongMint,
    #[msg("Vault account does not match the configured vault.")]
    InvalidVault,
    #[msg("Math overflow.")]
    MathOverflow,
}

fn current_window_start(now: i64) -> i64 {
    now - now.rem_euclid(DAY_SECONDS)
}
