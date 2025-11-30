/**
 * Badge Component Tests
 */

import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge Component', () => {
  it('should render badge with default variant', () => {
    render(<Badge>Default Badge</Badge>);
    
    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-background-tertiary');
  });

  it('should render badge with success variant', () => {
    render(<Badge variant="success">Success Badge</Badge>);
    
    const badge = screen.getByText('Success Badge');
    expect(badge).toHaveClass('bg-success/10', 'text-success');
  });

  it('should render badge with warning variant', () => {
    render(<Badge variant="warning">Warning Badge</Badge>);
    
    const badge = screen.getByText('Warning Badge');
    expect(badge).toHaveClass('bg-warning/10', 'text-warning');
  });

  it('should render badge with danger variant', () => {
    render(<Badge variant="danger">Danger Badge</Badge>);
    
    const badge = screen.getByText('Danger Badge');
    expect(badge).toHaveClass('bg-danger/10', 'text-danger');
  });

  it('should render badge with info variant', () => {
    render(<Badge variant="info">Info Badge</Badge>);
    
    const badge = screen.getByText('Info Badge');
    expect(badge).toHaveClass('bg-primary/10', 'text-primary');
  });

  it('should render badge with small size', () => {
    render(<Badge size="sm">Small Badge</Badge>);
    
    const badge = screen.getByText('Small Badge');
    expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
  });

  it('should render badge with medium size', () => {
    render(<Badge size="md">Medium Badge</Badge>);
    
    const badge = screen.getByText('Medium Badge');
    expect(badge).toHaveClass('px-2.5', 'py-1', 'text-sm');
  });

  it('should accept custom className', () => {
    render(<Badge className="custom-class">Custom Badge</Badge>);
    
    const badge = screen.getByText('Custom Badge');
    expect(badge).toHaveClass('custom-class');
  });
});

