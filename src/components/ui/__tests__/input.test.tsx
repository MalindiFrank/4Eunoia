
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Input } from '@/components/ui/input'; // Adjust path as necessary

describe('Input Component', () => {
  it('renders an input element', () => {
    render(<Input data-testid="input-element" />);
    expect(screen.getByTestId('input-element')).toBeInTheDocument();
    expect(screen.getByTestId('input-element')).toHaveAttribute('type', 'text'); // Default type
  });

  it('renders with a specific type', () => {
    render(<Input type="password" data-testid="password-input" />);
    expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password');
  });

  it('renders with a placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input value="initial" onChange={handleChange} data-testid="change-input" />);
    const input = screen.getByTestId('change-input');
    fireEvent.change(input, { target: { value: 'changed' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    // Note: The component itself doesn't update the value directly without state management
    // We are testing that the onChange handler is called.
  });

   it('can be controlled', () => {
        // This test demonstrates controlling the input value via props
        const ControlledInput = () => {
            const [value, setValue] = React.useState('start');
            return <Input value={value} onChange={(e) => setValue(e.target.value)} data-testid="controlled-input" />;
        };
        render(<ControlledInput />);
        const input = screen.getByTestId('controlled-input');
        expect(input).toHaveValue('start');
        fireEvent.change(input, { target: { value: 'updated' } });
        expect(input).toHaveValue('updated');
   });


  it('is disabled when disabled prop is true', () => {
    render(<Input disabled data-testid="disabled-input" />);
    expect(screen.getByTestId('disabled-input')).toBeDisabled();
  });

  it('applies className prop', () => {
    render(<Input className="custom-class" data-testid="styled-input" />);
    expect(screen.getByTestId('styled-input')).toHaveClass('custom-class');
  });
});
