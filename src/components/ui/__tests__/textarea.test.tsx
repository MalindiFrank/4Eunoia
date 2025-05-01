import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Textarea } from '@/components/ui/textarea'; // Adjust path as necessary

describe('Textarea Component', () => {
  it('renders a textarea element', () => {
    render(<Textarea data-testid="textarea-element" />);
    expect(screen.getByTestId('textarea-element')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-element').tagName).toBe('TEXTAREA');
  });

  it('renders with a placeholder', () => {
    render(<Textarea placeholder="Enter text here" />);
    expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Textarea value="initial text" onChange={handleChange} data-testid="change-textarea" />);
    const textarea = screen.getByTestId('change-textarea');
    fireEvent.change(textarea, { target: { value: 'changed text' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
    // As with Input, the component itself doesn't manage state.
    // We verify the onChange handler is triggered.
  });

   it('can be controlled', () => {
     const ControlledTextarea = () => {
       const [value, setValue] = React.useState('start text');
       return <Textarea value={value} onChange={(e) => setValue(e.target.value)} data-testid="controlled-textarea" />;
     };
     render(<ControlledTextarea />);
     const textarea = screen.getByTestId('controlled-textarea');
     expect(textarea).toHaveValue('start text');
     fireEvent.change(textarea, { target: { value: 'updated text' } });
     expect(textarea).toHaveValue('updated text');
   });

  it('is disabled when disabled prop is true', () => {
    render(<Textarea disabled data-testid="disabled-textarea" />);
    expect(screen.getByTestId('disabled-textarea')).toBeDisabled();
  });

  it('applies className prop', () => {
    render(<Textarea className="custom-class" data-testid="styled-textarea" />);
    expect(screen.getByTestId('styled-textarea')).toHaveClass('custom-class');
  });

   it('renders with specific rows attribute', () => {
     render(<Textarea rows={5} data-testid="rows-textarea" />);
     expect(screen.getByTestId('rows-textarea')).toHaveAttribute('rows', '5');
   });
});
