import { useState, useCallback, useRef } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    isAiMode: boolean;
    onToggleAi: () => void;
    onAiSearch: () => void;
    aiLoading: boolean;
}

export function SearchBar({
    value,
    onChange,
    isAiMode,
    onToggleAi,
    onAiSearch,
    aiLoading
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && isAiMode) {
            // Clear debounce and use current value immediately
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
            onChange(inputValue);
            onAiSearch();
        }
    };

    const handleAiButtonClick = () => {
        // Clear debounce and use current value immediately
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
            debounceRef.current = null;
        }
        onChange(inputValue);
        onAiSearch();
    };

    return (
        <div className={`${styles.container} ${isAiMode ? styles.aiMode : ''}`}>
            <div className={styles.searchWrapper}>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                    type="text"
                    className={styles.input}
                    placeholder={isAiMode ? "Popište, co hledáte... např. 'komponenty pro síť'" : "Hledat podle názvu, SKU..."}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                />
                {isAiMode && (
                    <button
                        className={`${styles.aiSearchButton} ${aiLoading ? styles.loading : ''}`}
                        onClick={handleAiButtonClick}
                        disabled={aiLoading || !inputValue.trim()}
                    >
                        {aiLoading ? (
                            <span className={styles.spinner} />
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
            <button
                className={`${styles.aiToggle} ${isAiMode ? styles.active : ''}`}
                onClick={onToggleAi}
                title={isAiMode ? 'Vypnout AI vyhledávání' : 'Zapnout AI vyhledávání'}
            >
                <svg className={styles.sparkle} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                </svg>
                <span>Semantic search</span>
            </button>
        </div>
    );
}
