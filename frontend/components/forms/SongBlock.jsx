'use client';

import { CheckCircle2, Link2, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBytes } from '@/lib/utils';

function StatusBadge({ filled, t, idx }) {
  if (filled) {
    return (
      <Badge variant="success" data-testid={`song-${idx}-status`}>
        <CheckCircle2 size={14} /> OK
      </Badge>
    );
  }
  return (
    <Badge variant="outline" data-testid={`song-${idx}-status`}>
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      {t('form.pending')}
    </Badge>
  );
}

function UploadDropzone({ idx, t, submitting, onPickFile }) {
  return (
    <label
      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-white px-4 py-6 cursor-pointer hover:bg-sky-50 transition-colors ring-focus"
      htmlFor={`song-${idx}-file`}
      data-testid={`song-${idx}-upload-dropzone`}
    >
      <Upload size={22} className="text-sky-600" />
      <p className="text-sm font-semibold text-slate-800">{t('form.pickFile')}</p>
      <p className="text-xs text-slate-500">{t('form.uploadHint')}</p>
      <input
        id={`song-${idx}-file`}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => onPickFile(e.target.files?.[0])}
        data-testid={`song-${idx}-file-input`}
        disabled={submitting}
      />
    </label>
  );
}

function UploadFileInfo({ idx, file, t, submitting, onChangeClick, onRemove, onPickFile }) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3 justify-between"
      data-testid={`song-${idx}-file-info`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
        <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onChangeClick}
          disabled={submitting}
          data-testid={`song-${idx}-change-file`}
        >
          {t('form.changeFile')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={submitting}
          data-testid={`song-${idx}-remove-file`}
        >
          <X size={14} />
        </Button>
        <input
          id={`song-${idx}-file`}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(e) => onPickFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

export function SongBlock({
  song,
  index,
  t,
  submitting,
  onModeChange,
  onLinkChange,
  onPickFile,
  onRemoveFile,
}) {
  const idx = index + 1;
  const filled = (song.mode === 'upload' && song.file) || (song.mode === 'link' && song.link.trim());

  const triggerNativeFilePicker = () => {
    const el = document.getElementById(`song-${idx}-file`);
    if (el && typeof el.click === 'function') el.click();
  };

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5"
      data-testid={`song-block-${idx}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 font-display font-bold text-slate-900">
            {idx}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {t('form.songLabel').replace('{n}', idx)}
            </p>
            <p className="text-xs text-slate-500">
              {filled ? t('form.uploaded') : t('form.pending')}
            </p>
          </div>
        </div>
        <StatusBadge filled={!!filled} t={t} idx={idx} />
      </div>

      <Tabs
        value={song.mode}
        onValueChange={(v) => onModeChange(v)}
        data-testid={`song-${idx}-mode-tabs`}
      >
        <TabsList>
          <TabsTrigger value="upload" data-testid={`song-${idx}-mode-upload`}>
            <Upload size={14} /> {t('form.modeUpload')}
          </TabsTrigger>
          <TabsTrigger value="link" data-testid={`song-${idx}-mode-link`}>
            <Link2 size={14} /> {t('form.modeLink')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          {!song.file ? (
            <UploadDropzone idx={idx} t={t} submitting={submitting} onPickFile={onPickFile} />
          ) : (
            <UploadFileInfo
              idx={idx}
              file={song.file}
              t={t}
              submitting={submitting}
              onChangeClick={triggerNativeFilePicker}
              onRemove={onRemoveFile}
              onPickFile={onPickFile}
            />
          )}
          {song.error && (
            <p className="mt-2 text-xs text-red-600" data-testid={`song-${idx}-error`}>
              {song.error}
            </p>
          )}
        </TabsContent>

        <TabsContent value="link">
          <Input
            type="url"
            placeholder={t('form.linkPlaceholder')}
            value={song.link}
            onChange={(e) => onLinkChange(e.target.value)}
            disabled={submitting}
            data-testid={`song-${idx}-link-input`}
          />
          <p className="mt-2 text-xs text-slate-500">{t('form.linkHint')}</p>
          {song.error && (
            <p className="mt-1 text-xs text-red-600" data-testid={`song-${idx}-error`}>
              {song.error}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
