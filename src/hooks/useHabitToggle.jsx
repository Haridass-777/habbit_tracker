import { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { NoteDialog } from '../components/Dialogs.jsx';
import { logKey } from '../utils/completion.js';

/** Shared checkbox + note flow for the dashboard table and the day page. Render {dialog} once. */
export function useHabitToggle() {
  const { logMap, setLog, notify } = useData();
  const [pending, setPending] = useState(null);

  const toggle = (habit, date) => {
    const cur = logMap.get(logKey(habit.id, date));
    if (cur?.completed) setLog(habit.id, date, { completed: false }); // the note is kept
    else setPending({ habit, date, mode: 'complete' });
  };
  const editNote = (habit, date) => setPending({ habit, date, mode: 'edit' });
  const close = () => setPending(null);

  let dialog = null;
  if (pending) {
    const { habit, date, mode } = pending;
    const existing = logMap.get(logKey(habit.id, date))?.note || '';
    dialog = (
      <NoteDialog
        habit={habit} date={date} mode={mode} initial={existing}
        onClose={close}
        onSkip={() => { setLog(habit.id, date, { completed: true }); close(); }}
        onSave={async (note) => {
          const ok = await setLog(habit.id, date, mode === 'complete' ? { completed: true, note } : { note });
          if (ok) notify(note ? 'Note saved' : mode === 'edit' ? 'Note removed' : 'Marked complete');
          close();
        }}
      />
    );
  }
  return { toggle, editNote, dialog };
}
