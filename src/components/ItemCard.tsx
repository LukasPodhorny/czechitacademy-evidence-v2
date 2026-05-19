import styles from './ItemCard.module.css';
import type { Item } from '../hooks/useItems';

// Category color mapping - 14 distinct colors for the 14 categories
const categoryColors: Record<string, string> = {
    'Síťové komponenty': '#00ff88',
    'PLC a automatizace': '#00ccff',
    'Senzory a detektory': '#ff6b6b',
    'Napájecí zdroje': '#ffd93d',
    'HVAC senzory': '#6bcf7f',
    'Elektroinstalační materiál': '#ff9f43',
    'Ruční nářadí': '#a55eea',
    'Ostatní': '#778ca3',
    'Zabezpečovací technika': '#ff4757',
    'Audio zařízení': '#2ed573',
    'Měřicí technika': '#1e90ff',
    'Periferní zařízení': '#ff6348',
    'PC komponenty': '#7bed9f',
    'PC komponenty/ ostatní': '#70a1ff',
};

interface ItemCardProps {
    item: Item;
    index: number;
}

export function ItemCard({ item, index }: ItemCardProps) {
    const category = item['Kategorie'] || 'Ostatní';
    const categoryColor = categoryColors[category] || '#778ca3';

    const quantity = item['Množství'];
    const unit = item['Jednotka'];
    const location = item['Umístění'];
    const note = item['Poznámka'];
    const sku = item['ID / SKU'];
    const name = item['Název'] || 'Neznámý název';

    // Calculate animation delay based on index (stagger effect)
    const animationDelay = `${index * 30}ms`;

    return (
        <div
            className={styles.card}
            style={{ animationDelay }}
        >
            <div className={styles.header}>
                <h3 className={styles.title}>{name}</h3>
                <span
                    className={styles.categoryBadge}
                    style={{ backgroundColor: `${categoryColor}20`, color: categoryColor, borderColor: `${categoryColor}40` }}
                >
                    {category}
                </span>
            </div>

            {sku && (
                <div className={styles.sku}>
                    SKU: {sku}
                </div>
            )}

            <div className={styles.quantity}>
                <span className={styles.quantityValue}>{quantity || '0'}</span>
                <span className={styles.quantityUnit}>{unit || 'ks'}</span>
            </div>

            {location && (
                <div className={styles.location}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{location}</span>
                </div>
            )}

            {note && (
                <div className={styles.note} title={note}>
                    {note}
                </div>
            )}
        </div>
    );
}
