import React, { useEffect, useState, useRef } from 'react';

interface TooltipState {
    visible: boolean;
    text: string;
    x: number;
    y: number;
    placement: 'top' | 'bottom';
}

export const GlobalDelayedTooltip: React.FC = () => {
    const [tooltip, setTooltip] = useState<TooltipState>({
        visible: false,
        text: '',
        x: 0,
        y: 0,
        placement: 'top'
    });

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const activeElementRef = useRef<HTMLElement | null>(null);
    const stashedTitleRef = useRef<{ el: HTMLElement; title: string } | null>(null);

    useEffect(() => {
        const getButtonDescription = (el: HTMLElement): string => {
            // 1. Check custom attribute or stashed title / original title / aria-label
            const dataTooltip = el.getAttribute('data-tooltip');
            if (dataTooltip) return dataTooltip;

            const stashedTitle = el.getAttribute('data-stashed-title');
            if (stashedTitle) return stashedTitle;

            const title = el.getAttribute('title');
            if (title) return title;

            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel) return ariaLabel;

            // 2. Check inner text or inner icon class
            const rawText = (el.innerText || el.textContent || '').trim();
            if (rawText) {
                const upper = rawText.toUpperCase();
                if (upper.includes('VERIFY & CONTINUE')) return "Validates current step outputs and advances to the next workflow node";
                if (upper.includes('FINALIZE AND DEPLOY')) return "Finalizes scientific manuscript and launches export bundle options";
                if (upper.includes('FINISH PROJECT')) return "Completes research workflow and generates project summary";
                if (upper.includes('EXPORT BUNDLE')) return "Downloads ZIP bundle containing Word, PPT slides, and citations";
                if (upper.includes('SYNC NODE DATA')) return "Extracts literature citations directly from experiment logs";
                if (upper.includes('ADD CITATION') || upper === 'ADD') return "Creates a new manual reference citation entry";
                if (upper.includes('FINE-TUNE') || upper.includes('TUNING')) return "Opens tuning controls for prompt parameters and AI rigor";
                if (upper.includes('CITATION MANAGER') || upper.includes('CITATIONS')) return "Opens bibliography and reference manager drawer";
                if (upper.includes('LAB NOTEBOOK') || upper.includes('NOTEBOOK')) return "Opens research log and experiment notes drawer";
                if (upper.includes('SETTINGS')) return "Configures API keys, storage, and platform preferences";
                if (upper.includes('DASHBOARD')) return "Navigates to project management dashboard";
                if (upper.includes('DOCS') || upper.includes('ARTIFACTS')) return "Views generated research papers and presentation slides";
                if (upper.includes('AUDIT') || upper.includes('SYSTEM AUDIT')) return "Runs diagnostic health checks and test suite";
                if (upper.includes('RUN') || upper.includes('EXECUTE')) return "Executes current step pipeline calculation";
                if (upper.includes('RETRY')) return "Re-runs failed step with refreshed parameters";
                if (upper.includes('RESOLVE')) return "Applies automated resolution fix to blocker";
                if (upper.includes('SAVE')) return "Saves current project state or settings";
                if (upper.includes('CLEAR')) return "Clears current search filter or input text";
                if (upper.includes('COPY')) return "Copies formatted content to clipboard";
                if (upper.includes('HELP')) return "Opens documentation and user guide";
                if (upper.includes('ARCHIVE')) return "Moves project to archived storage";
                if (upper.includes('NEW PROJECT') || upper.includes('CREATE')) return "Starts a new scientific research experiment";

                if (rawText.length < 40) return `Executes "${rawText}" action`;
                return rawText.slice(0, 50) + '...';
            }

            // 3. Fallback check for icon-only buttons
            const icon = el.querySelector('i');
            if (icon) {
                const iconClass = icon.className;
                if (iconClass.includes('bi-grid-3x3-gap')) return "Opens system menu, navigation, and workspace controls";
                if (iconClass.includes('bi-gear') || iconClass.includes('bi-sliders')) return "Opens node configuration and tuning settings";
                if (iconClass.includes('bi-journal')) return "Opens lab notebook or citation manager";
                if (iconClass.includes('bi-trash')) return "Removes selected item from workspace";
                if (iconClass.includes('bi-x') || iconClass.includes('bi-x-lg')) return "Closes current view or drawer window";
                if (iconClass.includes('bi-clipboard')) return "Copies item content to clipboard";
                if (iconClass.includes('bi-download')) return "Downloads artifact file";
                if (iconClass.includes('bi-plus')) return "Adds a new item or reference citation";
                if (iconClass.includes('bi-search')) return "Searches or filters workspace entries";
                if (iconClass.includes('bi-arrow-repeat')) return "Refreshes or syncs node data";
            }

            return "Triggers button action";
        };

        const clearPendingTooltip = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            if (stashedTitleRef.current) {
                const { el, title } = stashedTitleRef.current;
                if (document.body.contains(el)) {
                    el.setAttribute('title', title);
                    el.removeAttribute('data-stashed-title');
                }
                stashedTitleRef.current = null;
            }
            activeElementRef.current = null;
            setTooltip(prev => (prev.visible ? { ...prev, visible: false } : prev));
        };

        const handlePointerOver = (e: PointerEvent) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;

            // Find closest button or button-like element
            const buttonEl = target.closest<HTMLElement>('button, .btn, [role="button"], [data-tooltip]');
            if (!buttonEl) {
                clearPendingTooltip();
                return;
            }

            // If already hovering the same button, do nothing
            if (activeElementRef.current === buttonEl) return;

            clearPendingTooltip();
            activeElementRef.current = buttonEl;

            // Stash title if present so native browser tooltip doesn't overlap
            const nativeTitle = buttonEl.getAttribute('title');
            if (nativeTitle) {
                stashedTitleRef.current = { el: buttonEl, title: nativeTitle };
                buttonEl.setAttribute('data-stashed-title', nativeTitle);
                buttonEl.removeAttribute('title');
            }

            const desc = getButtonDescription(buttonEl);

            // Set 2 second timer (2000ms)
            timerRef.current = setTimeout(() => {
                if (!activeElementRef.current || !document.body.contains(activeElementRef.current)) return;

                const rect = activeElementRef.current.getBoundingClientRect();
                const spaceAbove = rect.top;
                const placement = spaceAbove > 60 ? 'top' : 'bottom';
                
                const centerX = Math.max(120, Math.min(window.innerWidth - 120, rect.left + rect.width / 2));
                const topY = placement === 'top' ? rect.top - 8 : rect.bottom + 8;

                setTooltip({
                    visible: true,
                    text: desc,
                    x: centerX,
                    y: topY,
                    placement
                });
            }, 2000); // 2 seconds
        };

        const handlePointerOut = (e: PointerEvent) => {
            if (!activeElementRef.current) return;
            const related = e.relatedTarget as HTMLElement | null;
            if (related && activeElementRef.current.contains(related)) {
                return; // mouse still inside element
            }
            clearPendingTooltip();
        };

        const handleClick = () => {
            clearPendingTooltip();
        };

        const handleScroll = () => {
            clearPendingTooltip();
        };

        document.addEventListener('pointerover', handlePointerOver, true);
        document.addEventListener('pointerout', handlePointerOut, true);
        document.addEventListener('click', handleClick, true);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            clearPendingTooltip();
            document.removeEventListener('pointerover', handlePointerOver, true);
            document.removeEventListener('pointerout', handlePointerOut, true);
            document.removeEventListener('click', handleClick, true);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    if (!tooltip.visible || !tooltip.text) return null;

    const transformStr = tooltip.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';

    return (
        <div 
            style={{
                position: 'fixed',
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                transform: transformStr,
                backgroundColor: '#facc15', // Yellow background
                color: '#000000',           // Black text
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                lineHeight: '1.3',
                maxWidth: '280px',
                textAlign: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.25)',
                zIndex: 9999999,
                pointerEvents: 'none',
                animation: 'yellowTooltipFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                wordBreak: 'break-word',
                letterSpacing: '0.01em'
            }}
        >
            {/* Arrow Pointer */}
            <div 
                style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    ...(tooltip.placement === 'top' ? {
                        bottom: '-5px',
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid #facc15'
                    } : {
                        top: '-5px',
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderBottom: '5px solid #facc15'
                    })
                }}
            />
            <div className="d-flex align-items-center justify-content-center gap-1">
                <i className="bi bi-info-circle-fill me-1" style={{ fontSize: '10px' }}></i>
                <span>{tooltip.text}</span>
            </div>
        </div>
    );
};
