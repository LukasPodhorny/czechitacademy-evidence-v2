import styles from './AiSearchButton.module.css';

interface AiSearchButtonProps {
    onClick: () => void;
    loading: boolean;
    active: boolean;
}

export function AiSearchButton({ onClick, loading, active }: AiSearchButtonProps) {
    return (
        <button
            type="button"
            className={`${styles.button} ${loading ? styles.loading : ''} ${active ? styles.active : ''}`}
            onClick={onClick}
            disabled={loading}
        >
            {loading ? (
                <>
                    <span className={styles.spinner} />
                    <span>AI hledá...</span>
                </>
            ) : active ? (
                <>
                    <span className={styles.icon}>✕</span>
                    <span>Zrušit AI</span>
                </>
            ) : (
                <>
                    <span className={styles.icon}>✦</span>
                    <span>Hledat s AI</span>
                </>
            )}
        </button>
    );
}
