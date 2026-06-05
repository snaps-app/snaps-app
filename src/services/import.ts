import { AGENT_URL } from './client';

export const importDocument = async (
    projectId: string, 
    fileName: string, 
    fileContent: string, 
    onEvent: (event: any) => void
) => {
    const message = `IMPORT_FILE: ${fileName}\nContent:\n${fileContent}`;
    // Use the dedicated /import endpoint
    console.log('[API] importDocument calling /import:', { projectId, fileName });

    const response = await fetch(`${AGENT_URL}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, message })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[API] importDocument error:', { status: response.status, body: errorText });
        throw new Error(`Import API Error ${response.status}: ${errorText}`);
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
