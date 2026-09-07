'use client';
import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import {
  ArrowRight,
  CalendarPlus,
  Download,
  Trash2,
  Upload,
  Check,
} from 'lucide-react';
import {
  type Receipt,
  RECEIPT_KEY,
  api,
  downloadText,
  receiptSchema,
  storeReceipt,
} from '@/lib/client';
import { PersonalSummary } from './personal-summary';
import { CITY_BY_ID } from '@/lib/cities';
export function ReceiptDialog({
  open,
  onClose,
  receipt,
  revealed,
  onExplore,
  onRecover,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  receipt: Receipt | null;
  revealed: boolean;
  onExplore: () => void;
  onRecover: () => void;
  onChange: (receipt: Receipt | null) => void;
}) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [deleted, setDeleted] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  async function remove() {
    if (!receipt) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/session');
      const result = await api<{ deleted: boolean }>('/api/signals/delete', {
        method: 'POST',
        body: JSON.stringify({
          id: receipt.id,
          deletionToken: receipt.deletionToken,
        }),
      });
      if (!result.deleted) {
        setConfirm(false);
        setError(
          'No matching report was deleted. It may already be removed, or the receipt may not match. Your receipt has been kept.',
        );
        return;
      }
      try {
        localStorage.removeItem(RECEIPT_KEY);
      } catch {}
      onChange(null);
      setConfirm(false);
      setDeleted(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not delete the report. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogContent className="receipt-dialog">
          <DialogTitle className="survey-title">Your saved report.</DialogTitle>
          <DialogDescription className="survey-description">
            Your answer summary and private deletion receipt. Keep this receipt
            to withdraw your response.
          </DialogDescription>
          {receipt ? (
            <>
              <span className="receipt-city-label">
                {CITY_BY_ID.get(receipt.cityId)?.name ?? receipt.cityId} · YOUR
                RESPONSE
              </span>
              <PersonalSummary receipt={receipt} />
              {revealed ? (
                <button className="button primary" onClick={onExplore}>
                  Explore community results <ArrowRight size={18} />
                </button>
              ) : (
                <a href="/api/reminder" className="button primary">
                  <CalendarPlus size={18} /> Add reveal to calendar
                </a>
              )}
              <button
                className="button outline"
                onClick={() =>
                  downloadText(
                    'mixed-signals-private-receipt.json',
                    JSON.stringify(receipt, null, 2),
                    'application/json',
                  )
                }
              >
                <Download size={18} /> Download private receipt
              </button>
              <p className="receipt-warning">
                Your receipt can delete your report. Keep it private. Removing
                your report after the reveal does not change the frozen
                anonymous city summary.
              </p>
              <button
                className="delete-button"
                onClick={() => setConfirm(true)}
              >
                <Trash2 size={15} /> Delete my report
              </button>
            </>
          ) : (
            <>
              {deleted && (
                <output className="success-message">
                  <Check size={18} /> Your private report is deleted.
                </output>
              )}
              <p>
                No receipt on this device. If you saved one earlier, restore it
                below. The file is read locally and never uploaded.
              </p>
              <button className="text-link" onClick={onRecover}>
                Check this browser for an interrupted submission
              </button>
              <input
                ref={file}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                aria-label="Restore private receipt"
                onChange={async (e) => {
                  const selected = e.target.files?.[0];
                  if (!selected) return;
                  setError('');
                  try {
                    if (selected.size > 4096)
                      throw new Error('That file is too large for a receipt.');
                    const parsed = receiptSchema.safeParse(
                      JSON.parse(await selected.text()),
                    );
                    if (!parsed.success)
                      throw new Error(
                        'That is not a valid receipt for this survey.',
                      );
                    storeReceipt(parsed.data);
                    onChange(parsed.data);
                    setDeleted(false);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : 'Could not read receipt.',
                    );
                  }
                  e.target.value = '';
                }}
              />
              <button
                className="button outline"
                onClick={() => file.current?.click()}
              >
                <Upload size={17} /> Restore a saved receipt
              </button>
            </>
          )}
          {error && !confirm && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={confirm}
        onOpenChange={(v) => {
          if (!busy) setConfirm(v);
        }}
      >
        <AlertDialogContent className="confirm-dialog">
          <AlertDialogTitle>Delete your private report?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the raw report. A city summary already
            frozen at the reveal will stay the same.
          </AlertDialogDescription>
          {error && confirm && <p role="alert">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              Keep my report
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={remove}
              className="delete-confirm"
            >
              {busy ? 'Deleting…' : 'Delete report'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
