/** `next` do login: so caminho do proprio app passa (SNA-SUP-84). */
import { describe, expect, it } from 'vitest';
import { loginComNext, safeNext } from './safeNext';

describe('safeNext', () => {
  it('mantem caminho interno com query string e hash', () => {
    expect(safeNext('/project/p1/execution/e1?tab=log#fim')).toBe('/project/p1/execution/e1?tab=log#fim');
  });

  it('sem next cai no Dashboard', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext('')).toBe('/');
  });

  it.each([
    '//evil.com',
    '//evil.com/project/p1',
    '/\\evil.com',
    '/\\/evil.com',
    'https://evil.com',
    'http:evil.com',
    'javascript:alert(1)',
    'project/p1',
    '/\tevil',
  ])('recusa destino fora do app: %s', (destino) => {
    expect(safeNext(destino)).toBe('/');
  });

  it('nao devolve para o proprio login', () => {
    expect(safeNext('/login?next=/x')).toBe('/');
  });

  it('ida e volta pelo loginComNext preserva o destino', () => {
    const url = new URL(loginComNext('/project/p1/execution/e1?tab=log'), 'http://app.test');
    expect(safeNext(url.searchParams.get('next'))).toBe('/project/p1/execution/e1?tab=log');
  });
});
