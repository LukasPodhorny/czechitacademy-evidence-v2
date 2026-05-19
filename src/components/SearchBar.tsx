import { useState, useCallback, useRef } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onAiSearch: () => void;
    aiLoading: boolean;
    aiActive: boolean;
    onResetAi: () => void;
}

export function SearchBar({
    value,
    onChange,
    onAiSearch,
    aiLoading,
    aiActive,
    onResetAi,
}: SearchBarProps) {
    const [inputValue, setInputValue] = useState(value);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value;
            setInputValue(newValue);

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
                onChange(newValue);
            }, 150);
        },
        [onChange]
    );

    const handleAiClick = useCallback(() => {
        if (aiActive) {
            onResetAi();
        } else {
            onAiSearch();
        }
    }, [aiActive, onAiSearch, onResetAi]);

    return (
        <div className={styles.searchBar}>
            <div className={styles.inputWrapper}>
                <svg
                    className={styles.searchIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                    type="text"
                    className={styles.input}
                    placeholder="Hledat v IT majetku..."
                    value={inputValue}
                    onChange={handleInputChange}
                />
            </div>
            <button
                type="button"
                className={`${styles.aiButton} ${aiLoading ? styles.aiButtonLoading : ''} ${aiActive ? styles.aiButtonActive : ''}`}
                onClick={handleAiClick}
                disabled={aiLoading}
            >
                {aiLoading ? (
                    <>
                        <span className={styles.spinner} />
                        <span>AI hledá...</span>
                    </>
                ) : aiActive ? (
                    <>
                        <span>✕</span>
                        <span>Zrušit AI</span>
                    </>
                ) : (
                    <>
                        <span>✦</span>
                        <span>Hledat s AI</span>
                    </>
                )}
            </button>
        </div>
    );
}
