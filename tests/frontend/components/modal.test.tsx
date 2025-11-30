/**
 * Modal Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/components/ui/modal';

describe('Modal Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('should render modal when open', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('should not render modal when closed', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when Escape key pressed', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should render footer when provided', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" footer={<button>Save</button>}>
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should apply size classes correctly', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" size="lg">
        <p>Modal content</p>
      </Modal>
    );
    
    const modal = screen.getByText('Test Modal').closest('div');
    expect(modal).toHaveClass('max-w-2xl');
    
    rerender(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" size="sm">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(modal).toHaveClass('max-w-md');
  });
});

