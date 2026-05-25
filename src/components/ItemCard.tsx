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
                    <div className={styles.noImage} />
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
