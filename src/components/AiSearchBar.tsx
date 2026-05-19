import { useState, useCallback, useRef } from 'react';
import styles from './AiSearchBar.module.css';

interface AiSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    onSearch: () => void;
    loading: boolean;
    active: boolean;
    onReset: () => void;
}

export function AiSearchBar({
    value,
    onChange,
    onSearch,
    loading,
    active,
    onReset,
}: AiSearchBarProps) {
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

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (active) {
                onReset();
            } else {
                onSearch();
            }
        },
        [active, onReset, onSearch]
    );

    return (
        <form className={styles.container} onSubmit={handleSubmit}>
            <div className={styles.aiBadge}>
                <svg className={styles.sparkle} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                </svg>
                <span>Sémantické vyhledávání</span>
            </div>
            <div className={styles.inputWrapper}>
                <input
                    type="text"
                    className={`${styles.input} ${active ? styles.inputActive : ''}`}
                    placeholder="Popište, co hledáte přirozeným jazykem... např. 'komponenty pro síť v jedné místnosti'"
                    value={inputValue}
                    onChange={handleInputChange}
                    disabled={loading}
                />
                <button
                    type="submit"
                    className={`${styles.button} ${loading ? styles.buttonLoading : ''} ${active ? styles.buttonActive : ''}`}
                    disabled={loading || (!active && !inputValue.trim())}
                >
                    {loading ? (
                        <>
                            <span className={styles.spinner} />
                            <span>Hledám...</span>
                        </>
                    ) : active ? (
                        <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            <span>Zrušit AI</span>
                        </>
                    ) : (
                        <>
                            <svg className={styles.sparkleSmall} viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" />
                            </svg>
                            <span>Hledat s AI</span>
                        </>
                    )}
                </button>
            </div>
            <p className={styles.hint}>
                Hledá podle významu slov, ne jen přesné shody. Vrátí nejrelevantnější výsledky na základě vašeho popisu.
            </p>
        </form>
    );
}
