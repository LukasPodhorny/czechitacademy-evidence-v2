import styles from './CategoryFilter.module.css';

interface CategoryFilterProps {
    categories: string[];
    selectedCategory: string | null;
    onChange: (category: string | null) => void;
}

export function CategoryFilter({
    categories,
    selectedCategory,
    onChange,
}: CategoryFilterProps) {
    return (
        <div className={styles.container}>
            <label className={styles.label} htmlFor="category-select">
                Kategorie:
            </label>
            <select
                id="category-select"
                className={styles.select}
                value={selectedCategory || 'Všechny kategorie'}
                onChange={(e) => {
                    const value = e.target.value;
                    onChange(value === 'Všechny kategorie' ? null : value);
                }}
            >
                <option value="Všechny kategorie">Všechny kategorie</option>
                {categories.map((category) => (
                    <option key={category} value={category}>
                        {category}
                    </option>
                ))}
            </select>
        </div>
    );
}
