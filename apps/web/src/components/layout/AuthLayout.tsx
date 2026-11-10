import React from 'react';
import { Activity, ShieldCheck, Sparkles } from 'lucide-react';

export const AuthLayout: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="flex min-h-screen bg-fitcore-bg text-white">
    <div className="hidden w-1/2 flex-col justify-between border-r border-fitcore-border bg-[#141618] p-12 lg:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fitcore-accent text-black">
          <Activity className="h-6 w-6 stroke-[2.5]" />
        </div>
        <div>
          <span className="font-['Manrope'] text-xl font-extrabold tracking-tight text-white">
            FITCORE
          </span>
          <p className="text-xs text-fitcore-muted">AI-Powered Gym Ecosystem</p>
        </div>
      </div>

      <div className="max-w-lg space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-fitcore-border bg-fitcore-card px-3.5 py-1.5 text-xs font-medium text-fitcore-accent">
          <Sparkles className="h-3.5 w-3.5" />
          Multi-Tenant SaaS Platform
        </div>
        <h1 className="font-['Manrope'] text-4xl font-extrabold leading-tight tracking-tight text-white">
          Your Gym. Your Goals.{' '}
          <span className="text-fitcore-accent">Your Progress.</span>
        </h1>
        <p className="text-base leading-relaxed text-fitcore-muted">
          Unified operations for gym owners, precision coaching for trainers, and
          AI-assisted training & nutrition tracking for every member across web and mobile.
        </p>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="rounded-2xl border border-fitcore-border bg-fitcore-card p-4">
            <ShieldCheck className="mb-2 h-5 w-5 text-fitcore-accent" />
            <p className="text-sm font-semibold text-white">Tenant-Isolated</p>
            <p className="mt-1 text-xs text-fitcore-muted">
              Role-based access control and strict gym-level data boundaries.
            </p>
          </div>
          <div className="rounded-2xl border border-fitcore-border bg-fitcore-card p-4">
            <Activity className="mb-2 h-5 w-5 text-fitcore-accent" />
            <p className="text-sm font-semibold text-white">Real-Time Tracking</p>
            <p className="mt-1 text-xs text-fitcore-muted">
              Workouts, progressive overload, nutrition logs, and verified analytics.
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-fitcore-muted">
        FITCORE Platform · Secure JWT Rotation · Web, iOS & Android
      </p>
    </div>

    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-fitcore-accent text-black">
            <Activity className="h-5 w-5 stroke-[2.5]" />
          </div>
          <span className="font-['Manrope'] text-xl font-extrabold tracking-tight">FITCORE</span>
        </div>

        <div>
          <h2 className="font-['Manrope'] text-2xl font-bold tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-fitcore-muted">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  </div>
);

