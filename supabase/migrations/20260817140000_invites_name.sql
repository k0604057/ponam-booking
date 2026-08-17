-- 20260817140000_invites_name.sql
-- 초대 시 이름을 미리 받아둔다. 성격: 추가형

alter table public.invites add column name text not null default '';

comment on table public.invites is
  '초대 링크. token_hash 에는 SHA-256 해시만 저장하고 원문 토큰은 생성 직후 한 번만 화면에 보여준다. '
  'email 컬럼에는 아이디 초대의 경우 내부 이메일(<아이디>@ponam.local)이 들어간다.';
