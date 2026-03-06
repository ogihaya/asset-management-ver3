'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/shadcn/ui/alert-dialog';

export interface SimpleDeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function SimpleDeleteConfirmModal({
  open,
  onOpenChange,
  title = '削除の確認',
  description,
  itemName,
  cancelLabel = 'キャンセル',
  confirmLabel = '削除',
  onConfirm,
}: SimpleDeleteConfirmModalProps) {
  const defaultDescription = itemName
    ? `「${itemName}」を削除しますか？この操作は取り消せません。`
    : 'このデータを削除しますか？この操作は取り消せません。';

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
