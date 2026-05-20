import { useState } from 'react';
import styles from './ItemDetail.module.css';
import type { Item } from '../hooks/useItems';
import type { Transaction } from '../hooks/useTransactions';

interface ItemDetailProps {
    item: Item;
    onClose: () => void;
    onEdit: () => void;
    onBorrow: () => void;
    onTake: () => void;
    transactions: Transaction[];
    onReturn: (transactionId: number) => Promise<void>;
    loadingTransactions: boolean;
}

export function ItemDetail({
    item,
    onClose,
    onEdit,
    onBorrow,
    onTake,
    transactions,
    onReturn,
    loadingTransactions
}: ItemDetailProps) {
    const [confirmingReturn, setConfirmingReturn] = useState<number | null>(null);
    const name = item['Název'] || 'Neznámý název';
    const category = item['Kategorie'] || '';
    const sku = item['ID / SKU'] || '';
    const quantity = item['Množství'] || '0';
    const unit = item['Jednotka'] || 'ks';
    const location = item['Umístění'] || '';
    const note = item['Poznámka'] || '';
    const availableQuantity = parseInt(quantity, 10) || 0;

    // Calculate borrowed/taken quantities
    const activeTransactions = transactions.filter(t => !t.returned_at);
    const borrowedCount = activeTransactions
        .filter(t => t.transaction_type === 'borrow')
        .reduce((sum, t) => sum + t.amount, 0);
    const takenCount = activeTransactions
        .filter(t => t.transaction_type === 'take')
        .reduce((sum, t) => sum + t.amount, 0);

    const sortedTransactions = [...transactions].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDuration = (days: number | null) => {
        if (!days) return '';
        return days === 1 ? 'na 1 den' : `na ${days} dní`;
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.container} onClick={e => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className={styles.content}>
                    <h1 className={styles.title}>{name}</h1>
                    <p className={styles.category}>{category}</p>

                    <div className={styles.actionButtons}>
                        <button
                            className={styles.borrowButton}
                            onClick={onBorrow}
                            disabled={availableQuantity === 0}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" />
                            </svg>
                            <span>Půjčit</span>
                        </button>
                        <button
                            className={styles.takeButton}
                            onClick={onTake}
                            disabled={availableQuantity === 0}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                            <span>Vzít</span>
                        </button>
                        <button className={styles.editButton} onClick={onEdit}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                            <span>Edit</span>
                        </button>
                    </div>

                    <div className={styles.section}>
                        <h2>Specifications</h2>
                        <div className={styles.specs}>
                            <div className={styles.spec}>
                                <label>SKU</label>
                                <span>{sku || '-'}</span>
                            </div>
                            <div className={styles.spec}>
                                <label>Category</label>
                                <span>{category || '-'}</span>
                            </div>
                            {location && (
                                <div className={styles.spec}>
                                    <label>Location</label>
                                    <span>{location}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h2>Availability</h2>
                        <div className={styles.specs}>
                            <div className={styles.spec}>
                                <label>Available Quantity</label>
                                <span className={styles.quantity}>{quantity} {unit}</span>
                            </div>
                            {borrowedCount > 0 && (
                                <div className={styles.spec}>
                                    <label>Půjčeno</label>
                                    <span className={styles.borrowedCount}>{borrowedCount} {unit}</span>
                                </div>
                            )}
                            {takenCount > 0 && (
                                <div className={styles.spec}>
                                    <label>Odebráno</label>
                                    <span className={styles.takenCount}>{takenCount} {unit}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {note && (
                        <div className={styles.noteSection}>
                            <p>{note}</p>
                        </div>
                    )}

                    {transactions.length > 0 && (
                        <div className={styles.transactionsSection}>
                            <h2>Historie transakcí</h2>
                            {loadingTransactions ? (
                                <div className={styles.loading}>Načítání...</div>
                            ) : (
                                <div className={styles.transactionsList}>
                                    {sortedTransactions.map(transaction => (
                                        <div
                                            key={transaction.id}
                                            className={`${styles.transaction} ${transaction.returned_at ? styles.returned : ''} ${transaction.transaction_type === 'take' ? styles.taken : ''}`}
                                        >
                                            <div className={styles.transactionHeader}>
                                                <span className={`${styles.transactionType} ${styles[transaction.transaction_type]}`}>
                                                    {transaction.transaction_type === 'borrow' ? 'Půjčeno' : 'Odebráno'}
                                                </span>
                                                <span className={styles.transactionAmount}>
                                                    {transaction.amount} {unit}
                                                </span>
                                            </div>
                                            <div className={styles.transactionDetails}>
                                                {transaction.person_name && (
                                                    <span className={styles.personName}>
                                                        {transaction.person_name}
                                                    </span>
                                                )}
                                                <span className={styles.transactionDate}>
                                                    {formatDate(transaction.created_at)}
                                                </span>
                                                {transaction.duration_days && !transaction.returned_at && (
                                                    <span className={styles.duration}>
                                                        {formatDuration(transaction.duration_days)}
                                                    </span>
                                                )}
                                            </div>
                                            {transaction.notes && (
                                                <p className={styles.transactionNotes}>{transaction.notes}</p>
                                            )}
                                            {transaction.transaction_type === 'borrow' && !transaction.returned_at && (
                                                <>
                                                    {confirmingReturn === transaction.id ? (
                                                        <div className={styles.confirmReturn}>
                                                            <p className={styles.confirmText}>
                                                                Vrátil jsi položku tam, kam patří?
                                                            </p>
                                                            <div className={styles.confirmButtons}>
                                                                <button
                                                                    className={styles.confirmYesButton}
                                                                    onClick={() => {
                                                                        onReturn(transaction.id);
                                                                        setConfirmingReturn(null);
                                                                    }}
                                                                >
                                                                    Ano, vrátil
                                                                </button>
                                                                <button
                                                                    className={styles.confirmNoButton}
                                                                    onClick={() => setConfirmingReturn(null)}
                                                                >
                                                                    Zrušit
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            className={styles.returnButton}
                                                            onClick={() => setConfirmingReturn(transaction.id)}
                                                        >
                                                            Vrátit
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            {transaction.returned_at && (
                                                <span className={styles.returnedLabel}>
                                                    Vráceno {formatDate(transaction.returned_at)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
