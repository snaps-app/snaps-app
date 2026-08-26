import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Config separada do `vite.config.ts` de proposito: o build precisa do plugin do
// Tailwind, os testes nao, e carrega-lo aqui so acrescentaria tempo de partida a
// cada rodada.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mesmo alias do build. Divergir aqui faria o teste importar um modulo
    // diferente do que a aplicacao importa -- e passar por isso.
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Os e2e do Playwright vivem em tests/e2e e tem outro runner. Sem esta
    // exclusao o vitest tentaria executa-los e falharia no import de
    // '@playwright/test'.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'tests/e2e'],
    // Valores de fachada, nunca credenciais. `createClient` do Supabase roda no
    // import de `services/client`, e sem URL ele LANCA -- entao qualquer teste
    // que alcance a cadeia de servicos falha na coleta, antes do primeiro
    // `it`. Isto e o que impede o modulo de explodir; nenhuma chamada de rede
    // sai daqui, os testes sobem mock do cliente.
    env: {
      VITE_SUPABASE_URL: 'http://supabase.test',
      VITE_SUPABASE_ANON_KEY: 'chave-de-teste',
      VITE_API_URL: 'http://api.test',
    },
  },
});
