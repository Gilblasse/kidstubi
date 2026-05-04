'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarPicker } from '@/components/parent/AvatarPicker';

type Props = {
  action: (formData: FormData) => Promise<void>;
};

export function AddKidDialog({ action }: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) setOpen(false);
  }

  function handleClose() {
    setOpen(false);
    formRef.current?.reset();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add kid"
        className="group flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/50 p-6 text-muted-foreground transition hover:border-primary hover:bg-accent hover:text-foreground"
      >
        <span
          aria-hidden
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-current text-3xl leading-none transition group-hover:scale-105"
        >
          +
        </span>
        <span className="text-sm font-medium">Add kid</span>
      </button>

      <dialog
        ref={dialogRef}
        onClose={handleClose}
        onClick={onDialogClick}
        className="fixed inset-0 m-auto h-fit max-h-[90vh] w-full max-w-md rounded-lg border border-border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/60"
      >
        {open && (
          <div className="flex flex-col">
            <div className="flex items-start gap-3 border-b border-border px-4 py-3">
              <h2 className="min-w-0 flex-1 text-base font-semibold">Add a kid</h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                aria-label="Close"
              >
                Close
              </Button>
            </div>
            <form
              ref={formRef}
              action={action}
              className="space-y-4 px-4 py-4"
            >
              <div>
                <Label htmlFor="add-kid-displayName">Display name</Label>
                <Input
                  id="add-kid-displayName"
                  name="displayName"
                  required
                  maxLength={40}
                  placeholder="e.g. Mika"
                  autoFocus
                />
              </div>
              <AvatarPicker name="avatarKey" idPrefix="new" />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <SubmitButton onSettled={handleClose} />
              </div>
            </form>
          </div>
        )}
      </dialog>
    </>
  );
}

function SubmitButton({ onSettled }: { onSettled: () => void }) {
  const { pending } = useFormStatus();
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      return;
    }
    if (wasPendingRef.current) {
      wasPendingRef.current = false;
      onSettled();
    }
  }, [pending, onSettled]);

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Adding…' : 'Add kid'}
    </Button>
  );
}
