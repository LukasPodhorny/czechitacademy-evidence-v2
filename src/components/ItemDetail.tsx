import styles from './ItemDetail.module.css';
import type { Item } from '../hooks/useItems';

interface ItemDetailProps {
    item: Item;
    onClose: () => void;
    onEdit: () => void;
}

export function ItemDetail({ item, onClose, onEdit }: ItemDetailProps) {
    const name = item['Název'] || 'Neznámý název';
    const category = item['Kategorie'] || '';
    const sku = item['ID / SKU'] || '';
    const quantity = item['Množství'] || '0';
    const unit = item['Jednotka'] || 'ks';
    const location = item['Umístění'] || '';
    const note = item['Poznámka'] || '';

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

                    <button className={styles.editButton} onClick={onEdit}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                        </svg>
                        <span>Edit</span>
                    </button>

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
                        <div className={styles.spec}>
                            <label>Quantity</label>
                            <span className={styles.quantity}>{quantity} {unit}</span>
                        </div>
                    </div>

                    {note && (
                        <div className={styles.noteSection}>
                            <p>{note}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
