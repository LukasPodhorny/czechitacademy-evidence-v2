import styles from './AiRateLimitBanner.module.css';

interface AiRateLimitBannerProps {
    countdown: number;
    onRetry: () => void;
}

export function AiRateLimitBanner({ countdown, onRetry }: AiRateLimitBannerProps) {
    const isWaiting = countdown > 0;

    return (
        <div className={styles.banner}>
            <div className={styles.content}>
                <svg
                    className={styles.icon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className={styles.text}>
                    AI vyhledávání je momentálně přetížené.
                </span>
            </div>
            <button
                type="button"
                className={styles.retryButton}
                onClick={onRetry}
                disabled={isWaiting}
            >
                {isWaiting ? `Zkusit znovu (${countdown}s)` : 'Zkusit znovu'}
            </button>
        </div>
    );
}
