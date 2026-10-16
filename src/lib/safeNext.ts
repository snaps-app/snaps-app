/**
 * Destino pos-login vindo de `?next=` (SNA-SUP-84).
 *
 * O `next` chega da URL, entao e entrada do usuario: aceitar qualquer valor
 * faria de `/login?next=https://evil.com` um open redirect com a cara do app.
 * So passa caminho relativo do proprio app; qualquer outra coisa cai no
 * Dashboard.
 */
export const DESTINO_PADRAO = '/';

export function safeNext(raw: string | null | undefined): string {
    if (!raw) return DESTINO_PADRAO;
    // `//host` e `/\host` sao relativos a protocolo para o navegador: saem do app.
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return DESTINO_PADRAO;
    // Barra invertida e caractere de controle nao existem numa rota nossa, e o
    // navegador normaliza ambos de formas que reabrem o `//`.
    // eslint-disable-next-line no-control-regex
    if (/[\\\u0000-\u001f\u007f]/.test(raw)) return DESTINO_PADRAO;

    let url: URL;
    try {
        url = new URL(raw, window.location.origin);
    } catch {
        return DESTINO_PADRAO;
    }
    if (url.origin !== window.location.origin) return DESTINO_PADRAO;
    // Voltar para o login depois de entrar so prenderia o usuario num laco.
    if (url.pathname === '/login' || url.pathname.startsWith('/login/')) return DESTINO_PADRAO;

    return url.pathname + url.search + url.hash;
}

/** URL do login guardando `destino` para voltar a ele depois de entrar. */
export function loginComNext(destino: string): string {
    return `/login?next=${encodeURIComponent(destino)}`;
}
