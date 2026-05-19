import styles from './ItemCard.module.css';
import type { Item } from '../hooks/useItems';

// Subtle category colors for light theme
const categoryColors: Record<string, string> = {
    'Síťové komponenty': '#0066ff',
    'PLC a automatizace': '#00a3ff',
    'Senzory a detektory': '#ff6b6b',
    'Napájecí zdroje': '#ffa500',
    'HVAC senzory': '#20c997',
    'Elektroinstalační materiál': '#ff8c42',
    'Ruční nářadí': '#9b59b6',
    'Ostatní': '#6c757d',
    'Zabezpečovací technika': '#e74c3c',
    'Audio zařízení': '#27ae60',
    'Měřicí technika': '#3498db',
    'Periferní zařízení': '#e67e22',
    'PC komponenty': '#1abc9c',
    'PC komponenty/ ostatní': '#5dade2',
};

interface ItemCardProps {
    item: Item;
    index: number;
}

export function ItemCard({ item, index }: ItemCardProps) {
    const category = item['Kategorie'] || 'Ostatní';
    const categoryColor = categoryColors[category] || '#6c757d';

    const quantity = item['Množství'];
    const unit = item['Jednotka'];
    const location = item['Umístění'];
    const note = item['Poznámka'];
    const sku = item['ID / SKU'];
    const name = item['Název'] || 'Neznámý název';

    const animationDelay = `${index * 20}ms`;

    return (
        <div className={styles.card} style={{ animationDelay }}>
            <div className={styles.header}>
                <span
                    className={styles.categoryBadge}
                    style={{
                        backgroundColor: `${categoryColor}15`,
                        color: categoryColor
                    }}
                >
                    {category}
                </span>
                <h3 className={styles.title}>{name}</h3>
            </div>

            {sku && <div className={styles.sku}>{sku}</div>}

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
