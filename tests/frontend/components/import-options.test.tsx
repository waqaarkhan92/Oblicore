/**
 * Import Options Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { ImportOptions } from '@/components/excel/ImportOptions';

describe('Import Options Component', () => {
  const mockOnOptionSelect = jest.fn();

  it('should render import options', () => {
    render(<ImportOptions onOptionSelect={mockOnOptionSelect} />);
    
    // Options should render - check for checkboxes or options
    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('should call onOptionSelect when option clicked', () => {
    render(<ImportOptions onOptionSelect={mockOnOptionSelect} />);
    
    // Find and click first checkbox/option
    const firstOption = screen.getAllByRole('checkbox')[0];
    fireEvent.click(firstOption);
    expect(mockOnOptionSelect).toHaveBeenCalled();
  });
});

