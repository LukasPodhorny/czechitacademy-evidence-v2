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
            <label className={styles.label}>
                <span>Nebo zkuste</span>
                <span className={styles.aiBadge}>AI vyhledávání</span>
            </label>
            <div className={styles.inputWrapper}>
                <input
                    type="text"
                    className={`${styles.input} ${active ? styles.inputActive : ''}`}
                    placeholder="Popište, co hledáte..."
                    value={inputValue}
                    onChange={handleInputChange}
                    disabled={loading}
                />
                <button
                    type="submit"
                    className={`${styles.button} ${active ? styles.buttonActive : ''}`}
                    disabled={loading || (!active && !inputValue.trim())}
                >
                    {loading ? (
                        <>
                            <span className={styles.spinner} />
                            <span>Hledám...</span>
                        </>
                    ) : active ? (
                        <span>Zrušit</span>
                    ) : (
                        <span>Hledat</span>
                    )}
                </button>
            </div>
            <p className={styles.hint}>
                AI prohledává všechny položky a vrací nejrelevantnější výsledky.
            </p>
        </form>
    );
}
