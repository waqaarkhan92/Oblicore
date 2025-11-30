/**
 * Textarea Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from '@/components/ui/textarea';

describe('Textarea Component', () => {
  it('should render textarea with label', () => {
    render(<Textarea label="Test Label" />);
    
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
  });

  it('should render textarea without label', () => {
    render(<Textarea />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('should display error message', () => {
    render(<Textarea label="Test Textarea" error="This is an error" />);
    
    expect(screen.getByText('This is an error')).toBeInTheDocument();
    const textarea = screen.getByLabelText('Test Textarea');
    expect(textarea).toHaveClass('border-danger');
  });

  it('should display helper text', () => {
    render(<Textarea label="Test Textarea" helperText="This is helper text" />);
    
    expect(screen.getByText('This is helper text')).toBeInTheDocument();
  });

  it('should handle textarea change', () => {
    const handleChange = jest.fn();
    render(<Textarea onChange={handleChange} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalled();
    expect(textarea).toHaveValue('test value');
  });

  it('should be disabled', () => {
    render(<Textarea disabled />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:opacity-50');
  });

  it('should accept placeholder', () => {
    render(<Textarea placeholder="Enter text here" />);
    
    const textarea = screen.getByPlaceholderText('Enter text here');
    expect(textarea).toBeInTheDocument();
  });

  it('should have full width by default', () => {
    render(<Textarea label="Test" />);
    
    const container = screen.getByText('Test').closest('div');
    expect(container).toHaveClass('w-full');
  });
});

