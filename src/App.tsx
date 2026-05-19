import { useState, useMemo, useCallback } from 'react';
import { useItems } from './hooks/useItems';
import { useAiSearch } from './hooks/useAiSearch';
import { searchItems, getUniqueCategories } from './utils/search';
import { SearchBar } from './components/SearchBar';
import { AiSearchBar } from './components/AiSearchBar';
import { CategoryFilter } from './components/CategoryFilter';
import { ItemGrid } from './components/ItemGrid';
import { AiRateLimitBanner } from './components/AiRateLimitBanner';
import styles from './App.module.css';

function App() {
  const { items, loading, error } = useItems();
  const {
    aiResults,
    aiLoading,
    aiError,
    rateLimited,
    retryCountdown,
    search: aiSearch,
    reset: resetAi,
  } = useAiSearch();

  const [searchQuery, setSearchQuery] = useState('');
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => getUniqueCategories(items), [items]);

  const filteredItems = useMemo(() => {
    return searchItems(items, searchQuery, selectedCategory);
  }, [items, searchQuery, selectedCategory]);

  const handleAiSearch = useCallback(() => {
    if (aiSearchQuery.trim()) {
      aiSearch(aiSearchQuery, filteredItems);
    }
  }, [aiSearchQuery, filteredItems, aiSearch]);

  const handleRetry = useCallback(() => {
    if (retryCountdown === 0) {
      handleAiSearch();
    }
  }, [retryCountdown, handleAiSearch]);

  const displayedItems = useMemo(() => {
    if (aiResults !== null) {
      return aiResults
        .map((index) => filteredItems[index])
        .filter((item) => item !== undefined);
    }
    return filteredItems;
  }, [aiResults, filteredItems]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.accent}>IT</span> Evidence
        </h1>
      </header>

      <main className={styles.main}>
        <div className={styles.searchSection}>
          <div className={styles.searchRow}>
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onChange={setSelectedCategory}
            />
          </div>

          <AiSearchBar
            value={aiSearchQuery}
            onChange={setAiSearchQuery}
            onSearch={handleAiSearch}
            loading={aiLoading}
            active={aiResults !== null}
            onReset={resetAi}
          />
        </div>

        {rateLimited && (
          <AiRateLimitBanner countdown={retryCountdown} onRetry={handleRetry} />
        )}

        {aiError && !rateLimited && (
          <div className={styles.aiError}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{aiError}</span>
          </div>
        )}

        <ItemGrid
          items={displayedItems}
          aiResults={aiResults}
          loading={loading}
          error={error}
        />
      </main>

      <footer className={styles.footer}>
        <p>Czech IT Academy</p>
      </footer>
    </div>
  );
}

export default App;
