/**
 * Help Modal Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { HelpModal } from '@/components/help/HelpModal';

describe('Help Modal Component', () => {
  const mockOnClose = jest.fn();

  it('should render help modal when open', () => {
    render(<HelpModal isOpen={true} onClose={mockOnClose} articleId="test-article" />);
    
    // Modal should render - check for modal container or close button
    const modal = screen.queryByRole('dialog') || document.querySelector('[role="dialog"]');
    expect(modal).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<HelpModal isOpen={false} onClose={mockOnClose} articleId="test-article" />);
    
    // Modal should not be visible
    const modal = screen.queryByRole('dialog');
    expect(modal).not.toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    render(<HelpModal isOpen={true} onClose={mockOnClose} articleId="test-article" />);
    
    // Find and click close button
    const closeButton = screen.getByLabelText(/close/i) || screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

