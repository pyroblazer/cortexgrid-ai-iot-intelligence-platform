import '@testing-library/jest-dom';
/**
 * Unit tests for ChatMessage component (src/components/ai/chat-message.tsx)
 *
 * Tests:
 * - Renders user message with correct styles (right-aligned, blue)
 * - Renders assistant message with correct styles (left-aligned, gray)
 * - Displays content text
 * - Displays formatted timestamp
 * - Shows User icon for user role
 * - Shows Bot icon for assistant role
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '@/components/ai/chat-message';

// Mock @cortexgrid/ui cn utility
jest.mock('@cortexgrid/ui', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  User: (props: any) => <svg data-testid="user-icon" {...props} />,
  Bot: (props: any) => <svg data-testid="bot-icon" {...props} />,
}));

describe('ChatMessage component', () => {
  const baseTimestamp = '2024-06-15T14:30:00Z';

  it('renders user message content', () => {
    render(<ChatMessage role="user" content="Hello, AI!" timestamp={baseTimestamp} />);
    expect(screen.getByText('Hello, AI!')).toBeInTheDocument();
  });

  it('renders assistant message content', () => {
    render(<ChatMessage role="assistant" content="Hi there!" timestamp={baseTimestamp} />);
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('displays formatted timestamp for user message', () => {
    render(<ChatMessage role="user" content="test" timestamp={baseTimestamp} />);
    // toLocaleTimeString output varies by locale, just check it renders some time
    const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
    expect(timeElement).toBeInTheDocument();
  });

  it('displays formatted timestamp for assistant message', () => {
    render(<ChatMessage role="assistant" content="test" timestamp={baseTimestamp} />);
    const timeElement = screen.getByText(/\d{1,2}:\d{2}/);
    expect(timeElement).toBeInTheDocument();
  });

  it('shows User icon for user role', () => {
    render(<ChatMessage role="user" content="test" timestamp={baseTimestamp} />);
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  it('shows Bot icon for assistant role', () => {
    render(<ChatMessage role="assistant" content="test" timestamp={baseTimestamp} />);
    expect(screen.getByTestId('bot-icon')).toBeInTheDocument();
  });

  it('applies flex-row-reverse class for user role', () => {
    const { container } = render(
      <ChatMessage role="user" content="test" timestamp={baseTimestamp} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-row-reverse');
  });

  it('applies flex-row class for assistant role', () => {
    const { container } = render(
      <ChatMessage role="assistant" content="test" timestamp={baseTimestamp} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex-row');
    expect(wrapper.className).not.toContain('flex-row-reverse');
  });

  it('applies blue background for user message bubble', () => {
    const { container } = render(
      <ChatMessage role="user" content="test" timestamp={baseTimestamp} />
    );
    // Find the message bubble (the div with max-w-[75%])
    const bubble = container.querySelector('[class*="bg-primary-600"]');
    expect(bubble).toBeInTheDocument();
  });

  it('applies gray background for assistant message bubble', () => {
    const { container } = render(
      <ChatMessage role="assistant" content="test" timestamp={baseTimestamp} />
    );
    const bubble = container.querySelector('[class*="bg-dark-100"]');
    expect(bubble).toBeInTheDocument();
  });

  it('renders whitespace-pre-wrap for multi-line content', () => {
    const { container } = render(
      <ChatMessage role="assistant" content={"line1\nline2"} timestamp={baseTimestamp} />
    );
    const contentEl = container.querySelector('[class*="whitespace-pre-wrap"]');
    expect(contentEl).toBeInTheDocument();
    expect(contentEl?.textContent).toBe('line1\nline2');
  });

  it('applies blue icon background for user avatar', () => {
    const { container } = render(
      <ChatMessage role="user" content="test" timestamp={baseTimestamp} />
    );
    const avatar = container.querySelector('[class*="bg-primary-600"][class*="rounded-full"]');
    expect(avatar).toBeInTheDocument();
  });

  it('applies accent icon background for assistant avatar', () => {
    const { container } = render(
      <ChatMessage role="assistant" content="test" timestamp={baseTimestamp} />
    );
    const avatar = container.querySelector('[class*="bg-accent-100"]');
    expect(avatar).toBeInTheDocument();
  });
});
