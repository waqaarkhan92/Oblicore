/**
 * Toast Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Toast, ToastContainer } from '@/components/ui/toast';

describe('Toast Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render toast with message', () => {
    render(<Toast id="1" message="Test message" onClose={mockOnClose} />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render success toast', () => {
    render(<Toast id="1" message="Success!" type="success" onClose={mockOnClose} />);
    
    const toast = screen.getByText('Success!').closest('div');
    expect(toast).toHaveClass('bg-success');
  });

  it('should render error toast', () => {
    render(<Toast id="1" message="Error!" type="error" onClose={mockOnClose} />);
    
    const toast = screen.getByText('Error!').closest('div');
    expect(toast).toHaveClass('bg-danger');
  });

  it('should render warning toast', () => {
    render(<Toast id="1" message="Warning!" type="warning" onClose={mockOnClose} />);
    
    const toast = screen.getByText('Warning!').closest('div');
    expect(toast).toHaveClass('bg-warning');
  });

  it('should render info toast', () => {
    render(<Toast id="1" message="Info!" type="info" onClose={mockOnClose} />);
    
    const toast = screen.getByText('Info!').closest('div');
    expect(toast).toHaveClass('bg-primary');
  });

  it('should call onClose when close button clicked', () => {
    render(<Toast id="1" message="Test" onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('should call onClose after duration', async () => {
    render(<Toast id="1" message="Test" duration={1000} onClose={mockOnClose} />);
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith('1');
    });
  });

  it('should render toast with action button', () => {
    const handleAction = jest.fn();
    render(
      <Toast
        id="1"
        message="Test"
        onClose={mockOnClose}
        action={{ label: 'Undo', onClick: handleAction }}
      />
    );
    
    const actionButton = screen.getByText('Undo');
    expect(actionButton).toBeInTheDocument();
    
    fireEvent.click(actionButton);
    expect(handleAction).toHaveBeenCalled();
  });
});

describe('ToastContainer Component', () => {
  const mockOnClose = jest.fn();

  it('should render multiple toasts', () => {
    const toasts = [
      { id: '1', message: 'Toast 1' },
      { id: '2', message: 'Toast 2' },
    ];
    
    render(<ToastContainer toasts={toasts} onClose={mockOnClose} />);
    
    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });

  it('should not render when toasts array is empty', () => {
    render(<ToastContainer toasts={[]} onClose={mockOnClose} />);
    
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

