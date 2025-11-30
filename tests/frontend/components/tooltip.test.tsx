/**
 * Tooltip Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tooltip } from '@/components/ui/tooltip';

describe('Tooltip Component', () => {
  afterEach(() => {
    // Clean up any pending timers
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render tooltip trigger', () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );
    
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('should show tooltip on hover', async () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });
  });

  it('should hide tooltip on mouse leave', async () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );
    
    const trigger = screen.getByText('Hover me');
    fireEvent.mouseEnter(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });
    
    fireEvent.mouseLeave(trigger);
    
    await waitFor(() => {
      expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    }, { timeout: 1000 });
    
    // Wait for any cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('should show tooltip on focus', async () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Focus me</button>
      </Tooltip>
    );
    
    const trigger = screen.getByText('Focus me');
    fireEvent.focus(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });
  });

  it('should render tooltip with different positions', async () => {
    const { rerender } = render(
      <Tooltip content="Tooltip" position="top">
        <button>Button</button>
      </Tooltip>
    );
    
    const trigger = screen.getByText('Button');
    fireEvent.mouseEnter(trigger);
    
    await waitFor(() => {
      const tooltip = screen.getByText('Tooltip').closest('div');
      expect(tooltip).toHaveClass('bottom-full');
    });
    
    rerender(
      <Tooltip content="Tooltip" position="bottom">
        <button>Button</button>
      </Tooltip>
    );
    
    await waitFor(() => {
      const tooltip = screen.getByText('Tooltip').closest('div');
      expect(tooltip).toHaveClass('top-full');
    });
  });

  it('should accept custom delay', async () => {
    jest.useFakeTimers();
    
    render(
      <Tooltip content="Tooltip" delay={1000}>
        <button>Button</button>
      </Tooltip>
    );
    
    const trigger = screen.getByText('Button');
    fireEvent.mouseEnter(trigger);
    
    expect(screen.queryByText('Tooltip')).not.toBeInTheDocument();
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Tooltip')).toBeInTheDocument();
    });
    
    // Clean up
    fireEvent.mouseLeave(trigger);
    jest.runAllTimers();
    jest.useRealTimers();
  });
});

