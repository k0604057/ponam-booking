import { ImageResponse } from 'next/og';

/**
 * PWA 아이콘. 임시로 단색 배경에 글자만 있는 형태다.
 * maskable 로도 쓰이므로 안쪽 여백(safe zone)을 넉넉히 둔다 — 원형으로 잘려도 글자가 안 잘린다.
 */
export function renderIcon(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#ffffff',
          fontSize: size * 0.42,
          fontWeight: 700,
          letterSpacing: -size * 0.02,
        }}
      >
        PN
      </div>
    ),
    { width: size, height: size }
  );
}
