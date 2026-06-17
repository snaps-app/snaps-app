import { api } from './client';

/**
 * Upload a file to the shared 'issues-attachments' bucket via the authenticated
 * backend endpoint and return its public URL. Use the URL to embed the file as
 * Markdown in a card description.
 */
export const uploadAttachment = async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    // Clear the JSON default so the browser sets multipart/form-data WITH the
    // boundary (setting it manually would omit the boundary and break parsing).
    const response = await api.post('/storage/upload', form, {
        headers: { 'Content-Type': undefined as any },
    });
    return response.data;
};
