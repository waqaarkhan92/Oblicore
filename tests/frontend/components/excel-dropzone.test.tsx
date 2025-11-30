/**
 * Excel Import Dropzone Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExcelImportDropzone } from '@/components/excel/ExcelImportDropzone';

describe('Excel Import Dropzone Component', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  it('should render dropzone', () => {
    render(<ExcelImportDropzone onFileSelect={mockOnFileSelect} />);
    
    expect(screen.getByText(/drop excel file/i)).toBeInTheDocument();
  });

  it('should accept file selection', async () => {
    render(<ExcelImportDropzone onFileSelect={mockOnFileSelect} />);
    
    const file = new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const input = screen.getByLabelText(/file input/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });
  });

  it('should reject invalid file types', async () => {
    render(<ExcelImportDropzone onFileSelect={mockOnFileSelect} acceptedFormats={['.xlsx', '.xls']} />);
    
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const input = screen.getByLabelText(/file input/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });
    
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('should reject files exceeding max size', async () => {
    render(<ExcelImportDropzone onFileSelect={mockOnFileSelect} maxSize={1024} />);
    
    // Create a file larger than 1KB
    const largeContent = 'x'.repeat(2000);
    const file = new File([largeContent], 'large.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const input = screen.getByLabelText(/file input/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
    
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('should handle drag and drop', async () => {
    render(<ExcelImportDropzone onFileSelect={mockOnFileSelect} />);
    
    const dropzone = screen.getByText(/drop excel file/i).closest('div');
    const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    fireEvent.dragEnter(dropzone!, { dataTransfer: { files: [file] } });
    fireEvent.drop(dropzone!, { dataTransfer: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });
  });
});

