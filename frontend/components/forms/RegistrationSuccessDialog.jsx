'use client';

import { ExternalLink, PartyPopper } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function RegistrationSuccessDialog({ result, onClose, t }) {
  return (
    <Dialog open={!!result} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent data-testid="registration-success-dialog">
        <DialogHeader>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mb-2">
            <PartyPopper size={26} />
          </div>
          <DialogTitle>{t('form.success.title')}</DialogTitle>
          <DialogDescription>{t('form.success.body')}</DialogDescription>
        </DialogHeader>
        {result?.folder_url && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-1 text-sm font-semibold text-slate-800">{t('form.success.folderLabel')}</p>
            <a
              href={result.folder_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-sky-700 hover:underline break-all"
              data-testid="registration-success-folder-link"
            >
              <ExternalLink size={14} /> {result.folder_url}
            </a>
          </div>
        )}
        <p className="text-base text-slate-700 leading-relaxed">{t('form.success.nextSteps')}</p>
        <DialogFooter>
          <Button type="button" onClick={onClose} data-testid="registration-success-close-button">
            {t('form.success.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
