
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/button'; // Adjust path as necessary
import { Check } from 'lucide-react'; // Example icon

describe('Button Component', () => {
  it('renders button with children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button', { name: /delete/i });
    expect(button).toHaveClass('bg-destructive');
  });

  it('applies size classes', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button', { name: /small/i });
    expect(button).toHaveClass('h-9'); // Check specific size class or height
  });

  it('renders as child when asChild prop is true', () => {
    render(
      <Button asChild>
        <a href="/link">Link Button</a>
      </Button>
    );
    // Check if it renders as an anchor tag instead of a button
    expect(screen.getByRole('link', { name: /link button/i })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

   it('renders with an icon', () => {
     render(<Button><Check data-testid="icon" />Submit</Button>);
     expect(screen.getByTestId('icon')).toBeInTheDocument();
     expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
   });

  it('is disabled when disabled prop is true', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
