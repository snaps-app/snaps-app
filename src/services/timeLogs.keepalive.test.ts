import { expect,it,vi } from 'vitest';
vi.mock('./client',()=>({api:{},API_URL:'https://api.example.test',tokenDaSessaoEmCache:()=> 'token'}));
import { encerrarSessaoKeepalive } from './timeLogs';
it('encerra no pagehide com PATCH keepalive e Authorization do cache',()=>{
    const fetch=vi.fn().mockResolvedValue({ok:true});vi.stubGlobal('fetch',fetch);
    encerrarSessaoKeepalive('n','s');
    expect(fetch).toHaveBeenCalledWith('https://api.example.test/agent-executions/n/sessions/s/end',{method:'PATCH',keepalive:true,headers:{Authorization:'Bearer token'}});
    vi.unstubAllGlobals();
});
