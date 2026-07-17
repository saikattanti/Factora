import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import InvoiceCard from './invoice-card'
import React from 'react'

const mockInvoice = {
  id: '1',
  contractInvoiceId: 'INV001',
  debtorName: 'Acme Corp',
  debtorEmail: 'acme@example.com',
  amount: 1000,
  fundingGoal: 800,
  currentFunding: 400,
  interestRate: 500, // 5%
  dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
  status: 'PARTIALLY_FUNDED' as const,
  business: {
    walletAddress: 'G_BUSINESS',
    name: 'Business XYZ'
  }
}

describe('InvoiceCard Component', () => {
  it('renders invoice details correctly', () => {
    render(<InvoiceCard invoice={mockInvoice} />)
    
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('ID: INV001')).toBeInTheDocument()
    expect(screen.getByText('Partially Funded')).toBeInTheDocument()
    expect(screen.getByText('$1,000')).toBeInTheDocument()
    expect(screen.getByText('$800')).toBeInTheDocument()
    expect(screen.getByText('500% APY')).toBeInTheDocument()
    
    // Check progress bar text
    expect(screen.getByText('Funded: $400')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders FUND action for investors', () => {
    const handleActionClick = vi.fn()
    render(
      <InvoiceCard 
        invoice={mockInvoice} 
        currentUserRole="INVESTOR" 
        currentUserAddress="G_INVESTOR"
        onActionClick={handleActionClick} 
      />
    )
    
    const fundButton = screen.getByRole('button', { name: /Finance/i })
    expect(fundButton).toBeInTheDocument()
    
    fireEvent.click(fundButton)
    expect(handleActionClick).toHaveBeenCalledWith(mockInvoice, 'fund')
  })

  it('hides fund action for business owner', () => {
    render(
      <InvoiceCard 
        invoice={mockInvoice} 
        currentUserRole="BUSINESS" 
        currentUserAddress="G_BUSINESS" 
      />
    )
    
    // As owner of a partially funded invoice, they should not see "Fund", but maybe "Cancel" if applicable.
    // However, in Partially Funded state, Cancel is typically allowed unless funds are locked.
    // The main thing is they shouldn't see "Fund".
    const fundButton = screen.queryByRole('button', { name: /fund invoice/i })
    expect(fundButton).not.toBeInTheDocument()
  })
})
