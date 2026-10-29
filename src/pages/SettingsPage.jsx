import { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { useData } from '../context/DataContext.jsx';
import { ConfirmDialog } from '../components/Dialogs.jsx';
import { downloadFile, toCSV } from '../utils/exportUtils.js';

export default function SettingsPage() {
  const { api, isGuest, settings, saveSettings, habits, logs, dailyNotes, importBackup, clearAll, notify, today } = useData();
  const [threshold, setThreshold] = useState(String(settings.streakThreshold));
  const [pending, setPending] = useState(null); // { data, summary }
  const [importError, setImportError] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const tNum = Number(threshold);
  const tValid = Number.isInteger(tNum) && tNum >= 1 && tNum <= 100;

  const exportCSV = () => {
    downloadFile(`my-habits-${today}.csv`, toCSV(habits, logs, dailyNotes), 'text/csv;charset=utf-8');
    notify('CSV exported');
  };
  const exportJSON = async () => {
    try {
      const data = await api.exportAll();
      downloadFile(`my-habits-backup-${today}.json`, JSON.stringify(data, null, 2), 'application/json');
      notify('Backup exported');
    } catch (e) { notify(e.message, 'error'); }
  };

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    if (file.size > 10 * 1024 * 1024) return setImportError({ message: 'That file is larger than 10 MB.' });
    let data;
    try { data = JSON.parse(await file.text()); } catch { return setImportError({ message: 'That file is not valid JSON.' }); }
    try {
      const { summary } = await api.importBackup(data, true); // dry run: validates, changes nothing
      setPending({ data, summary });
    } catch (ex) { setImportError({ message: ex.message, details: ex.details }); }
  };

  const doImport = async () => {
    setBusy(true);
    try { await importBackup(pending.data); notify('Backup imported'); setPending(null); }
    catch (e) { notify(e.message, 'error'); setPending(null); }
    setBusy(false);
  };
  const doClear = async () => {
    setBusy(true);
    try { await clearAll(); notify('All data deleted'); }
    catch (e) { notify(e.message, 'error'); }
    setClearing(false);
    setBusy(false);
  };

  return (
    <>
      <section className="card">
        <h2>General</h2>
        <div className="settings-grid">
          <label className="field"><span>Theme</span>
            <select value={settings.theme} onChange={(e) => saveSettings({ theme: e.target.value })}>
              <option value="system">Match system</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </label>
          <label className="field"><span>Default dashboard range</span>
            <select value={settings.defaultRange} onChange={(e) => saveSettings({ defaultRange: Number(e.target.value) })}>
              {[7, 14, 30, 60, 90].map((n) => <option key={n} value={n}>{n} days</option>)}
            </select>
          </label>
        </div>

        <div className="field">
          <span>Streak threshold</span>
          <div className="threshold">
            <input type="range" min="1" max="100" value={tValid ? tNum : settings.streakThreshold} aria-label="Streak threshold slider" onChange={(e) => setThreshold(e.target.value)} />
            <input type="number" min="1" max="100" step="1" value={threshold} aria-label="Streak threshold percent" onChange={(e) => setThreshold(e.target.value)} />
            <span>%</span>
            <button type="button" className="btn btn-primary" disabled={!tValid || tNum === settings.streakThreshold}
              onClick={() => { saveSettings({ streakThreshold: tNum }); notify('Threshold saved'); }}>Save</button>
          </div>
          <small className={tValid ? 'muted' : 'error'}>
            {tValid ? 'A day counts toward your streak when at least this share of habits is done.' : 'Enter a whole number from 1 to 100.'}
          </small>
        </div>

        <label className="check-line">
          <input type="checkbox" checked={settings.confirmArchive} onChange={(e) => saveSettings({ confirmArchive: e.target.checked })} />
          <span>Ask before archiving a habit</span>
        </label>
        <p className="muted small">Permanent deletion and clearing all data always ask for confirmation.</p>
      </section>

      <section className="card">
        <h2>Your data</h2>
        <p className="muted">
          {isGuest
            ? 'You are not signed in, so nothing is saved. Sign in with Google to keep your habits.'
            : 'Your data is stored privately under your Google account. Export a backup regularly.'}
        </p>
        <div className="actions wrap">
          <button type="button" className="btn" onClick={exportCSV}><Download size={16} aria-hidden="true" /> Export CSV</button>
          <button type="button" className="btn" onClick={exportJSON}><Download size={16} aria-hidden="true" /> Export JSON backup</button>
          <button type="button" className="btn" disabled={isGuest} title={isGuest ? "Sign in to import a backup" : undefined} onClick={() => fileRef.current?.click()}><Upload size={16} aria-hidden="true" /> Import JSON backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={pickFile} aria-label="Choose backup file" />
        </div>
        {importError && (
          <div className="error-box" role="alert">
            <strong>{importError.message}</strong>
            {importError.details?.length > 0 && <ul>{importError.details.map((d) => <li key={d}>{d}</li>)}</ul>}
            <p className="small">Your existing data was not changed.</p>
          </div>
        )}
      </section>

      <section className="card danger-zone">
        <h2>Danger zone</h2>
        <p className="muted">Deletes every habit, log, journal entry and setting. Export a backup first.</p>
        <button type="button" className="btn btn-danger" onClick={() => setClearing(true)}><Trash2 size={16} aria-hidden="true" /> Clear all data</button>
      </section>

      {pending && (
        <ConfirmDialog
          title="Replace your data with this backup?" confirmLabel="Replace my data" danger busy={busy}
          message={`This backup has ${pending.summary.habits} habits, ${pending.summary.logs} daily logs and ${pending.summary.dailyNotes} journal entries. Importing replaces everything you have now.`}
          onConfirm={doImport} onCancel={() => setPending(null)}
        />
      )}
      {clearing && (
        <ConfirmDialog
          title="Delete all data?" confirmLabel="Delete everything" danger busy={busy}
          message="This permanently deletes all habits, logs, notes and settings from your database. It cannot be undone."
          onConfirm={doClear} onCancel={() => setClearing(false)}
        />
      )}
    </>
  );
}
