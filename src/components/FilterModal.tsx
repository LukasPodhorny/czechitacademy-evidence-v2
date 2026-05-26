import { useState, useEffect, useCallback } from 'react';
import styles from './FilterModal.module.css';
import type { Category } from '../hooks/useCategories';

interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    categoryNames: string[];
    selectedCategories: string[];
    onApply: (categories: string[]) => void;
    onAddCategory?: (name: string, description?: string) => Promise<void>;
    onUpdateCategory?: (id: number, updates: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
    onDeleteCategory?: (id: number) => Promise<void>;
}

export function FilterModal({
    isOpen,
    onClose,
    categories,
    categoryNames,
    selectedCategories,
    onApply,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
}: FilterModalProps) {
    const [localSelection, setLocalSelection] = useState<string[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLocalSelection(selectedCategories);
            resetForms();
        }
    }, [isOpen, selectedCategories]);

    const resetForms = () => {
        setIsAddingCategory(false);
        setNewCategoryName('');
        setEditingId(null);
        setEditName('');
        setError(null);
        setDeleteConfirmId(null);
        setIsSubmitting(false);
    };

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

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim() || !onAddCategory) return;

        if (categoryNames.some(name => name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
            setError('Kategorie s tímto názvem již existuje');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onAddCategory(newCategoryName.trim());
            setIsAddingCategory(false);
            setNewCategoryName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nepodařilo se přidat kategorii');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (category: Category) => {
        setEditingId(category.id);
        setEditName(category.name);
        setDeleteConfirmId(null);
        setError(null);
    };

    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editName.trim() || editingId === null || !onUpdateCategory) return;

        if (categoryNames.some((name, idx) =>
            categories[idx]?.id !== editingId &&
            name.toLowerCase() === editName.trim().toLowerCase()
        )) {
            setError('Kategorie s tímto názvem již existuje');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onUpdateCategory(editingId, {
                name: editName.trim(),
            });
            setEditingId(null);
            setEditName('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nepodařilo se upravit kategorii');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!onDeleteCategory) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await onDeleteCategory(id);
            setDeleteConfirmId(null);
            // Remove from selection if deleted category was selected
            const categoryToDelete = categories.find(c => c.id === id);
            if (categoryToDelete && localSelection.includes(categoryToDelete.name)) {
                setLocalSelection(prev => prev.filter(c => c !== categoryToDelete.name));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Nepodařilo se smazat kategorii');
        } finally {
            setIsSubmitting(false);
        }
    };

    const canManageCategories = onAddCategory && onUpdateCategory && onDeleteCategory;

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
                    {error && (
                        <div className={styles.error}>{error}</div>
                    )}

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <span>Kategorie</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>

                        {/* Add new category button */}
                        {canManageCategories && !isAddingCategory && editingId === null && (
                            <button
                                className={styles.addCategoryButton}
                                onClick={() => setIsAddingCategory(true)}
                                disabled={isSubmitting}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Přidat kategorii
                            </button>
                        )}

                        {/* Add category form */}
                        {isAddingCategory && (
                            <form className={styles.addCategoryForm} onSubmit={handleAddCategory}>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="Název kategorie"
                                    autoFocus
                                    required
                                />
                                <div className={styles.formActions}>
                                    <button
                                        type="submit"
                                        className={styles.saveButton}
                                        disabled={isSubmitting || !newCategoryName.trim()}
                                    >
                                        {isSubmitting ? '...' : 'Přidat'}
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.cancelButton}
                                        onClick={() => {
                                            setIsAddingCategory(false);
                                            setNewCategoryName('');
                                            setError(null);
                                        }}
                                        disabled={isSubmitting}
                                    >
                                        Zrušit
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className={styles.categoryList}>
                            {categories.length === 0 ? (
                                <div className={styles.empty}>Žádné kategorie</div>
                            ) : (
                                categories.map(category => (
                                    <div key={category.id} className={styles.categoryRow}>
                                        {editingId === category.id ? (
                                            <form className={styles.editForm} onSubmit={handleUpdateCategory}>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    autoFocus
                                                    required
                                                />
                                                <div className={styles.editActions}>
                                                    <button
                                                        type="submit"
                                                        className={styles.saveButton}
                                                        disabled={isSubmitting}
                                                    >
                                                        Uložit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={styles.cancelButton}
                                                        onClick={() => {
                                                            setEditingId(null);
                                                            setError(null);
                                                        }}
                                                        disabled={isSubmitting}
                                                    >
                                                        Zrušit
                                                    </button>
                                                </div>
                                            </form>
                                        ) : (
                                            <>
                                                <label className={styles.categoryItem}>
                                                    <span className={styles.categoryName}>{category.name}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={localSelection.includes(category.name)}
                                                        onChange={() => toggleCategory(category.name)}
                                                    />
                                                    <span className={styles.checkbox} />
                                                </label>

                                                {canManageCategories && (
                                                    <div className={styles.categoryActions}>
                                                        {deleteConfirmId === category.id ? (
                                                            <>
                                                                <span className={styles.confirmText}>Smazat?</span>
                                                                <button
                                                                    className={styles.confirmDelete}
                                                                    onClick={() => handleDeleteCategory(category.id)}
                                                                    disabled={isSubmitting}
                                                                >
                                                                    Ano
                                                                </button>
                                                                <button
                                                                    className={styles.cancelDelete}
                                                                    onClick={() => setDeleteConfirmId(null)}
                                                                    disabled={isSubmitting}
                                                                >
                                                                    Ne
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    className={styles.editButton}
                                                                    onClick={() => startEdit(category)}
                                                                    disabled={isAddingCategory || editingId !== null}
                                                                    title="Upravit"
                                                                >
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                    </svg>
                                                                </button>
                                                                <button
                                                                    className={styles.deleteButton}
                                                                    onClick={() => setDeleteConfirmId(category.id)}
                                                                    disabled={isAddingCategory || editingId !== null}
                                                                    title="Smazat"
                                                                >
                                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                                                    </svg>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
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
