import { useState, useEffect } from 'react';
import styles from './FilterModal.module.css';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: string[];
    selectedCategories: string[];
    onApply: (categories: string[]) => void;
}

export function FilterModal({ isOpen, onClose, categories, selectedCategories, onApply }: FilterModalProps) {
    const [localSelection, setLocalSelection] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setLocalSelection(selectedCategories);
        }
    }, [isOpen, selectedCategories]);

    if (!isOpen) return null;

    const toggleCategory = (category: string) => {
        setLocalSelection(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleClearAll = () => {
        setLocalSelection([]);
    };

    const handleApply = () => {
        onApply(localSelection);
        onClose();
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Filtrovat</h2>
                    <button className={styles.closeButton} onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <span>Category</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>

                        <div className={styles.categoryList}>
                            {categories.map(category => (
                                <label key={category} className={styles.categoryItem}>
                                    <span className={styles.categoryName}>{category}</span>
                                    <input
                                        type="checkbox"
                                        checked={localSelection.includes(category)}
                                        onChange={() => toggleCategory(category)}
                                    />
                                    <span className={styles.checkbox} />
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button
                        type="button"
                        className={styles.clearButton}
                        onClick={handleClearAll}
                    >
                        Vymazat vše
                    </button>
                    <button
                        type="button"
                        className={styles.applyButton}
                        onClick={handleApply}
                    >
                        Potvrdit
                    </button>
                </div>
            </div>
        </div>
    );
}
