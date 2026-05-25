import { useState, useCallback } from 'react';

export interface AiRecognitionData {
    'ID / SKU': string;
    'Název': string;
    'Kategorie': string;
    'Umístění': string;
    'Množství': string;
    'Jednotka': string;
    'Poznámka': string;
}

interface UseAiRecognitionReturn {
    recognizeImages: (images: File[], categories: string[]) => Promise<AiRecognitionData | null>;
    isRecognizing: boolean;
    error: string | null;
}

export function useAiRecognition(): UseAiRecognitionReturn {
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const recognizeImages = useCallback(async (images: File[], categories: string[]): Promise<AiRecognitionData | null> => {
        if (images.length === 0) {
            setError('No images provided');
            return null;
        }

        setIsRecognizing(true);
        setError(null);

        try {
            // Convert all images to base64
            const imageData = await Promise.all(
                images.map(async (file) => ({
                    base64: await fileToBase64(file),
                    mimeType: file.type
                }))
            );

            const response = await fetch('/api/ai-recognition', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images: imageData, categories })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to recognize images');
            }

            const result = await response.json();

            if (result.success && result.data) {
                return result.data as AiRecognitionData;
            } else {
                throw new Error('Invalid response from AI service');
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('AI recognition error:', err);
            return null;
        } finally {
            setIsRecognizing(false);
        }
    }, []);

    return {
        recognizeImages,
        isRecognizing,
        error
    };
}
