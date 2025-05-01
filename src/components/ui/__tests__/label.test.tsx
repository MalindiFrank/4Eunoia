import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Label } from '@/components/ui/label'; // Adjust path as necessary
import { Input } from '@/components/ui/input'; // Import Input for htmlFor testing

describe('Label Component', () => {
  it('renders label with children', () => {
    render(<Label>Username</Label>);
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('associates with an input element via htmlFor', () => {
    render(
      <div>
        <Label htmlFor="test-input">Test Label</Label>
        <Input id="test-input" />
      </div>
    );
    const label = screen.getByText('Test Label');
    expect(label).toHaveAttribute('for', 'test-input');
    // Check accessibility association
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    expect(screen.getByLabelText('Test Label')).toHaveAttribute('id', 'test-input');
  });

   it('applies base label styles', () => {
     render(<Label>Styled Label</Label>);
     expect(screen.getByText('Styled Label')).toHaveClass('text-sm', 'font-medium', 'leading-none');
   });

  it('applies className prop', () => {
    render(<Label className="custom-class">Custom Label</Label>);
    expect(screen.getByText('Custom Label')).toHaveClass('custom-class');
  });

  // Note: The peer-disabled styles are harder to test directly without
  // simulating the peer input's disabled state in a more complex setup.
  // Testing the association with htmlFor is generally sufficient.
});
