import { useState, useEffect, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import styles from './ItemModal.module.css';
import type { Item } from '../hooks/useItems';

interface ItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: Partial<Item>) => void;
    onDelete?: () => void;
    item?: Item | null;
    categories: string[];
}

const emptyItem: Partial<Item> = {
    'ID / SKU': '',
    'Název': '',
    'Kategorie': '',
    'Umístění': '',
    'Množství': '',
    'Jednotka': 'ks',
    'Poznámka': '',
    image_url: null,
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Compression options
const compressionOptions = {
    maxWidthOrHeight: 1920,  // Resize to max 1920px on longest side
    maxSizeMB: 1,            // Compress to under 1MB
    useWebWorker: true,      // Use web worker for better performance
    fileType: 'image/jpeg',  // Convert to JPEG for better compression
};

export function ItemModal({ isOpen, onClose, onSave, onDelete, item, categories }: ItemModalProps) {
    const [formData, setFormData] = useState<Partial<Item>>(emptyItem);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setFormData(item || emptyItem);
            setImagePreview(item?.image_url || null);
            setImageFile(null);
            setShowDeleteConfirm(false);
            setIsDragging(false);
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        let imageUrl = formData.image_url;

        // Upload new image if selected
        if (imageFile) {
            try {
                setIsUploading(true);
                imageUrl = await uploadImage(imageFile);
            } catch (err) {
                console.error('Failed to upload image:', err);
                alert('Nepodařilo se nahrát obrázek. Zkuste to znovu.');
                setIsUploading(false);
                setIsSubmitting(false);
                return;
            }
            setIsUploading(false);
        }

        // If image was removed, set to null
        if (imagePreview === null && item?.image_url) {
            imageUrl = null;
        }

        await onSave({ ...formData, image_url: imageUrl });
        setIsSubmitting(false);
        onClose();
    };

    const handleChange = (field: keyof Item, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDelete = async () => {
        if (onDelete) {
            setIsSubmitting(true);
            await onDelete();
            setIsSubmitting(false);
            onClose();
        }
    };

    const processImageFile = async (file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Prosím vyberte obrázek (JPG, PNG, GIF, WebP)');
            return;
        }

        // Validate file size (max 20MB before compression)
        if (file.size > 20 * 1024 * 1024) {
            alert('Obrázek je příliš velký. Maximální velikost je 20MB před kompresí.');
            return;
        }

        try {
            setIsCompressing(true);

            // Compress the image
            const compressedFile = await imageCompression(file, compressionOptions);

            console.log('Original size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
            console.log('Compressed size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');

            setImageFile(compressedFile);
            setImagePreview(URL.createObjectURL(compressedFile));
        } catch (err) {
            console.error('Failed to compress image:', err);
            alert('Nepodařilo se zkomprimovat obrázek. Zkuste menší obrázek.');
        } finally {
            setIsCompressing(false);
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processImageFile(file);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isCompressing && !imagePreview) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (isCompressing || imagePreview) return;

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        const file = files[0];
        await processImageFile(file);
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadImage = async (file: File): Promise<string> => {
        const fileExt = 'jpg'; // Always save as jpg after compression
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `parts/${fileName}`;

        // Upload to Supabase Storage
        const uploadResponse = await fetch(
            `${SUPABASE_URL}/storage/v1/object/parts-images/${filePath}`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'image/jpeg',
                },
                body: file,
            }
        );

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${errorText}`);
        }

        // Return the public URL
        return `${SUPABASE_URL}/storage/v1/object/public/parts-images/${filePath}`;
    };

    const isEditing = !!item;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Image Upload Section */}
                    <div className={styles.imageSection}>
                        <label className={styles.imageLabel}>Obrázek</label>
                        <div
                            className={`${styles.imageContainer} ${isDragging ? styles.dragging : ''} ${imagePreview ? styles.hasImage : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            {imagePreview ? (
                                <div className={styles.imagePreviewWrapper}>
                                    <img
                                        src={imagePreview}
                                        alt="Náhled"
                                        className={styles.imagePreview}
                                    />
                                    <button
                                        type="button"
                                        className={styles.removeImageButton}
                                        onClick={handleRemoveImage}
                                        title="Odstranit obrázek"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.imagePlaceholder}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                    <span>{isDragging ? 'Pusťte obrázek zde' : 'Přetáhněte obrázek sem nebo klikněte níže'}</span>
                                </div>
                            )}
                            {isCompressing && (
                                <div className={styles.compressingOverlay}>
                                    <div className={styles.spinner}></div>
                                    <span>Komprimuji...</span>
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className={styles.fileInput}
                            id="image-upload"
                            disabled={isCompressing}
                        />
                        <label htmlFor="image-upload" className={`${styles.uploadButton} ${isCompressing ? styles.disabled : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {imagePreview ? 'Změnit obrázek' : 'Nahrát obrázek'}
                        </label>
                        <p className={styles.imageHint}>Max. 20MB, automaticky zkomprimováno na ~1MB (1920px)</p>
                    </div>

                    <div className={styles.field}>
                        <label>ID / SKU</label>
                        <input
                            type="text"
                            value={formData['ID / SKU'] || ''}
                            onChange={e => handleChange('ID / SKU', e.target.value)}
                            placeholder=""
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Název <span className={styles.required}>*</span></label>
                        <input
                            type="text"
                            value={formData['Název'] || ''}
                            onChange={e => handleChange('Název', e.target.value)}
                            placeholder=""
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Kategorie <span className={styles.required}>*</span></label>
                        <select
                            value={formData['Kategorie'] || ''}
                            onChange={e => handleChange('Kategorie', e.target.value)}
                            required
                        >
                            <option value="">Vyberte kategorii</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.field}>
                        <label>Umístění</label>
                        <input
                            type="text"
                            value={formData['Umístění'] || ''}
                            onChange={e => handleChange('Umístění', e.target.value)}
                            placeholder=""
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Množství <span className={styles.required}>*</span></label>
                        <input
                            type="number"
                            min="0"
                            value={formData['Množství'] || ''}
                            onChange={e => handleChange('Množství', e.target.value)}
                            placeholder=""
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label>Poznámka</label>
                        <textarea
                            value={formData['Poznámka'] || ''}
                            onChange={e => handleChange('Poznámka', e.target.value)}
                            placeholder=""
                            rows={3}
                        />
                    </div>

                    <div className={styles.actions}>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting || isUploading || isCompressing}
                        >
                            {isCompressing ? 'Komprimuji...' : isUploading ? 'Nahrávání obrázku...' : isSubmitting ? 'Ukládání...' : 'Potvrdit'}
                        </button>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={onClose}
                            disabled={isSubmitting || isUploading || isCompressing}
                        >
                            Zrušit
                        </button>
                    </div>

                    {isEditing && onDelete && !showDeleteConfirm && (
                        <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isSubmitting || isUploading || isCompressing}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Smazat položku</span>
                        </button>
                    )}

                    {showDeleteConfirm && (
                        <div className={styles.deleteConfirm}>
                            <p>Opravdu chcete smazat tuto položku?</p>
                            <div className={styles.deleteActions}>
                                <button
                                    type="button"
                                    className={styles.deleteConfirmButton}
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Mazání...' : 'Ano, smazat'}
                                </button>
                                <button
                                    type="button"
                                    className={styles.deleteCancelButton}
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isSubmitting}
                                >
                                    Zrušit
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
