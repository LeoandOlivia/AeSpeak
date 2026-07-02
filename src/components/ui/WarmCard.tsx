import type { ReactNode } from 'react';

interface WarmCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function WarmCard({ children, onClick, className = '', padding = 'md' }: WarmCardProps) {
  const pad = { sm: 'p-3', md: 'p-4', lg: 'p-5' }[padding];
  const base = `rounded-2xl bg-[var(--color-bg-elevated)] shadow-sm ${pad} ${className}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} w-full text-left transition active:opacity-80`}
      >
        {children}
      </button>
    );
  }

  return <div className={base}>{children}</div>;
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  type?: 'button' | 'submit';
}) {
  const variants = {
    primary: 'bg-[#007AFF] text-white',
    secondary: 'bg-[#34C759] text-white',
    outline: 'bg-[var(--color-fill-secondary)] text-[var(--color-label)]',
    ghost: 'text-[#007AFF] bg-[var(--color-fill-secondary)]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-[15px] font-semibold transition active:opacity-80 disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
