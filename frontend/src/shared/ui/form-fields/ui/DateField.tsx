'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/ui/button';
import { Calendar } from '@/shared/ui/shadcn/ui/calendar';
import { Label } from '@/shared/ui/shadcn/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/shadcn/ui/popover';
import { cn } from '@/shared/ui/shadcn/lib/utils';

export interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateField({
  id,
  label,
  value,
  onChange,
  placeholder = '日付を選択',
  disabled,
  className,
}: DateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dateValue = value ? new Date(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
    }
    setIsOpen(false);
  };

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant='outline'
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !dateValue && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className='mr-2 h-4 w-4' />
            {dateValue
              ? format(dateValue, 'yyyy年MM月dd日', { locale: ja })
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <Calendar
            mode='single'
            selected={dateValue}
            onSelect={handleSelect}
            locale={ja}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
