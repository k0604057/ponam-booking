'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Viewer } from './types';

const BUCKET = 'cleaning-photos';
const MAX_EDGE = 1600;
const QUALITY = 0.8;
const SIGNED_URL_TTL = 60 * 60; // 1시간

type Photo = { id: string; path: string; url: string | null; uploadedBy: string | null };

/**
 * 폰 원본은 3~5MB라 그대로 올리면 느리고 스토리지가 금방 찬다.
 * 긴 변 1600px, JPEG 0.8 로 줄여서 올린다.
 */
async function resize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지를 처리하지 못했습니다.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) throw new Error('이미지를 처리하지 못했습니다.');
  return blob;
}

/** setState 를 하지 않는 순수 조회. 이펙트 본문에서 동기적으로 상태를 건드리지 않기 위해 분리했다. */
async function fetchPhotos(taskId: string): Promise<Photo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cleaning_photos')
    .select('id, storage_path, uploaded_by')
    .eq('cleaning_task_id', taskId)
    .order('created_at', { ascending: true });

  if (error || !data?.length) return [];

  const paths = data.map((p) => p.storage_path);
  // 버킷이 비공개라 public URL 은 안 된다. 서명 URL 로만 볼 수 있다.
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);

  return data.map((p, i) => ({
    id: p.id,
    path: p.storage_path,
    url: signed?.[i]?.signedUrl ?? null,
    uploadedBy: p.uploaded_by,
  }));
}

export default function PhotoSection({
  taskId,
  canUpload,
  viewer,
}: {
  taskId: string;
  canUpload: boolean;
  viewer: Viewer;
}) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<File[]>([]);
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setPhotos(await fetchPhotos(taskId));
  }, [taskId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchPhotos(taskId);
      if (!cancelled) setPhotos(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  // RLS: 올린 본인과 owner 만 지울 수 있다. 남의 사진에는 버튼을 아예 안 그린다.
  const canDelete = (p: Photo) => viewer.isOwner || (!!viewer.id && p.uploadedBy === viewer.id);

  async function upload(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setError(null);
    setFailed([]);
    setProgress({ done: 0, total: files.length });

    const supabase = createClient();
    const stillFailed: File[] = [];

    for (const [i, file] of files.entries()) {
      try {
        const blob = await resize(file);
        const path = `${taskId}/${crypto.randomUUID()}.jpg`;

        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType: 'image/jpeg',
        });
        if (upErr) throw upErr;

        const { error: insErr } = await supabase.from('cleaning_photos').insert({
          cleaning_task_id: taskId,
          storage_path: path,
          uploaded_by: viewer.id,
        });
        if (insErr) throw insErr;
      } catch (err) {
        stillFailed.push(file);
        setError(toKorean(err));
      }
      setProgress({ done: i + 1, total: files.length });
    }

    setFailed(stillFailed);
    setProgress(null);
    setBusy(false);
    await load();
  }

  async function remove(photo: Photo) {
    setBusy(true);
    setError(null);

    const supabase = createClient();

    // 스토리지를 먼저 지운다. DB 행만 지우면 파일이 고아로 남는다.
    const { error: storageErr } = await supabase.storage.from(BUCKET).remove([photo.path]);
    if (storageErr) {
      setBusy(false);
      setError('사진 파일을 지우지 못했습니다. 목록은 그대로 두었습니다.');
      return;
    }

    const { error: dbErr } = await supabase.from('cleaning_photos').delete().eq('id', photo.id);
    setBusy(false);
    if (dbErr) {
      setError('파일은 지웠지만 목록에서 제거하지 못했습니다. 새로고침 후 다시 시도해주세요.');
      return;
    }

    setConfirming(false);
    setViewing(null);
    await load();
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-neutral-500">사진</h3>

      {photos === null ? (
        <p className="text-sm text-neutral-400">불러오는 중…</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-neutral-400">등록된 사진이 없습니다.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setViewing(p);
                  setConfirming(false);
                }}
                className="aspect-square w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800"
              >
                {p.url ? (
                  // 서명 URL 이라 next/image 최적화 대상이 아니다.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt="청소 사진" className="size-full object-cover" loading="lazy" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              void upload(files);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="mt-3 h-12 w-full rounded-xl border border-neutral-300 text-sm font-semibold disabled:opacity-60 dark:border-neutral-700"
          >
            {busy && progress ? `업로드 중… ${progress.done}/${progress.total}` : '사진 찍어 올리기'}
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {failed.length > 0 && !busy && (
        <button
          type="button"
          onClick={() => void upload(failed)}
          className="mt-2 h-11 w-full rounded-xl border border-red-300 text-sm font-semibold text-red-700 dark:border-red-800 dark:text-red-300"
        >
          실패한 {failed.length}장 다시 시도
        </button>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-[80] flex flex-col justify-center bg-black/90 px-4"
          onClick={() => setViewing(null)}
        >
          {viewing.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewing.url} alt="청소 사진" className="max-h-[70dvh] w-full object-contain" />
          )}
          <div
            className="mt-6 flex flex-col gap-2"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {confirming ? (
              <>
                <p className="text-center text-sm text-white">이 사진을 삭제할까요?</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(viewing)}
                  className="h-13 min-h-[52px] w-full rounded-xl bg-red-600 text-base font-bold text-white disabled:opacity-60"
                >
                  {busy ? '삭제 중…' : '삭제'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="h-12 w-full rounded-xl text-sm font-semibold text-neutral-300"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                {canDelete(viewing) && (
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    className="h-13 min-h-[52px] w-full rounded-xl border border-red-400 text-base font-bold text-red-300"
                  >
                    삭제
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  className="h-12 w-full rounded-xl text-sm font-semibold text-neutral-300"
                >
                  닫기
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function toKorean(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/row-level security|policy|denied|violates/i.test(raw)) {
    return '이 청소 건에는 사진을 올릴 수 없습니다. 내가 맡은 건인지 확인해주세요.';
  }
  if (/payload too large|exceeded/i.test(raw)) return '사진 용량이 너무 큽니다.';
  if (/network|fetch|timeout/i.test(raw)) return '네트워크 연결을 확인해주세요.';
  return '사진을 올리지 못했습니다. 다시 시도해주세요.';
}
