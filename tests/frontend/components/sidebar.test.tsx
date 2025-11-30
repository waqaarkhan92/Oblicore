/**
 * Sidebar Component Tests
 */

import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { usePathname } from 'next/navigation';
import { useModuleActivation } from '@/lib/hooks/use-module-activation';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

jest.mock('@/lib/hooks/use-module-activation', () => ({
  useModuleActivation: jest.fn(),
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    (useModuleActivation as jest.Mock).mockReturnValue({ data: false, isLoading: false });
  });

  it('should render navigation items', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Obligations')).toBeInTheDocument();
    expect(screen.getByText('Evidence')).toBeInTheDocument();
    expect(screen.getByText('Packs')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should highlight active route', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/documents');
    
    render(<Sidebar />);
    
    const documentsLink = screen.getByText('Documents').closest('a');
    expect(documentsLink).toHaveClass('bg-primary');
  });

  it('should show Module 2 navigation when active', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/sites/test-site-id/module-2/parameters');
    (useModuleActivation as jest.Mock).mockReturnValue({ data: true, isLoading: false });
    
    render(<Sidebar />);
    
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('Lab Results')).toBeInTheDocument();
  });

  it('should show Module 3 navigation when active', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard/sites/test-site-id/module-3/generators');
    (useModuleActivation as jest.Mock)
      .mockReturnValueOnce({ data: false, isLoading: false }) // Module 2
      .mockReturnValueOnce({ data: true, isLoading: false }); // Module 3
    
    render(<Sidebar />);
    
    expect(screen.getByText('Generators')).toBeInTheDocument();
    expect(screen.getByText('Run Hours')).toBeInTheDocument();
  });
});

