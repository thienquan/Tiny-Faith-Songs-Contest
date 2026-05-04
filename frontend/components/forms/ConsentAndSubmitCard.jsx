'use client';

import { AlertCircle, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  SUBMIT_BUTTON_STATE,
  getSubmitButtonState,
} from '@/lib/registration-form-utils';

function renderSubmitLabel({ buttonState, t }) {
  if (buttonState === SUBMIT_BUTTON_STATE.SUBMITTING) {
    return (
      <>
        <Loader2 className="animate-spin" size={18} />
        {t('form.submitting')}
      </>
    );
  }
  if (buttonState === SUBMIT_BUTTON_STATE.RETRY) {
    return t('form.error.retry');
  }
  return t('form.submit');
}

export function ConsentAndSubmitCard({
  t,
  consent,
  setConsent,
  errors,
  submitting,
  retryAvailable,
  submissionError,
  progress,
  onCancel,
  locale,
  hideSubmitButton = false,
}) {
  const buttonState = getSubmitButtonState({ submitting, retryAvailable });
  const consentItems = t('form.privacyNoteItems');

  return (
    <Card>
      <CardContent className="p-5 sm:p-6 pt-5 sm:pt-6 space-y-4">
        <label
          htmlFor="consent"
          className="flex items-start gap-3 cursor-pointer"
          data-testid="registration-consent-row"
        >
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(v) => setConsent(!!v)}
            data-testid="registration-consent-checkbox"
          />
          <span className="text-sm text-slate-700 leading-relaxed">{t('form.consent')}</span>
        </label>
        {errors.consent && (
          <p className="text-xs text-red-600" data-testid="registration-consent-error">
            {errors.consent}
          </p>
        )}

        {submissionError && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3"
            data-testid="registration-submission-error"
          >
            <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={18} />
            <div className="text-sm text-red-700">
              <p className="font-semibold">{t('form.error.title')}</p>
              <p className="mt-1 break-words">{submissionError}</p>
            </div>
          </div>
        )}

        {submitting && (
          <div
            className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/60 p-4"
            data-testid="registration-progress-block"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-sky-900 inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} /> {t('form.submitting')}
              </span>
              <span
                className="font-display font-bold text-sky-700"
                data-testid="registration-progress-percent"
              >
                {progress}%
              </span>
            </div>
            <Progress value={progress} data-testid="registration-progress-bar" />
            <p className="text-xs text-slate-600">{t('form.submittingHint')}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {!hideSubmitButton && (
            <Button
              type="submit"
              size="xl"
              disabled={submitting}
              className="w-full sm:w-auto"
              data-testid="registration-submit-button"
            >
              {renderSubmitLabel({ buttonState, t })}
            </Button>
          )}
          {submitting && (
            <Button
              type="button"
              variant="ghost"
              size="xl"
              onClick={onCancel}
              data-testid="registration-cancel-button"
            >
              <X size={16} /> {locale === 'vi' ? 'Hủy' : 'Cancel'}
            </Button>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
          <p className="flex items-start gap-2 font-semibold text-slate-800">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-sky-700" />
            <span>{t('form.privacyNote')}</span>
          </p>
          <ul className="mt-3 space-y-2 pl-6 list-disc text-slate-600">
            {consentItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
