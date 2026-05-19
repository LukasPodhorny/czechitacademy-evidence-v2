import { useState, useCallback, useRef, useEffect } from 'react';
import type { Item } from './useItems';

interface UseAiSearchReturn {
    aiResults: number[] | null;
    aiLoading: boolean;
    aiError: string | null;
    rateLimited: boolean;
    retryCountdown: number;
    search: (query: string, items: Item[]) => Promise<void>;
    reset: () => void;
}

export function useAiSearch(): UseAiSearchReturn {
    const [aiResults, setAiResults] = useState<number[] | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [rateLimited, setRateLimited] = useState(false);
    const [retryCountdown, setRetryCountdown] = useState(0);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, []);

    const startCountdown = useCallback(() => {
        setRetryCountdown(10);

        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }

        countdownIntervalRef.current = setInterval(() => {
            setRetryCountdown((prev) => {
                if (prev <= 1) {
                    if (countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const search = useCallback(async (query: string, items: Item[]) => {
        if (!query.trim() || items.length === 0) {
            setAiResults(null);
            return;
        }

        try {
            setAiLoading(true);
            setAiError(null);
            setRateLimited(false);

            const response = await fetch('/api/ai-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query, items }),
            });

            if (response.status === 429) {
                setRateLimited(true);
                startCountdown();
                throw new Error('AI search is rate limited. Please try again later.');
            }

            if (response.status === 504) {
                throw new Error('AI search timed out. Please try again.');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'AI search failed');
            }

            const data = await response.json();
            setAiResults(data.indices || []);
        } catch (err) {
            setAiError(err instanceof Error ? err.message : 'AI search failed');
            setAiResults(null);
        } finally {
            setAiLoading(false);
        }
    }, [startCountdown]);

    const reset = useCallback(() => {
        setAiResults(null);
        setAiError(null);
        setRateLimited(false);
        setRetryCountdown(0);

        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    }, []);

    return {
        aiResults,
        aiLoading,
        aiError,
        rateLimited,
        retryCountdown,
        search,
        reset,
    };
}
