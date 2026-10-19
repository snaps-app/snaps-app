import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {SecaoOrcamento} from './secao-orcamento';
import {getOrcamento,editarOrcamento} from '@/services/orcamento';
vi.mock('@/services/orcamento',()=>({getOrcamento:vi.fn(),editarOrcamento:vi.fn()}));
const config={enabled:false,daily_limit_usd:'0.50000000',monthly_limit_usd:'5.00000000',timezone:'America/Sao_Paulo',warning_pct:80,lock_version:1,
 windows:[{period:'day',starts_at:'2026-10-19T03:00:00Z',ends_at:'2026-10-20T03:00:00Z',known_usd:'0.40',pending_usd:'0.02',debt_usd:'0.01',coverage:'unknown',warning:true}]};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(getOrcamento).mockResolvedValue(config as any);});
describe('C206 Settings',()=>{
 it('80%, reservas, dívida e cobertura desconhecida não viram saldo zero',async()=>{
  render(<SecaoOrcamento/>);
  expect(await screen.findByText(/80% do teto diário/)).toBeInTheDocument();
  expect(screen.getByText(/Cobertura: desconhecida/)).toBeInTheDocument();
  expect(screen.getByText(/Reservas: US\$ 0.02/)).toBeInTheDocument();
  expect(editarOrcamento).not.toHaveBeenCalled();
 });
 it('409 recarrega versão e não repete edição',async()=>{
  vi.mocked(editarOrcamento).mockRejectedValue({response:{status:409}});
  render(<SecaoOrcamento/>);
  const field=await screen.findByLabelText('Teto diário (US$)');
  fireEvent.change(field,{target:{value:'0.60'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar limites'}));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Outra pessoa/);
  await waitFor(()=>expect(getOrcamento).toHaveBeenCalledTimes(2));
  expect(editarOrcamento).toHaveBeenCalledTimes(1);
 });
});

