import React, { useState, useMemo } from 'react';
import { 
    SCIENTIFIC_FIELD_CATEGORIES, 
    SCIENTIFIC_FIELDS, 
    getFieldProfile, 
    getCategoryForField 
} from '../../services/scientificFields';

interface ScientificFieldSelectorProps {
    value: string;
    onChange: (field: string) => void;
    compact?: boolean;
    showProfileCard?: boolean;
    idPrefix?: string;
    disabled?: boolean;
    label?: string;
    required?: boolean;
}

export const ScientificFieldSelector: React.FC<ScientificFieldSelectorProps> = ({
    value,
    onChange,
    compact = false,
    showProfileCard = true,
    idPrefix = 'field-sel',
    disabled = false,
    label = 'Discipline / Scientific Field',
    required = false
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [customFieldText, setCustomFieldText] = useState('');
    const [showSearchModal, setShowSearchModal] = useState(false);

    const effectiveField = value || 'Biology (General)';
    const fieldProfile = useMemo(() => getFieldProfile(effectiveField), [effectiveField]);
    const currentCategory = useMemo(() => getCategoryForField(effectiveField), [effectiveField]);

    // Filter fields based on search query
    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return SCIENTIFIC_FIELD_CATEGORIES;
        const q = searchQuery.toLowerCase();
        return SCIENTIFIC_FIELD_CATEGORIES.map(cat => ({
            ...cat,
            fields: cat.fields.filter(f => 
                f.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q)
            )
        })).filter(cat => cat.fields.length > 0);
    }, [searchQuery]);

    const handleSelectField = (newField: string) => {
        if (newField === '__CUSTOM__') {
            setIsCustomMode(true);
            setCustomFieldText('');
        } else {
            setIsCustomMode(false);
            onChange(newField);
        }
        setShowSearchModal(false);
        setSearchQuery('');
    };

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (customFieldText.trim()) {
            onChange(customFieldText.trim());
            setIsCustomMode(false);
        }
    };

    return (
        <div className="scientific-field-selector-root">
            {label && (
                <div className="d-flex justify-content-between align-items-center mb-1">
                    <label 
                        htmlFor={`${idPrefix}-select`} 
                        className="form-label text-white-50 small font-mono fw-bold text-uppercase mb-0"
                        style={{ fontSize: compact ? '0.75rem' : '0.8rem' }}
                    >
                        {label} {required && <span className="text-danger">*</span>}
                    </label>
                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowSearchModal(prev => !prev)}
                            className="btn btn-link btn-xs text-primary-glow p-0 font-mono text-decoration-none"
                            style={{ fontSize: '0.72rem' }}
                            title="Search and browse all 80+ scientific disciplines"
                        >
                            <i className="bi bi-search me-1"></i>
                            {showSearchModal ? 'Hide Search' : 'Browse All (80+)'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsCustomMode(prev => !prev);
                                if (!isCustomMode) setCustomFieldText(value);
                            }}
                            className="btn btn-link btn-xs text-white-50 p-0 font-mono text-decoration-none"
                            style={{ fontSize: '0.72rem' }}
                            title="Enter an unlisted or hyper-specialized subdiscipline"
                        >
                            <i className="bi bi-pencil-square me-1"></i>
                            {isCustomMode ? 'Standard List' : 'Custom Field'}
                        </button>
                    </div>
                </div>
            )}

            {isCustomMode ? (
                <div className="input-group input-group-sm mb-2">
                    <span className="input-group-text bg-dark border-secondary border-opacity-25 text-primary-glow font-mono small">
                        <i className="bi bi-mortarboard-fill"></i>
                    </span>
                    <input
                        type="text"
                        value={customFieldText}
                        onChange={e => setCustomFieldText(e.target.value)}
                        placeholder="e.g. Neuro-immunometabolism or Astro-paleoclimatology..."
                        className="form-control bg-dark text-white border-secondary border-opacity-25 font-mono"
                        style={{ fontSize: compact ? '0.85rem' : '0.95rem' }}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={handleCustomSubmit}
                        className="btn btn-primary text-dark fw-bold px-3"
                    >
                        Apply
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsCustomMode(false)}
                        className="btn btn-outline-secondary"
                        title="Cancel custom field"
                    >
                        <i className="bi bi-x"></i>
                    </button>
                </div>
            ) : (
                <div className="position-relative">
                    <select
                        id={`${idPrefix}-select`}
                        value={value || ''}
                        onChange={e => handleSelectField(e.target.value)}
                        disabled={disabled}
                        className={`form-select ${compact ? 'form-select-sm' : 'form-select-lg'} text-white bg-dark border-secondary border-opacity-25 font-sans`}
                        style={{ 
                            fontSize: compact ? '0.85rem' : '0.95rem',
                            minHeight: compact ? '40px' : '48px',
                            cursor: disabled ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <option value="" disabled className="text-white-50">
                            Select Scientific Field (Defaults to Biology)
                        </option>
                        {SCIENTIFIC_FIELD_CATEGORIES.map(category => (
                            <optgroup 
                                key={category.id} 
                                label={`${category.name} (${category.fields.length})`}
                                className="bg-black text-primary-glow fw-bold"
                            >
                                {category.fields.map(fieldName => (
                                    <option 
                                        key={fieldName} 
                                        value={fieldName} 
                                        className="bg-dark text-white py-1"
                                    >
                                        {fieldName}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                        <optgroup label="Custom / Specialized" className="bg-black text-warning fw-bold">
                            <option value="__CUSTOM__" className="bg-dark text-warning">
                                ✎ Enter Custom Scientific Field...
                            </option>
                        </optgroup>
                    </select>
                </div>
            )}

            {/* Quick Search and Browse Dropdown/Drawer */}
            {showSearchModal && (
                <div className="p-3 mt-2 rounded-3 bg-black border border-primary border-opacity-30 shadow-lg animate-in">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-primary-glow font-mono fw-bold small text-uppercase d-flex align-items-center gap-1.5">
                            <i className="bi bi-search"></i>
                            Filter Across 80+ Scientific Disciplines
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowSearchModal(false)}
                            className="btn btn-link btn-sm text-white-50 p-0"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div className="mb-2.5">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Type to filter (e.g. quantum, virology, climate, cancer, AI, econometrics)..."
                            className="form-control form-control-sm bg-dark text-white border-secondary border-opacity-30 font-mono"
                            autoFocus
                        />
                    </div>
                    <div className="overflow-auto pe-1" style={{ maxHeight: '220px' }}>
                        {filteredCategories.length === 0 ? (
                            <div className="text-center py-3 text-white-50 small font-mono">
                                No matching disciplines found. 
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomMode(true);
                                        setCustomFieldText(searchQuery);
                                        setShowSearchModal(false);
                                    }}
                                    className="btn btn-link btn-xs text-primary-glow ms-2 p-0 text-decoration-none"
                                >
                                    Use "{searchQuery}" as custom field
                                </button>
                            </div>
                        ) : (
                            filteredCategories.map(cat => (
                                <div key={cat.id} className="mb-2">
                                    <div className="text-white-50 font-mono fw-bold pb-1 border-bottom border-secondary border-opacity-20 d-flex align-items-center gap-1.5" style={{ fontSize: '0.72rem' }}>
                                        <i className={`bi ${cat.icon} text-primary-glow`}></i>
                                        <span>{cat.name}</span>
                                    </div>
                                    <div className="d-flex flex-wrap gap-1.5 pt-1.5">
                                        {cat.fields.map(f => (
                                            <button
                                                key={f}
                                                type="button"
                                                onClick={() => handleSelectField(f)}
                                                className={`btn btn-xs rounded-2 font-mono text-start ${
                                                    (value || 'Biology (General)') === f
                                                        ? 'btn-primary text-dark fw-bold'
                                                        : 'btn-outline-secondary text-white-50 hover-text-white'
                                                }`}
                                                style={{ fontSize: '0.74rem' }}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Live Terminology & Literature Search Focus Preview Banner */}
            {showProfileCard && (
                <div className="mt-2 p-2.5 rounded-2 bg-dark bg-opacity-40 border border-secondary border-opacity-20 font-mono">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1.5">
                        <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-primary bg-opacity-20 text-primary-glow border border-primary border-opacity-30 d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                <i className={`bi ${currentCategory?.icon || 'bi-mortarboard'} me-0.5`}></i>
                                {currentCategory?.name || 'Scientific Discipline'}
                            </span>
                            <span className="text-white small fw-bold">
                                {effectiveField}
                            </span>
                        </div>
                        <span className="text-success small d-inline-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                            <i className="bi bi-check-circle-fill"></i>
                            <span>Terminology &amp; Literature Filter Active</span>
                        </span>
                    </div>

                    <div className="row g-2 text-white-50" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>
                        <div className="col-12 col-md-6">
                            <div className="p-1.5 rounded bg-black bg-opacity-30 border border-secondary border-opacity-15 h-100">
                                <span className="text-primary-glow fw-bold d-block mb-0.5">
                                    <i className="bi bi-book-half me-1"></i> Literature Indices Focused:
                                </span>
                                <span>{fieldProfile.primaryDatabases.slice(0, 4).join(' • ')}</span>
                            </div>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className="p-1.5 rounded bg-black bg-opacity-30 border border-secondary border-opacity-15 h-100">
                                <span className="text-info fw-bold d-block mb-0.5">
                                    <i className="bi bi-translate me-1"></i> Ontologies &amp; Nomenclature:
                                </span>
                                <span>{fieldProfile.preferredOntologies.slice(0, 3).join(' • ')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
