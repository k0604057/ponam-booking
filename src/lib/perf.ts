// 구간별 소요 시간 계측.
//
// 임시 계측이 아니라 남겨둔다 — 나중에 또 느려진다.
// Vercel 대시보드 Logs 에서 `[perf]` 로 걸러 보면 된다.
//
// 로그 한 줄 형식:  [perf] cleaning:tasks 143ms
// 숫자만 보고 비교할 수 있게 라벨을 `화면:구간` 으로 통일한다.

export async function perf<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    console.log(`[perf] ${label} ${Math.round(performance.now() - t0)}ms`);
  }
}

/** 병렬 구간처럼 fn 으로 감싸기 어려운 곳에서 쓴다. 반환된 함수를 끝에서 호출한다. */
export function perfStart(label: string): () => void {
  const t0 = performance.now();
  return () => console.log(`[perf] ${label} ${Math.round(performance.now() - t0)}ms`);
}
