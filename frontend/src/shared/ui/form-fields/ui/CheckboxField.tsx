'use client';

import { Checkbox } from '@/shared/ui/shadcn/ui/checkbox';
import { Label } from '@/shared/ui/shadcn/ui/label';

export interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
  disabled,
  className,
}: CheckboxFieldProps) {
  return (
    <div className={`flex items-center space-x-2 ${className ?? ''}`}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(Boolean(value))}
        disabled={disabled}
      />
      <Label
        htmlFor={id}
        className='cursor-pointer'
        onClick={() => !disabled && onChange(!checked)}
      >
        {label}
      </Label>
    </div>
  );
}
