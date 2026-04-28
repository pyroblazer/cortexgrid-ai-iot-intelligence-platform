/**
 * Unit tests for QueryProvider component (src/components/providers/query-provider.tsx)
 *
 * Tests:
 * - Renders children inside QueryClientProvider
 * - Creates QueryClient with correct default options
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryProvider } from '@/components/providers/query-provider';
import { useQueryClient } from '@tanstack/react-query';

// A test component that accesses the QueryClient and displays its options
function QueryClientInspector() {
  const queryClient = useQueryClient();
  const defaultOptions = queryClient.getDefaultOptions();

  return (
    <div>
      <span data-testid="stale-time">
        {defaultOptions.queries?.staleTime as number}
      </span>
      <span data-testid="gc-time">
        {defaultOptions.queries?.gcTime as number}
      </span>
      <span data-testid="query-retry">
        {defaultOptions.queries?.retry as number}
      </span>
      <span data-testid="mutation-retry">
        {(defaultOptions.mutations?.retry as number) ?? 'undefined'}
      </span>
      <span data-testid="refetch-on-window-focus">
        {String(defaultOptions.queries?.refetchOnWindowFocus)}
      </span>
    </div>
  );
}

describe('QueryProvider', () => {
  it('renders children', () => {
    render(
      <QueryProvider>
        <div data-testid="child">Hello</div>
      </QueryProvider>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('provides a QueryClient to children', () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>
    );
    expect(screen.getByTestId('stale-time')).toHaveTextContent('60000');
  });

  it('sets staleTime to 60 seconds (60000ms)', () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>
    );
    expect(screen.getByTestId('stale-time')).toHaveTextContent('60000');
  });

  it('sets gcTime to 5 minutes (300000ms)', () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>
    );
    expect(screen.getByTestId('gc-time')).toHaveTextContent('300000');
  });

  it('sets query retry to 2', () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>
    );
    expect(screen.getByTestId('query-retry')).toHaveTextContent('2');
  });

  it('sets mutation retry to 1', () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>
    );
    expect(screen.getByTestId('mutation-retry')).toHaveTextContent('1');
  });

  it('disables refetchOnWindowFocus', () => {
    render(
      <QueryProvider>
        <QueryClientInspector />
      </QueryProvider>
    );
    expect(screen.getByTestId('refetch-on-window-focus')).toHaveTextContent('false');
  });

  it('renders multiple children', () => {
    render(
      <QueryProvider>
        <div data-testid="child-1">First</div>
        <div data-testid="child-2">Second</div>
      </QueryProvider>
    );
    expect(screen.getByTestId('child-1')).toHaveTextContent('First');
    expect(screen.getByTestId('child-2')).toHaveTextContent('Second');
  });
});
