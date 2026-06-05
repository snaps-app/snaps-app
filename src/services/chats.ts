import { api, AGENT_URL } from './client';
import type { Chat, Message } from './types';

export const createChat = async (projectId: string, title: string): Promise<Chat> => {
    const response = await api.post(`/projects/${projectId}/chats/`, { project_id: projectId, title });
    return response.data;
};

export const listChats = async (projectId: string): Promise<Chat[]> => {
    const response = await api.get(`/projects/${projectId}/chats/`);
    return response.data;
};

export const getChatHistory = async (chatId: string): Promise<Message[]> => {
    const response = await api.get(`/chats/${chatId}/history`);
    return response.data;
};

export const createMessage = async (chatId: string, content: string, role: 'user' | 'assistant' = 'user'): Promise<Message> => {
    const response = await api.post(`/chats/${chatId}/messages/`, { chat_id: chatId, content, role });
    return response.data;
};

export const streamChat = async (projectId: string, message: string, onEvent: (event: any) => void) => {
    console.log('[API] streamChat calling:', { projectId, message });
    const response = await fetch(`${AGENT_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[API] streamChat error:', { status: response.status, body: errorText });
        throw new Error(`Chat API Error ${response.status}: ${errorText}`);
    }

    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.slice(6));
                    onEvent(data);
                } catch (e) {
                    console.error("Error parsing SSE chunk:", e);
                }
            }
        }
    }
};
