/**
 * Input Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input Component', () => {
  it('should render input with label', () => {
    render(<Input label="Test Label" />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('should render input without label', () => {
    render(<Input />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<Input label="Test Input" error="This is an error" />);
    
    expect(screen.getByText('This is an error')).toBeInTheDocument();
    const input = screen.getByLabelText('Test Input');
    expect(input).toHaveClass('border-danger');
  });

  it('should display helper text', () => {
    render(<Input label="Test Input" helperText="This is helper text" />);
    
    expect(screen.getByText('This is helper text')).toBeInTheDocument();
  });

  it('should show left icon', () => {
    render(<Input leftIcon={<span data-testid="left-icon">@</span>} />);
    
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('pl-10');
  });

  it('should show right icon', () => {
    render(<Input rightIcon={<span data-testid="right-icon">✓</span>} />);
    
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('should handle input change', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('test value');
  });

  it('should be disabled', () => {
    render(<Input disabled />);
    
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:opacity-50');
  });

  it('should accept placeholder', () => {
    render(<Input placeholder="Enter text here" />);
    
    const input = screen.getByPlaceholderText('Enter text here');
    expect(input).toBeInTheDocument();
  });

  it('should have full width by default', () => {
    render(<Input label="Test" />);
    
    const container = screen.getByText('Test').closest('div');
    expect(container).toHaveClass('w-full');
  });
});

