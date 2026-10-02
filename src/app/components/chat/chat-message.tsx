import type {Message} from '@/services/types';
import {MensagemComum} from './comum/Conversa';

export function ChatMessage({message,projectId}:{message:Message;index:number;projectId?:string}) {
  return <MensagemComum message={message} projectId={projectId} />;
}
