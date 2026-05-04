'use client';

import { Loader2, Search, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ContactInfoCard({
  t,
  childName,
  parentName,
  email,
  phone,
  lookupState,
  lookupError,
  errors,
  setChildName,
  setParentName,
  setEmail,
  onPhoneChange,
  onCheckPhone,
}) {
  const checkingPhone = lookupState === 'checking';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sectionInfo')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">
              {t('form.phone')} <span className="text-red-500">*</span>
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder={t('form.phonePlaceholder')}
                aria-invalid={!!errors.phone}
                data-testid="registration-phone-input"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={onCheckPhone}
                disabled={checkingPhone}
                data-testid="registration-phone-check-button"
              >
                {checkingPhone ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {checkingPhone ? t('form.lookup.checking') : t('form.lookup.check')}
              </Button>
            </div>
            {errors.phone && <p className="text-sm font-medium text-red-700">{errors.phone}</p>}
            {lookupError && <p className="text-sm font-medium text-red-700">{lookupError}</p>}
            {lookupState === 'found' && (
              <p className="text-sm font-medium text-emerald-800 inline-flex items-center gap-1">
                <UserCheck size={14} /> {t('form.lookup.returningHint')}
              </p>
            )}
            {lookupState === 'new' && (
              <p className="text-sm font-medium text-slate-700">{t('form.lookup.newHint')}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="childName">
              {t('form.childName')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="childName"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder={t('form.childNamePlaceholder')}
              aria-invalid={!!errors.childName}
              data-testid="registration-child-name-input"
            />
            {errors.childName && <p className="text-sm font-medium text-red-700">{errors.childName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="parentName">
              {t('form.parentName')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="parentName"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              placeholder={t('form.parentNamePlaceholder')}
              aria-invalid={!!errors.parentName}
              data-testid="registration-parent-name-input"
            />
            {errors.parentName && <p className="text-sm font-medium text-red-700">{errors.parentName}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">
              {t('form.email')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('form.emailPlaceholder')}
              aria-invalid={!!errors.email}
              data-testid="registration-email-input"
            />
            {errors.email && <p className="text-sm font-medium text-red-700">{errors.email}</p>}
            <p className="text-sm text-slate-500">{t('form.lookup.emailHint')}</p>
          </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
