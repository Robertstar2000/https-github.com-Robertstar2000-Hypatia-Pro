import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useModalContext, Z_INDEX_LAYERS } from '../../context/ModalContext';

interface PortalModalProps {
  isOpen: boolean;
  onClose?: () => void;
  modalId?: string;
  stackOrder?: number; // Optional explicit stack order fallback
  baseLayer?: number;
  children: React.ReactNode;
  backdropColor?: string;
  closeOnEsc?: boolean;
  closeOnBackdropClick?: boolean;
}

export const PortalModal: React.FC<PortalModalProps> = ({
  isOpen,
  onClose,
  modalId,
  stackOrder,
  baseLayer = Z_INDEX_LAYERS.BACKDROP_BASE,
  children,
  backdropColor = 'rgba(2, 6, 23, 0.85)',
  closeOnEsc = true,
  closeOnBackdropClick = true,
}) => {
  const generatedId = useId();
  const id = modalId || generatedId;
  const { registerModal, unregisterModal, getZIndex } = useModalContext();

  useEffect(() => {
    if (!isOpen) return;

    registerModal(id);
    return () => {
      unregisterModal(id);
    };
  }, [isOpen, id, registerModal, unregisterModal]);

  const zIndexInfo = getZIndex(id, baseLayer);
  
  // Use explicit stackOrder if provided and no dynamic registration stack found
  const computedBackdropZIndex = stackOrder !== undefined && zIndexInfo.stackOrder === 0
    ? baseLayer + stackOrder * 100
    : zIndexInfo.backdropZIndex;
  
  const computedContentZIndex = computedBackdropZIndex + 1;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only close top-most modal on Escape to prevent closing multiple stacked modals simultaneously
      if (e.key === 'Escape' && closeOnEsc && onClose && zIndexInfo.isTopModal) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose, zIndexInfo.isTopModal]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{
        backgroundColor: backdropColor,
        backdropFilter: 'blur(12px)',
        zIndex: computedBackdropZIndex,
        pointerEvents: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnBackdropClick && onClose && zIndexInfo.isTopModal) {
          onClose();
        }
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: computedContentZIndex,
          pointerEvents: 'auto',
          maxWidth: '95vw',
          maxHeight: '95vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

