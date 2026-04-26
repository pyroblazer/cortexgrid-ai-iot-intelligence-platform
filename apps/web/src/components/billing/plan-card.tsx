'use client';

import React from 'react';

interface PlanCardProps {
  plan: {
    type: string;
    name: string;
    monthlyPrice: number;
    features: string[];
    limits: { devices: number; teamMembers: number; aiQueries: number; storageMb: number };
  };
  isCurrentPlan: boolean;
  isRecommended?: boolean;
  onSelect?: () => void;
}

export function PlanCard({ plan, isCurrentPlan, isRecommended, onSelect }: PlanCardProps) {
  return (
    <div
      className={`relative rounded-xl border-2 p-6 ${
        isCurrentPlan
          ? 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
          : isRecommended
          ? 'border-violet-500 bg-violet-50 dark:border-violet-400 dark:bg-violet-900/20'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-semibold text-white">
          Recommended
        </div>
      )}

      <div className="text-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
        <div className="mt-4">
          <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
            ${plan.monthlyPrice}
          </span>
          <span className="text-sm text-gray-500">/month</span>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-green-500">
              <path d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {isCurrentPlan ? (
          <button
            disabled
            className="w-full rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          >
            Current Plan
          </button>
        ) : (
          <button
            onClick={onSelect}
            className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              isRecommended
                ? 'bg-violet-600 hover:bg-violet-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {plan.monthlyPrice === 0 ? 'Get Started' : 'Upgrade'}
          </button>
        )}
      </div>
    </div>
  );
}
