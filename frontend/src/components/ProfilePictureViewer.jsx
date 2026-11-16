import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './ProfilePictureViewer.css';

export default function ProfilePictureViewer({ src, name, onClose }) {
  const closeButton = useRef(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeButton.current?.focus();
    const handleKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') { event.preventDefault(); closeButton.current?.focus(); }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="profile-photo-lightbox" role="dialog" aria-modal="true" aria-label={`${name}'s profile picture`} onClick={onClose}>
      <button ref={closeButton} type="button" className="profile-photo-lightbox-close" aria-label="Close enlarged picture" onClick={onClose}><X size={23} /></button>
      <figure>
        <img src={src} alt={`${name}'s profile`} onClick={event => event.stopPropagation()} />
        <figcaption>{name}<span>Click outside the picture or press Escape to close</span></figcaption>
      </figure>
    </div>, document.body
  );
}
