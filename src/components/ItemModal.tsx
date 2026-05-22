import { useState, useEffect } from 'react';
import styles from './ItemModal.module.css';
import type { Item } from '../hooks/useItems';

interface ItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Partial<Item>) => void;
    onDelete?: () => void;
    item?: Item | null;
    categories: string[];
}

const emptyItem: Partial<Item> = {
    'ID / SKU': '',
    'Název': '',
    'Kategorie': '',
    'Umístění': '',
    'Množství': '',
    'Jednotka': 'ks',
    'Poznámka': '',
};

export function ItemModal({ isOpen, onClose, onSave, onDelete, item, categories }: ItemModalProps) {
    const [formData, setFormData] = useState<Partial<Item>>(emptyItem);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(item || emptyItem);
            setShowDeleteConfirm(false);
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSave(formData);
        setIsSubmitting(false);
        onClose();
    };

    const handleChange = (field: keyof Item, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDelete = async () => {
        if (onDelete) {
            setIsSubmitting(true);
            await onDelete();
            setIsSubmitting(false);
            onClose();
        }
    };

    const isEditing = !!item;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label>ID / SKU</label>
                        <input
                            type="text"
                            value={formData['ID / SKU'] || ''}
                            onChange={e => handleChange('ID / SKU', e.target.value)}
                            placeholder=""
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Název <span className={styles.required}>*</span></label>
                        <input
                            type="text"
                            value={formData['Název'] || ''}
                            onChange={e => handleChange('Název', e.target.value)}
                            placeholder=""
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Kategorie <span className={styles.required}>*</span></label>
                        <select
                            value={formData['Kategorie'] || ''}
                            onChange={e => handleChange('Kategorie', e.target.value)}
                            required
                        >
                            <option value="">Vyberte kategorii</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label>Umístění</label>
                        <input
                            type="text"
                            value={formData['Umístění'] || ''}
                            onChange={e => handleChange('Umístění', e.target.value)}
                            placeholder=""
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Množství <span className={styles.required}>*</span></label>
                        <input
                            type="number"
                            min="0"
                            value={formData['Množství'] || ''}
                            onChange={e => handleChange('Množství', e.target.value)}
                            placeholder=""
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Poznámka</label>
                        <textarea
                            value={formData['Poznámka'] || ''}
                            onChange={e => handleChange('Poznámka', e.target.value)}
                            placeholder=""
                            rows={3}
                        />
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Ukládání...' : 'Potvrdit'}
                        </button>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Zrušit
                        </button>
                    </div>

                    {isEditing && onDelete && !showDeleteConfirm && (
                        <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isSubmitting}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Smazat položku</span>
                        </button>
                    )}

                    {showDeleteConfirm && (
                        <div className={styles.deleteConfirm}>
                            <p>Opravdu chcete smazat tuto položku?</p>
                            <div className={styles.deleteActions}>
                                <button
                                    type="button"
                                    className={styles.deleteConfirmButton}
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Mazání...' : 'Ano, smazat'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.deleteCancelButton}
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isSubmitting}
                                >
                                    Zrušit
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
