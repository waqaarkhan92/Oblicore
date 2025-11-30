/**
 * Empty State Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/ui/empty-state';

describe('Empty State Component', () => {
  it('should render empty state with title', () => {
    render(<EmptyState title="No items found" />);
    
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render empty state with description', () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adding some items to get started"
      />
    );
    
    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByText('Try adding some items to get started')).toBeInTheDocument();
  });

  it('should render empty state with icon', () => {
    render(
      <EmptyState
        title="No items found"
        icon={<span data-testid="icon">📦</span>}
      />
    );
    
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('should render empty state with action button', () => {
    const handleAction = jest.fn();
    render(
      <EmptyState
        title="No items found"
        action={{
          label: 'Add Item',
          onClick: handleAction,
        }}
      />
    );
    
    const button = screen.getByText('Add Item');
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalled();
  });

  it('should accept custom className', () => {
    render(
      <EmptyState
        title="No items found"
        className="custom-class"
      />
    );
    
    const container = screen.getByText('No items found').closest('div');
    expect(container).toHaveClass('custom-class');
  });
});

