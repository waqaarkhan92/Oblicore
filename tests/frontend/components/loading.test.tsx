/**
 * Loading Component Tests
 */

import { render, screen } from '@testing-library/react';
import { Spinner, Skeleton, LoadingOverlay } from '@/components/ui/loading';

describe('Loading Components', () => {
  describe('Spinner', () => {
    it('should render spinner with default size', () => {
      render(<Spinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('h-6', 'w-6');
    });

    it('should render spinner with small size', () => {
      render(<Spinner size="sm" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('should render spinner with large size', () => {
      render(<Spinner size="lg" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });

    it('should accept custom className', () => {
      render(<Spinner className="custom-class" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('custom-class');
    });
  });

  describe('Skeleton', () => {
    it('should render single line skeleton', () => {
      render(<Skeleton />);
      
      const skeleton = screen.getByRole('generic', { hidden: true });
      expect(skeleton).toBeInTheDocument();
    });

    it('should render multiple line skeleton', () => {
      render(<Skeleton lines={3} />);
      
      const skeletons = screen.getAllByRole('generic', { hidden: true });
      expect(skeletons).toHaveLength(3);
    });

    it('should accept custom className', () => {
      render(<Skeleton className="custom-class" />);
      
      const skeleton = screen.getByRole('generic', { hidden: true });
      expect(skeleton).toHaveClass('custom-class');
    });
  });

  describe('LoadingOverlay', () => {
    it('should render loading overlay with default message', () => {
      render(<LoadingOverlay />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render loading overlay with custom message', () => {
      render(<LoadingOverlay message="Processing..." />);
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });
});

