'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Component imports ----------------------------------- */
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from 'components/ui/alert-dialog';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';

/* ConfirmDialog component prop types ------------------ */
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  /** The exact string the user must type to enable the confirm button. */
  confirmPhrase: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
}

/* ConfirmDialog component ----------------------------- */
const ConfirmDialog: React.FC<ConfirmDialogProps> = (
  {
    open,
    onOpenChange,
    title,
    description,
    confirmPhrase,
    confirmLabel,
    onConfirm,
    pending = false,
  },
) => {
  const [typed, setTyped] = useState<string>('');
  const matches: boolean = typed === confirmPhrase;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next): void => {
        if(!next) {
          setTyped('');
        }
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirm-phrase">
            {`Tapez « ${confirmPhrase} » pour confirmer`}
          </Label>
          <Input
            id="confirm-phrase"
            value={typed}
            onChange={(e): void => setTyped(e.target.value)}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={!matches || pending}
            onClick={(e): void => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/* Export ConfirmDialog component ---------------------- */
export default ConfirmDialog;
