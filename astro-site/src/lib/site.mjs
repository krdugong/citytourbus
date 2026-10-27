export const SITE_NAME = 'CITYTOURBUS';
export const SITE_URL = (import.meta.env.SITE || 'https://www.citytourbus.kr').replace(/\/$/, '');
export const BASE = import.meta.env.BASE_URL || '/';
export const pathFor = (path = '/') => (`${BASE.replace(/\/$/, '')}${path}`.replace(/(.)\/$/, '$1')) || '/';
export const absolute = (path = '/') => new URL(pathFor(path), SITE_URL).href;
export const textDate = (value) => value ? new Intl.DateTimeFormat('ko-KR', {year:'numeric', month:'long', day:'numeric', timeZone:'Asia/Seoul'}).format(new Date(`${value}T00:00:00+09:00`)) : '';
export const freshness = (value) => {
  if (!value) return '';
  const days = Math.floor((Date.now() - new Date(`${value}T00:00:00+09:00`).getTime()) / 86400000);
  return days >= 90 ? '최근 정보 확인이 필요합니다' : days > 30 ? '재확인 필요' : '';
};
export const imageUrl = (name) => name ? pathFor(`/images/optimized/${name.replace(/\.[^.]+$/, '')}.webp`) : '';
