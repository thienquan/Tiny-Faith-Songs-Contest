'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ContactInfoCard({
  t,
  childName,
  parentName,
  email,
  phone,
  errors,
  setChildName,
  setParentName,
  setEmail,
  setPhone,
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sectionInfo')}</CardTitle>
      </CardHeader>
      <CardContent>
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
            {errors.childName && <p className="text-xs text-red-600">{errors.childName}</p>}
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
            {errors.parentName && <p className="text-xs text-red-600">{errors.parentName}</p>}
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
            {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="phone">
              {t('form.phone')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('form.phonePlaceholder')}
              aria-invalid={!!errors.phone}
              data-testid="registration-phone-input"
            />
            {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
