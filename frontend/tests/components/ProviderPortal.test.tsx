import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProviderPortal from '@/components/provider/ProviderPortal';

// Mock the API service
vi.mock('@/services/api', () => ({
  default: {
    providers: {
      getProviderByKey: vi.fn().mockResolvedValue({ name: 'Test Provider' }),
      getAvailableOrders: vi.fn().mockResolvedValue([]),
      getQuoteHistory: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

// Mock UI components
vi.mock('@/components/ui', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick} data-testid="button">
      {children}
    </button>
  ),
}));

// Mock child components
vi.mock('@/components/provider/AvailableOrdersList', () => ({
  default: ({ providerKey }: { providerKey: string }) => (
    <div data-testid="available-orders-list">Provider Key: {providerKey}</div>
  ),
}));

vi.mock('@/components/provider/QuoteHistory', () => ({
  default: () => <div data-testid="quote-history">Quote History</div>,
}));

describe('ProviderPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract providerKey from URL params', async () => {
    const testProviderKey = 'test-provider-123';
    
    render(
      <MemoryRouter initialEntries={[`/provider/${testProviderKey}`]}>
        <ProviderPortal />
      </MemoryRouter>
    );

    // Wait for the component to render and check if providerKey is passed correctly
    expect(screen.getByTestId('available-orders-list')).toHaveTextContent(
      `Provider Key: ${testProviderKey}`
    );
  });

  it('should show error when providerKey is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/provider/']}>
        <ProviderPortal />
      </MemoryRouter>
    );

    // Should show error message when providerKey is missing
    expect(screen.getByText('缺少供应商标识，请检查URL参数')).toBeInTheDocument();
  });

  it('should use prop providerKey when provided', async () => {
    const testProviderKey = 'prop-provider-456';
    
    render(
      <MemoryRouter>
        <ProviderPortal providerKey={testProviderKey} />
      </MemoryRouter>
    );

    // Should use the prop value instead of URL param
    expect(screen.getByTestId('available-orders-list')).toHaveTextContent(
      `Provider Key: ${testProviderKey}`
    );
  });
});
