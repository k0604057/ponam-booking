import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = { title: '로그인 · 포남동 예약관리' };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">포남동 예약관리</h1>
        <p className="mb-8 text-sm text-neutral-500">호스트에게 받은 아이디로 로그인하세요.</p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
