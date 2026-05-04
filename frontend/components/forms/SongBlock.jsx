'use client';

import { CheckCircle2, Link2, Loader2, RefreshCw, Upload, X } from 'lucide-react';
import { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatBytes } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Upload-mode sub-components                                           */
/* ------------------------------------------------------------------ */

function UploadDropzone({ idx, t, uploading, onPickFile }) {
  return (
    <label
      className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-white px-4 py-6 cursor-pointer hover:bg-sky-50 transition-colors ring-focus"
      htmlFor={`song-${idx}-file`}
      data-testid={`song-${idx}-upload-dropzone`}
    >
      <Upload size={22} className="text-sky-600" />
      <p className="text-base font-semibold text-slate-800">{t('form.pickFile')}</p>
      <p className="text-sm font-medium text-slate-600">{t('form.uploadHint')}</p>
      <input
        id={`song-${idx}-file`}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => onPickFile(e.target.files?.[0])}
        data-testid={`song-${idx}-file-input`}
        disabled={uploading}
      />
    </label>
  );
}

function UploadFileInfo({ idx, file, t, uploading, uploadState, onChangeClick, onRemove, onPickFile, onUpload }) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3"
      data-testid={`song-${idx}-file-info`}
    >
      <div className="flex items-center gap-3 justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold text-slate-800 truncate">{file.name}</p>
          <p className="text-sm font-medium text-slate-600">{formatBytes(file.size)}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onChangeClick}
            disabled={uploading}
            data-testid={`song-${idx}-change-file`}
          >
            {t('form.changeFile')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={uploading}
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

      {uploadState?.status === 'uploading' ? (
        <div className="space-y-1">
          <Progress value={uploadState.progress} className="h-2" />
          <p className="text-sm font-medium text-slate-600 text-center">
            {t('form.songUploading').replace('{n}', idx)} — {uploadState.progress}%
          </p>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          className="w-full"
          onClick={onUpload}
          disabled={uploading}
          data-testid={`song-${idx}-upload-btn`}
        >
          {uploading ? (
            <><Loader2 size={14} className="animate-spin" /> {t('form.uploading')}</>
          ) : (
            <><Upload size={14} /> {t('form.songUploadBtn')}</>
          )}
        </Button>
      )}

      {uploadState?.status === 'error' && uploadState.error && (
        <p className="text-sm font-medium text-red-700" data-testid={`song-${idx}-error`}>
          {uploadState.error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Already-uploaded card                                                */
/* ------------------------------------------------------------------ */

function UploadedCard({ idx, t, onReplace }) {
  return (
    <div
      className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col gap-3"
      data-testid={`song-${idx}-uploaded-card`}
    >
      <div className="flex items-center gap-3">
        <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
        <div>
          <p className="text-base font-semibold text-emerald-900">
            {t('form.songAlreadyUploaded')}
          </p>
          <p className="mt-0.5 text-sm font-medium text-emerald-800">{t('form.songReplaceHint')}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReplace}
        data-testid={`song-${idx}-replace-btn`}
        className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
      >
        <RefreshCw size={14} /> {t('form.songReplaceBtn')}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main SongBlock                                                       */
/* ------------------------------------------------------------------ */

export function SongBlock({
  song,
  index,
  t,
  uploadState,
  onModeChange,
  onLinkChange,
  onPickFile,
  onRemoveFile,
  onUploadFile,
  onSubmitLink,
  onReplace,
}) {
  const idx = index + 1;
  const uploading = uploadState?.status === 'uploading';
  const linkInputRef = useRef(null);

  const triggerNativeFilePicker = () => {
    const el = document.getElementById(`song-${idx}-file`);
    if (el) el.click();
  };

  if (song.uploaded) {
    return <UploadedCard idx={idx} t={t} onReplace={onReplace} />;
  }

  return (
    <div data-testid={`song-block-${idx}`}>
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

        <TabsContent value="upload" className="mt-3">
          {!song.file ? (
            <UploadDropzone idx={idx} t={t} uploading={uploading} onPickFile={onPickFile} />
          ) : (
            <UploadFileInfo
              idx={idx}
              file={song.file}
              t={t}
              uploading={uploading}
              uploadState={uploadState}
              onChangeClick={triggerNativeFilePicker}
              onRemove={onRemoveFile}
              onPickFile={onPickFile}
              onUpload={() => onUploadFile(song.file)}
            />
          )}
          {song.error && (
            <p className="mt-2 text-sm font-medium text-red-700" data-testid={`song-${idx}-error`}>
              {song.error}
            </p>
          )}
        </TabsContent>

        <TabsContent value="link" className="mt-3 space-y-2">
          <Input
            ref={linkInputRef}
            type="url"
            placeholder={t('form.linkPlaceholder')}
            value={song.link}
            onChange={(e) => onLinkChange(e.target.value)}
            disabled={uploading}
            data-testid={`song-${idx}-link-input`}
          />
          <p className="text-sm font-medium text-slate-600">{t('form.linkHint')}</p>
          {song.error && (
            <p className="text-sm font-medium text-red-700" data-testid={`song-${idx}-error`}>
              {song.error}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => onSubmitLink(song.link)}
            disabled={uploading || !song.link.trim()}
            data-testid={`song-${idx}-submit-link-btn`}
          >
            {uploading ? (
              <><Loader2 size={14} className="animate-spin" /> {t('form.uploading')}</>
            ) : (
              <><Link2 size={14} /> {t('form.songSubmitLinkBtn')}</>
            )}
          </Button>

          {uploadState?.status === 'uploading' && (
            <div className="space-y-1">
              <Progress value={uploadState.progress} className="h-2" />
            </div>
          )}
          {uploadState?.status === 'error' && uploadState.error && (
            <p className="text-sm font-medium text-red-700">{uploadState.error}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
