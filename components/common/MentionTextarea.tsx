import React, { useState, useRef } from 'react';

interface MentionOption {
    label: string;
    value: string;
    description: string;
}

interface MentionTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onChangeValue: (val: string) => void;
}

export const MentionTextarea: React.FC<MentionTextareaProps> = ({
    value,
    onChangeValue,
    className = "form-control",
    placeholder = "Type your feedback... Use @ to reference prior steps (e.g. @step1, @hypothesis, @dataset)",
    rows = 3,
    ...rest
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [cursorPos, setCursorPos] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const mentionOptions: MentionOption[] = [
        { label: '@step1', value: '@step1 (Literature Review)', description: 'Insert Literature Review findings' },
        { label: '@step2', value: '@step2 (Primary Hypothesis)', description: 'Insert Core Hypothesis statement' },
        { label: '@variables', value: '@variables (Step 3)', description: 'Insert Independent/Dependent Variables' },
        { label: '@methodology', value: '@methodology (Step 4)', description: 'Insert Experimental Method & Protocol' },
        { label: '@dataset', value: '@dataset (Step 5)', description: 'Insert Synthetic/Collected Data Summary' },
        { label: '@analysis', value: '@analysis (Step 7)', description: 'Insert Statistical Results & p-values' }
    ];

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        onChangeValue(val);
        setCursorPos(pos);

        // Check if user just typed '@' or is typing a mention
        const lastChar = val.slice(pos - 1, pos);
        if (lastChar === '@') {
            setShowMenu(true);
        } else if (val.slice(Math.max(0, pos - 10), pos).includes('@') && !val.slice(pos - 1, pos).match(/\s/)) {
            setShowMenu(true);
        } else {
            setShowMenu(false);
        }
    };

    const handleSelectMention = (opt: MentionOption) => {
        if (!textareaRef.current) return;
        const beforeAt = value.slice(0, Math.max(0, cursorPos - 1));
        const afterAt = value.slice(cursorPos);
        const newValue = `${beforeAt}${opt.value} ${afterAt}`;
        onChangeValue(newValue);
        setShowMenu(false);
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 50);
    };

    return (
        <div className="position-relative">
            <textarea
                ref={textareaRef}
                className={className}
                placeholder={placeholder}
                rows={rows}
                value={value}
                onChange={handleTextChange}
                {...rest}
            />

            {showMenu && (
                <div 
                    className="position-absolute bg-dark border border-secondary shadow-lg rounded p-1 z-3"
                    style={{ bottom: '100%', left: '0', right: '0', maxHeight: '180px', overflowY: 'auto' }}
                >
                    <div className="px-2 py-1 text-white-50 font-monospace border-bottom border-secondary border-opacity-25" style={{ fontSize: '0.7rem' }}>
                        <i className="bi bi-at me-1 text-primary-glow"></i> Select Inline Context Reference:
                    </div>
                    {mentionOptions.map((opt) => (
                        <div
                            key={opt.label}
                            className="p-2 text-white hover-bg-primary rounded cursor-pointer d-flex align-items-center justify-content-between"
                            onClick={() => handleSelectMention(opt)}
                            style={{ fontSize: '0.82rem' }}
                        >
                            <span className="fw-bold text-primary-glow font-monospace">{opt.label}</span>
                            <span className="text-white-50 small text-truncate ms-2" style={{ maxWidth: '200px' }}>{opt.description}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
