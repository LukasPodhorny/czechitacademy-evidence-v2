import { useState, useMemo, useEffect } from 'react';
import { useItems } from './hooks/useItems';
import { useCategories } from './hooks/useCategories';
import { useVectorSearch } from './hooks/useVectorSearch';
import { useTransactions, type CreateTransactionData } from './hooks/useTransactions';
import { searchItems, getUniqueCategories } from './utils/search';
import { SearchBar } from './components/SearchBar';
import { ItemGrid } from './components/ItemGrid';
import { ItemModal } from './components/ItemModal';
import { FilterModal } from './components/FilterModal';
import { ItemDetail } from './components/ItemDetail';
import { BorrowModal } from './components/BorrowModal';
import logo from './assets/czechitacademy_logo.png';
import styles from './App.module.css';
import type { Item } from './hooks/useItems';

const ITEMS_PER_PAGE = 16;

function App() {
  const { items, loading, error, refreshItems, addItem, updateItem, deleteItem } = useItems();
  const {
    categories: categoryObjects,
    categoryNames,
    loading: categoriesLoading,
    error: categoriesError,
    refreshCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();
  const {
    results: aiResults,
    loading: aiLoading,
    error: aiError,
    search: aiSearch,
    reset: resetAi,
  } = useVectorSearch();
  const {
    transactions,
    loading: transactionsLoading,
    fetchTransactions,
    createTransaction,
    returnItems,
  } = useTransactions();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isBorrowModalOpen, setIsBorrowModalOpen] = useState(false);
  const [borrowModalMode, setBorrowModalMode] = useState<'borrow' | 'take'>('borrow');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);

  // Fetch transactions when viewing item changes
  useEffect(() => {
    if (viewingItem && viewingItem._rowIndex) {
      fetchTransactions(viewingItem._rowIndex);
    }
  }, [viewingItem, fetchTransactions]);

  // Combine categories from the database with any categories from items that might not be in the database yet
  const categories = useMemo(() => {
    const dbCategoryNames = new Set(categoryNames);
    const itemCategoryNames = getUniqueCategories(items);

    // Add any item categories that aren't in the database yet
    itemCategoryNames.forEach(cat => {
      if (!dbCategoryNames.has(cat)) {
        dbCategoryNames.add(cat);
      }
    });

    return Array.from(dbCategoryNames).sort();
  }, [categoryNames, items]);

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;

    // Search filter (only in normal mode)
    if (!isAiMode && searchQuery.trim()) {
      result = searchItems(result, searchQuery, null);
    }

    // Category filter
    if (selectedCategories.length > 0) {
      result = result.filter(item =>
        selectedCategories.includes(item['Kategorie'] || '')
      );
    }

    return result;
  }, [items, searchQuery, selectedCategories, isAiMode]);

  // AI search results - useVectorSearch returns full items directly
  const displayedItems = useMemo(() => {
    if (aiResults !== null) {
      return aiResults;
    }
    return filteredItems;
  }, [aiResults, filteredItems]);

  const handleAiSearch = () => {
    if (searchQuery.trim()) {
      aiSearch(searchQuery);
    }
  };

  const handleToggleAiMode = () => {
    if (isAiMode) {
      // Turning off AI mode
      resetAi();
    }
    setIsAiMode(!isAiMode);
    setSearchQuery('');
    setCurrentPage(1);
  };


  const handleAddClick = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleItemClick = (item: Item) => {
    setViewingItem(item);
  };

  const handleEditFromDetail = () => {
    if (viewingItem) {
      setEditingItem(viewingItem);
      setIsItemModalOpen(true);
    }
  };

  const handleBorrowClick = () => {
    setBorrowModalMode('borrow');
    setIsBorrowModalOpen(true);
  };

  const handleTakeClick = () => {
    setBorrowModalMode('take');
    setIsBorrowModalOpen(true);
  };

  const handleBorrowModalClose = () => {
    setIsBorrowModalOpen(false);
  };

  const handleTransactionSubmit = async (data: CreateTransactionData) => {
    await createTransaction(data);
    await refreshItems();
  };

  const handleReturnItems = async (transactionId: number) => {
    await returnItems(transactionId);
    await refreshItems();
  };

  const handleSaveItem = async (itemData: Partial<Item>) => {
    if (editingItem) {
      await updateItem(editingItem._rowIndex || 0, itemData as Item);
    } else {
      await addItem(itemData as Item);
    }
    await refreshItems();

    // Update viewingItem if it was the edited item
    if (editingItem && viewingItem && editingItem._rowIndex === viewingItem._rowIndex) {
      setViewingItem({ ...viewingItem, ...itemData } as Item);
    }
  };

  const handleDeleteItem = async () => {
    if (editingItem && editingItem._rowIndex) {
      await deleteItem(editingItem._rowIndex);
      await refreshItems();
    }
  };

  const handleApplyFilters = (categories: string[]) => {
    setSelectedCategories(categories);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);

    // If in AI mode and user clears search, also reset AI results
    if (isAiMode && !value.trim()) {
      resetAi();
    }
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <img src={logo} alt="Czech IT Academy" className={styles.logo} />
          <h1 className={styles.title}>Czech IT Academy Parts Catalog</h1>
        </div>

        <div className={styles.headerRight}>
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            isAiMode={isAiMode}
            onToggleAi={handleToggleAiMode}
            onAiSearch={handleAiSearch}
            aiLoading={aiLoading}
          />

          <button
            className={`${styles.filterButton} ${selectedCategories.length > 0 ? styles.active : ''}`}
            onClick={() => setIsFilterModalOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="21" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="21" y1="18" x2="3" y2="18" />
            </svg>
            <span>Filtrovat</span>
            {selectedCategories.length > 0 && (
              <span className={styles.filterCount}>{selectedCategories.length}</span>
            )}
          </button>

          <button className={styles.addButton} onClick={handleAddClick}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add</span>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {aiError && (
          <div className={styles.aiError}>
            <div className={styles.aiErrorContent}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{aiError}</span>
            </div>
            <button
              type="button"
              className={styles.aiErrorRetry}
              onClick={handleAiSearch}
              disabled={aiLoading}
            >
              {aiLoading ? 'Zkouším...' : 'Zkusit znovu'}
            </button>
          </div>
        )}

        <ItemGrid
          items={displayedItems}
          loading={loading}
          error={error}
          onItemClick={handleItemClick}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </main>

      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        onDelete={editingItem ? handleDeleteItem : undefined}
        item={editingItem}
        categories={categories}
        onAddCategory={addCategory}
      />

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        categories={categoryObjects}
        categoryNames={categories}
        selectedCategories={selectedCategories}
        onApply={handleApplyFilters}
        onAddCategory={addCategory}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
      />

      {viewingItem && (
        <ItemDetail
          item={viewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={handleEditFromDetail}
          onBorrow={handleBorrowClick}
          onTake={handleTakeClick}
          transactions={transactions}
          onReturn={handleReturnItems}
          loadingTransactions={transactionsLoading}
        />
      )}

      {viewingItem && (
        <BorrowModal
          isOpen={isBorrowModalOpen}
          onClose={handleBorrowModalClose}
          onSubmit={handleTransactionSubmit}
          itemId={viewingItem._rowIndex || 0}
          itemName={viewingItem['Název'] || ''}
          availableQuantity={parseInt(viewingItem['Množství'] || '0', 10)}
          mode={borrowModalMode}
        />
      )}
    </div>
  );
}

export default App;
