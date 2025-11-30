/**
 * Notification Dropdown Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import { NotificationDropdown } from '@/components/dashboard/notification-dropdown';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('Notification Dropdown Component', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries: jest.fn(),
    });
    (useQuery as jest.Mock).mockReturnValue({
      data: { count: 5 },
      isLoading: false,
    });
    (useMutation as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
    });
  });

  it('should render notification bell icon', () => {
    render(<NotificationDropdown />);
    
    const bellIcon = screen.getByRole('button', { name: /notifications/i });
    expect(bellIcon).toBeInTheDocument();
  });

  it('should display unread count badge', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { count: 5 },
      isLoading: false,
    });
    
    render(<NotificationDropdown />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should show empty state when no notifications', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { count: 0 },
      isLoading: false,
    });
    
    render(<NotificationDropdown />);
    
    // Click to open dropdown
    const bellIcon = screen.getByRole('button', { name: /notifications/i });
    bellIcon.click();
    
    waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });
  });
});

