import React from 'react';
import './App.css';

// Define types for download and config
interface DownloadRequest {
  type: string;
  urls: string[];
}
interface DownloadItem {
  id: string;
  status: string;
  request?: DownloadRequest;
}
interface Config {
  username?: string;
  quality?: string;
  download_dir?: string;
  [key: string]: string | undefined;
}

function StatusBadge({ status }: { status: string }) {
  let color = '#888';
  if (status === 'queued') color = '#f0ad4e';
  else if (status === 'downloading') color = '#0275d8';
  else if (status === 'completed') color = '#5cb85c';
  else if (status === 'error') color = '#d9534f';
  return (
    <span style={{
      display: 'inline-block',
      minWidth: 80,
      padding: '0.2em 0.7em',
      borderRadius: 12,
      background: color,
      color: '#fff',
      fontWeight: 600,
      fontSize: '0.95em',
      textAlign: 'center',
      letterSpacing: 1
    }}>{status}</span>
  );
}

function DownloadQueue() {
  const [downloads, setDownloads] = React.useState<DownloadItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchDownloads() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch('http://localhost:8080/downloads');
        if (!resp.ok) throw new Error('Failed to fetch');
        const data = await resp.json();
        const list = Array.isArray(data.downloads) ? data.downloads : data;
        setDownloads(list as DownloadItem[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchDownloads();
    const interval = setInterval(fetchDownloads, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  return (
    <section>
      <h2>Download Queue</h2>
      {loading ? <p>Loading...</p> : error ? <p style={{color:'red'}}>Error: {error}</p> : (
        downloads.length === 0 ? <p>No downloads yet.</p> :
        <table style={{width:'100%', borderCollapse:'collapse', boxShadow:'0 2px 8px #0001', background:'#fff', borderRadius:8, overflow:'hidden'}}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Type</th>
              <th>URLs</th>
            </tr>
          </thead>
          <tbody>
            {downloads.map((d: DownloadItem) => (
              <tr key={d.id} className="download-row" style={{background:'#f9f9f9', transition:'background 0.2s'}}>
                <td>{d.id}</td>
                <td><StatusBadge status={d.status} /></td>
                <td>{d.request?.type || ''}</td>
                <td>{Array.isArray(d.request?.urls) ? d.request.urls.join(', ') : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function ConfigSection() {
  const [config, setConfig] = React.useState<Config | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchConfig() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch('http://localhost:8080/config');
        if (!resp.ok) throw new Error('Failed to fetch');
        const data = await resp.json();
        setConfig((data.config || data) as Config);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    setError(null);
    try {
      const resp = await fetch('http://localhost:8080/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!resp.ok) throw new Error('Failed to save');
      setSaveMsg('Saved!');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 1500);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setConfig({ ...config, [e.target.name]: e.target.value } as Config);
  }

  return (
    <section>
      <h2>Config</h2>
      {loading ? <p>Loading...</p> : error ? <p style={{color:'red'}}>Error: {error}</p> : (
        <form onSubmit={handleSave} style={{display:'flex', flexDirection:'column', gap:'1em', maxWidth:400}}>
          <label>
            Username:
            <input name="username" value={config?.username || ''} onChange={handleChange} />
          </label>
          <label>
            Quality:
            <input name="quality" value={config?.quality || ''} onChange={handleChange} />
          </label>
          <label>
            Download Directory:
            <input name="download_dir" value={config?.download_dir || ''} onChange={handleChange} />
          </label>
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          {saveMsg && <span style={{color:'green'}}>{saveMsg}</span>}
        </form>
      )}
    </section>
  );
}

function ManualDownloadSection() {
  const [urls, setUrls] = React.useState('');
  const [type, setType] = React.useState('track');
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    setLoading(true);
    const urlList = urls.split(/\s+/).filter(Boolean);
    if (urlList.length === 0) {
      setError('Please enter at least one URL.');
      setLoading(false);
      return;
    }
    try {
      const resp = await fetch('http://localhost:8080/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: urlList, type })
      });
      if (!resp.ok) throw new Error('Failed to submit download request');
      setStatus('Download request sent!');
      setUrls('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 2000);
    }
  }

  return (
    <section>
      <h2>Manual Download</h2>
      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'1em', maxWidth:500}}>
        <label>
          Beatport URL(s):
          <textarea value={urls} onChange={e => setUrls(e.target.value)} rows={3} placeholder="Paste one or more URLs, separated by space or newline" />
        </label>
        <label>
          Type:
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="track">Track</option>
            <option value="release">Release</option>
            <option value="playlist">Playlist</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send to Downloader'}</button>
        {status && <span style={{color:'green'}}>{status}</span>}
        {error && <span style={{color:'red'}}>{error}</span>}
      </form>
    </section>
  );
}

function App() {
  return (
    <div className="App" style={{maxWidth:700, margin:'2em auto', fontFamily:'sans-serif'}}>
      <h1>BeatportDL Dashboard</h1>
      <DownloadQueue />
      <hr />
      <ConfigSection />
      <hr />
      <ManualDownloadSection />
    </div>
  );
}

export default App;
