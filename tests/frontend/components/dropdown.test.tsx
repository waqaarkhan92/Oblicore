/**
 * Dropdown Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dropdown } from '@/components/ui/dropdown';

const mockOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3', disabled: true },
];

describe('Dropdown Component', () => {
  it('should render dropdown with placeholder', () => {
    render(<Dropdown options={mockOptions} />);
    
    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  it('should render dropdown with label', () => {
    render(<Dropdown options={mockOptions} label="Test Dropdown" />);
    
    expect(screen.getByText('Test Dropdown')).toBeInTheDocument();
  });

  it('should open dropdown when clicked', () => {
    render(<Dropdown options={mockOptions} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('should call onChange when option is selected', () => {
    const handleChange = jest.fn();
    render(<Dropdown options={mockOptions} onChange={handleChange} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const option1 = screen.getByText('Option 1');
    fireEvent.click(option1);
    
    expect(handleChange).toHaveBeenCalledWith('option1');
  });

  it('should display selected value', () => {
    render(<Dropdown options={mockOptions} value="option1" />);
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  it('should filter options when searchable', () => {
    render(<Dropdown options={mockOptions} searchable />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const searchInput = screen.getByPlaceholderText('Search...');
    fireEvent.change(searchInput, { target: { value: 'Option 1' } });
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
  });

  it('should not select disabled options', () => {
    const handleChange = jest.fn();
    render(<Dropdown options={mockOptions} onChange={handleChange} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    const disabledOption = screen.getByText('Option 3');
    fireEvent.click(disabledOption);
    
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should close dropdown when Escape key is pressed', () => {
    render(<Dropdown options={mockOptions} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    
    fireEvent.keyDown(button, { key: 'Escape' });
    
    waitFor(() => {
      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });
  });

  it('should display error message', () => {
    render(<Dropdown options={mockOptions} error="This is an error" />);
    
    expect(screen.getByText('This is an error')).toBeInTheDocument();
  });

  it('should be disabled', () => {
    render(<Dropdown options={mockOptions} disabled />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});

