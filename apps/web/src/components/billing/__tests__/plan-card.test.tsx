import '@testing-library/jest-dom';
/**
 * Unit tests for PlanCard component (src/components/billing/plan-card.tsx)
 *
 * Tests:
 * - Renders plan name and price
 * - Shows features list
 * - Shows "Current Plan" disabled button for current plan
 * - Shows "Get Started" for free plan
 * - Shows "Upgrade" for paid plan
 * - Shows "Recommended" badge when isRecommended=true
 * - Calls onSelect when button clicked
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanCard } from '@/components/billing/plan-card';

const freePlan = {
  type: 'free',
  name: 'Free',
  monthlyPrice: 0,
  features: ['5 devices', 'Basic analytics', 'Email support'],
  limits: { devices: 5, teamMembers: 1, aiQueries: 100, storageMb: 100 },
};

const proPlan = {
  type: 'pro',
  name: 'Pro',
  monthlyPrice: 29,
  features: ['50 devices', 'Advanced analytics', 'Priority support', 'API access'],
  limits: { devices: 50, teamMembers: 10, aiQueries: 1000, storageMb: 1000 },
};

const enterprisePlan = {
  type: 'enterprise',
  name: 'Enterprise',
  monthlyPrice: 99,
  features: ['Unlimited devices', 'Custom analytics', '24/7 support', 'API access', 'SSO'],
  limits: { devices: -1, teamMembers: -1, aiQueries: -1, storageMb: -1 },
};

describe('PlanCard component', () => {
  it('renders plan name', () => {
    render(<PlanCard plan={proPlan} isCurrentPlan={false} />);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('renders plan price with /month suffix', () => {
    render(<PlanCard plan={proPlan} isCurrentPlan={false} />);
    expect(screen.getByText('$29')).toBeInTheDocument();
    expect(screen.getByText('/month')).toBeInTheDocument();
  });

  it('renders $0 price for free plan', () => {
    render(<PlanCard plan={freePlan} isCurrentPlan={false} />);
    expect(screen.getByText('$0')).toBeInTheDocument();
  });

  it('renders all features', () => {
    render(<PlanCard plan={proPlan} isCurrentPlan={false} />);
    expect(screen.getByText('50 devices')).toBeInTheDocument();
    expect(screen.getByText('Advanced analytics')).toBeInTheDocument();
    expect(screen.getByText('Priority support')).toBeInTheDocument();
    expect(screen.getByText('API access')).toBeInTheDocument();
  });

  it('shows "Current Plan" disabled button when isCurrentPlan=true', () => {
    render(<PlanCard plan={proPlan} isCurrentPlan={true} />);
    const button = screen.getByText('Current Plan');
    expect(button).toBeInTheDocument();
    expect(button.closest('button')).toBeDisabled();
  });

  it('shows "Get Started" for free plan when not current', () => {
    render(<PlanCard plan={freePlan} isCurrentPlan={false} />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('shows "Upgrade" for paid plan when not current', () => {
    render(<PlanCard plan={proPlan} isCurrentPlan={false} />);
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('shows "Upgrade" for enterprise plan', () => {
    render(<PlanCard plan={enterprisePlan} isCurrentPlan={false} />);
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('shows "Recommended" badge when isRecommended=true', () => {
    render(<PlanCard plan={proPlan} isCurrentPlan={false} isRecommended={true} />);
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('does not show "Recommended" badge when isRecommended is false or undefined', () => {
    render(<PlanCard plan={proPlan} isCurrentPlan={false} />);
    expect(screen.queryByText('Recommended')).not.toBeInTheDocument();
  });

  it('calls onSelect when button is clicked', () => {
    const onSelect = jest.fn();
    render(<PlanCard plan={proPlan} isCurrentPlan={false} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Upgrade'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('does not call onSelect for current plan button', () => {
    const onSelect = jest.fn();
    render(<PlanCard plan={proPlan} isCurrentPlan={true} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Current Plan'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('applies blue border for current plan', () => {
    const { container } = render(<PlanCard plan={proPlan} isCurrentPlan={true} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-blue-600');
  });

  it('applies violet border for recommended plan', () => {
    const { container } = render(
      <PlanCard plan={proPlan} isCurrentPlan={false} isRecommended={true} />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-violet-500');
  });

  it('applies gray border for regular plan', () => {
    const { container } = render(<PlanCard plan={freePlan} isCurrentPlan={false} />);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-gray-200');
  });
});
