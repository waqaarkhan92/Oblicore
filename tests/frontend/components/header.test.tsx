/**
 * Header Component Tests
 */

import { render, screen } from '@testing-library/react';
import { Header } from '@/components/dashboard/header';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

describe('Header Component', () => {
  it('should render header', () => {
    render(<Header />);
    
    // Header should render (exact content depends on implementation)
    const header = screen.getByRole('banner') || document.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('should render user menu', () => {
    render(<Header />);
    
    // User menu should be present - check for menu button or user info
    const userMenu = screen.queryByRole('button', { name: /user|menu|account/i }) || 
                     screen.queryByTestId('user-menu') ||
                     document.querySelector('[data-testid="user-menu"]');
    expect(userMenu).toBeInTheDocument();
  });
});

