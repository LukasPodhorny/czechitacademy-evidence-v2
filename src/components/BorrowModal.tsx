import { useState, useEffect } from 'react';
import styles from './BorrowModal.module.css';
import type { CreateTransactionData } from '../hooks/useTransactions';

interface BorrowModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateTransactionData) => Promise<void>;
    itemId: number;
    itemName: string;
    availableQuantity: number;
    mode: 'borrow' | 'take';
}

export function BorrowModal({ isOpen, onClose, onSubmit, itemId, itemName, availableQuantity, mode }: BorrowModalProps) {
    const [personName, setPersonName] = useState('');
    const [amount, setAmount] = useState(1);
    const [durationDays, setDurationDays] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setPersonName('');
            setAmount(1);
            setDurationDays('');
            setNotes('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (amount <= 0) {
            setError('Množství musí být větší než 0');
            return;
        }

        if (amount > availableQuantity) {
            setError(`Není dostatek kusů k dispozici (max ${availableQuantity})`);
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmit({
                item_id: itemId,
                person_name: personName || undefined,
                amount,
                transaction_type: mode,
                duration_days: durationDays ? parseInt(durationDays, 10) : undefined,
                notes: notes || undefined,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Došlo k chybě');
        } finally {
            setIsSubmitting(false);
        }
    };

    const title = mode === 'borrow' ? 'Půjčit položku' : 'Vzít položku';
    const submitLabel = mode === 'borrow' ? 'Půjčit' : 'Vzít';
    const description = mode === 'borrow'
        ? 'Položku si půjčíte a budete ji muset vrátit.'
        : 'Položku si vezmete a nebudete ji muset vracet.';

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <h2 className={styles.title}>{title}</h2>
                <p className={styles.itemName}>{itemName}</p>
                <p className={styles.description}>{description}</p>

                {error && (
                    <div className={styles.error}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="personName">Vaše jméno</label>
                        <input
                            id="personName"
                            type="text"
                            value={personName}
                            onChange={e => setPersonName(e.target.value)}
                            placeholder="Zadejte své jméno"
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="amount">
                            Množství <span className={styles.required}>*</span>
                            <span className={styles.available}>(k dispozici: {availableQuantity})</span>
                        </label>
                        <input
                            id="amount"
                            type="number"
                            min={1}
                            max={availableQuantity}
                            value={amount}
                            onChange={e => setAmount(parseInt(e.target.value, 10) || 0)}
                            required
                        />
                    </div>

                    {mode === 'borrow' && (
                        <div className={styles.field}>
                            <label htmlFor="durationDays">Na jak dlouho? (dny)</label>
                            <input
                                id="durationDays"
                                type="number"
                                min={1}
                                value={durationDays}
                                onChange={e => setDurationDays(e.target.value)}
                                placeholder="Např. 7"
                            />
                        </div>
                    )}

                    <div className={styles.field}>
                        <label htmlFor="notes">Poznámka</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Dodatečné informace..."
                            rows={3}
                        />
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="submit"
                            className={mode === 'borrow' ? styles.borrowButton : styles.takeButton}
                            disabled={isSubmitting || availableQuantity === 0}
                        >
                            {isSubmitting ? 'Zpracovávám...' : submitLabel}
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
                </form>
            </div>
        </div>
    );
}
