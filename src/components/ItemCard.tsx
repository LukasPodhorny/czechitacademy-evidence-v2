import styles from './ItemCard.module.css';
import type { Item } from '../hooks/useItems';

interface ItemCardProps {
    item: Item;
    onClick?: () => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
    const quantity = item['Množství'] || '0';
    const name = item['Název'] || 'Neznámý název';
    const category = item['Kategorie'] || '';
    const imageUrl = item.image_url;

    return (
        <div className={styles.card} onClick={onClick}>
            <div className={styles.imageContainer}>
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={name}
                        className={styles.image}
                        loading="lazy"
                    />
                ) : (
                    <div className={styles.noImage}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                    </div>
                )}
            </div>
            <div className={styles.content}>
                <div className={styles.quantity}>{quantity}</div>
                <div className={styles.name}>{name}</div>
                {category && <div className={styles.category}>{category}</div>}
            </div>
        </div>
    );
}
