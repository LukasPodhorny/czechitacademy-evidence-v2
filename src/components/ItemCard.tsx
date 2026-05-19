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

    return (
        <div className={styles.card} onClick={onClick}>
            <div className={styles.quantity}>{quantity}</div>
            <div className={styles.name}>{name}</div>
            {category && <div className={styles.category}>{category}</div>}
        </div>
    );
}
