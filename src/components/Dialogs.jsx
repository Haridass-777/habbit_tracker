import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { formatLong } from '../utils/dateUtils.js';

/** Accessible modal built on the native <dialog>: focus trap, Escape to close, backdrop click. */
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => { if (d?.open) d.close(); };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="modal-body">
        <div className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="modal-text">{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/**
 * mode "complete": opened right after ticking a habit. Save note / Skip commit the completion; Cancel commits nothing.
 * mode "edit":     edit or remove the note of a habit on a date without touching its completion.
 */
export function NoteDialog({ habit, date, initial = '', mode, onSave, onSkip, onClose }) {
  const [note, setNote] = useState(initial);
  const complete = mode === 'complete';
  return (
    <Modal title={complete ? `${habit.name} completed` : `Note: ${habit.name}`} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); onSave(note.trim()); }}>
        <p className="muted small">{formatLong(date)}</p>
        <label className="field">
          <span>Add a note (optional)</span>
          <textarea
            autoFocus rows={4} maxLength={2000} value={note}
            placeholder="Solved two array problems..."
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <div className="modal-actions">
          {complete ? (
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
          ) : (
            <>
              <button type="button" className="btn" onClick={onClose}>Close</button>
              {initial && <button type="button" className="btn btn-danger-ghost" onClick={() => onSave('')}>Remove note</button>}
            </>
          )}
          {complete && <button type="button" className="btn" onClick={onSkip}>Skip</button>}
          <button type="submit" className="btn btn-primary">Save note</button>
        </div>
      </form>
    </Modal>
  );
}
