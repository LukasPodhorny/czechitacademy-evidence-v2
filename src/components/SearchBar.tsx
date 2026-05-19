import { useState, useCallback, useRef } from 'react';
import styles from './SearchBar.module.css';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
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

    return (
        <div className={styles.searchBar}>
            <label className={styles.label}>Vyhledat</label>
            <input
                type="text"
                className={styles.input}
                placeholder="Název, SKU nebo poznámka..."
                value={inputValue}
                onChange={handleInputChange}
            />
        </div>
    );
}
