import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from '@/components/ui/card'; // Adjust path as necessary

describe('Card Component Family', () => {
  it('renders a basic Card with content', () => {
    render(<Card><CardContent>Card Content</CardContent></Card>);
    expect(screen.getByText('Card Content')).toBeInTheDocument();
    // Check for the base card class
    expect(screen.getByText('Card Content').closest('div[class*="rounded-lg border"]')).toBeInTheDocument();
  });

  it('renders Card with Header, Title, and Description', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Description')).toBeInTheDocument();
    // Check title is likely a heading (though specific level isn't enforced by component)
    expect(screen.getByText('Card Title').closest('div[class*="font-semibold"]')).toBeInTheDocument();
    expect(screen.getByText('Card Description').closest('div[class*="text-muted-foreground"]')).toBeInTheDocument();
  });

  it('renders Card with Footer', () => {
    render(
      <Card>
        <CardContent>Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText('Card Footer')).toBeInTheDocument();
     expect(screen.getByText('Card Footer').closest('div[class*="flex items-center"]')).toBeInTheDocument();
  });

  it('applies className prop to Card components', () => {
    render(
      <Card className="custom-card">
        <CardHeader className="custom-header">
          <CardTitle className="custom-title">Title</CardTitle>
        </CardHeader>
        <CardContent className="custom-content">Content</CardContent>
        <CardFooter className="custom-footer">Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText('Content').closest('.custom-card')).toBeInTheDocument();
    expect(screen.getByText('Title').closest('.custom-header')).toBeInTheDocument();
    expect(screen.getByText('Title').closest('.custom-title')).toBeInTheDocument();
    expect(screen.getByText('Content').closest('.custom-content')).toBeInTheDocument();
    expect(screen.getByText('Footer').closest('.custom-footer')).toBeInTheDocument();
  });
});
