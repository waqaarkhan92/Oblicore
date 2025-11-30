/**
 * Checkbox Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '@/components/ui/checkbox';

describe('Checkbox Component', () => {
  it('should render checkbox', () => {
    render(<Checkbox />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('should render checkbox with label', () => {
    render(<Checkbox label="Test Checkbox" />);
    
    expect(screen.getByText('Test Checkbox')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('should be checked when checked prop is true', () => {
    render(<Checkbox checked={true} />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('should call onChange when clicked', () => {
    const handleChange = jest.fn();
    render(<Checkbox onChange={handleChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should toggle checked state', () => {
    const handleChange = jest.fn();
    render(<Checkbox checked={false} onChange={handleChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should be disabled', () => {
    render(<Checkbox disabled />);
    
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('should display error message', () => {
    render(<Checkbox label="Test Checkbox" error="This is an error" />);
    
    expect(screen.getByText('This is an error')).toBeInTheDocument();
  });

  it('should toggle when label is clicked', () => {
    const handleChange = jest.fn();
    render(<Checkbox label="Test Checkbox" onChange={handleChange} />);
    
    const label = screen.getByText('Test Checkbox');
    fireEvent.click(label);
    
    expect(handleChange).toHaveBeenCalled();
  });
});

