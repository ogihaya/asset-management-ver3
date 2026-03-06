'use client';

import { Input } from '@/shared/ui/shadcn/ui/input';
import { Label } from '@/shared/ui/shadcn/ui/label';

export interface NumberFieldProps {
  id: string;
  label: string;
  value: number | '';
  onChange: (value: number | '') => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: NumberFieldProps) {
  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type='text'
        inputMode='numeric'
        value={value === '' ? '' : value.toString()}
        onChange={(e) => {
          const val = e.target.value;
          if (val === '' || /^[0-9]+$/.test(val)) {
            onChange(val === '' ? '' : Number(val));
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
