import { headers } from 'next/headers';

/**
 * 미들웨어가 이미 getUser() 로 검증한 신원을 요청 헤더로 넘겨준다.
 * 페이지에서 getUser() + profiles 를 다시 부르면 Supabase 왕복이 2회씩 더 붙는다 —
 * 리전이 멀면 그것만으로 수백 ms 다.
 *
 * 클라이언트가 같은 이름의 헤더를 보내도 미들웨어가 무조건 지우고 덮어쓰므로 위조할 수 없다.
 * 그리고 이 값은 화면을 그리는 데만 쓴다. 데이터 접근 통제는 여전히 RLS 가 한다.
 */
export const VIEWER_ID_HEADER = 'x-ponam-user';
export const VIEWER_ROLE_HEADER = 'x-ponam-role';

export type Viewer = {
  id: string | null;
  role: string | null;
  isOwner: boolean;
};

export async function getViewer(): Promise<Viewer> {
  const h = await headers();
  const id = h.get(VIEWER_ID_HEADER);
  const role = h.get(VIEWER_ROLE_HEADER);
  return { id: id || null, role: role || null, isOwner: role === 'owner' };
}
