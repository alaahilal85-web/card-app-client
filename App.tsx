import React, { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type Listing = {
  id: string;
  game: string;
  skill?: string;
  language?: string;
  lat: number;
  lng: number;
  status: 'OPEN'|'RESERVED'|'IN_PROGRESS'|'COMPLETED'|'EXPIRED';
  expiresAt: string;
  distanceKm?: number;
  venue?: { name: string } | null;
}

export function App() {
  const [tab, setTab] = useState<'login'|'discover'|'host'|'requests'|'checkin'>('login');
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('0000');

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
  }, [token]);

  if (!token) {
    return (
      <div className="container">
        <div className="title">Card App MVP</div>
        <div className="card">
          <div className="row">
            <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
            <button onClick={async()=>{
              await fetch(API+'/auth/otp/request',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone }) });
              alert('OTP requested. Use 0000 in dev.');
            }}>Request OTP</button>
          </div>
          <div className="row" style={{marginTop:8}}>
            <input placeholder="Code (0000 dev)" value={code} onChange={e=>setCode(e.target.value)} />
            <button onClick={async()=>{
              const r = await fetch(API+'/auth/otp/verify',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone, code }) });
              const j = await r.json();
              if (j.token) { setToken(j.token); setTab('discover'); }
              else alert(JSON.stringify(j));
            }}>Verify & Login</button>
          </div>
          <div className="muted" style={{marginTop:8}}>MVP uses fake OTP (0000). Replace with SMS provider later.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
        <div className="title">Card App MVP</div>
        <div className="row">
          <div className={'tab ' + (tab==='discover'?'active':'')} onClick={()=>setTab('discover')}>Discover</div>
          <div className={'tab ' + (tab==='host'?'active':'')} onClick={()=>setTab('host')}>Host</div>
          <div className={'tab ' + (tab==='requests'?'active':'')} onClick={()=>setTab('requests')}>My Requests</div>
          <div className={'tab ' + (tab==='checkin'?'active':'')} onClick={()=>setTab('checkin')}>Check‑in</div>
          <div className="tab" onClick={()=>{ localStorage.removeItem('token'); setToken(null); setTab('login'); }}>Logout</div>
        </div>
      </div>

      {tab==='discover' && <Discover token={token!} />}
      {tab==='host' && <Host token={token!} />}
      {tab==='requests' && <Requests token={token!} />}
      {tab==='checkin' && <Checkin token={token!} />}
    </div>
  )
}

function useGeo() {
  const [coords, setCoords] = useState<{lat:number,lng:number} | null>(null);
  useEffect(()=>{
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      _err => setCoords({ lat: 24.4539, lng: 54.3773 }) // default Abu Dhabi
    );
  },[]);
  return coords;
}

function Discover({ token }: { token: string }) {
  const coords = useGeo();
  const [game, setGame] = useState<string>('');
  const [items, setItems] = useState<Listing[]>([]);

  useEffect(()=>{
    const run = async () => {
      if (!coords) return;
      const qs = new URLSearchParams({
        lat: String(coords.lat),
        lng: String(coords.lng),
        radiusKm: '15',
        ...(game ? { game } as any : {})
      });
      const r = await fetch(`${API}/listings?${qs.toString()}`);
      const j = await r.json();
      setItems(j.listings || []);
    };
    run();
  }, [coords, game]);

  return (
    <div className="card">
      <div className="row" style={{alignItems:'center'}}>
        <select value={game} onChange={e=>setGame(e.target.value)}>
          <option value="">All games</option>
          {['Trix','Baloot','Tarneeb','Hand','Banakel'].map(g=><option key={g} value={g}>{g}</option>)}
        </select>
        <span className="muted">Showing within 15km</span>
      </div>
      <div className="grid" style={{marginTop:12}}>
        {items.map(l => (
          <div className="card" key={l.id}>
            <div className="row" style={{justifyContent:'space-between'}}>
              <div><span className="badge">{l.game}</span></div>
              <div className="muted">{l.distanceKm?.toFixed(1)} km away</div>
            </div>
            <div className="muted">{l.venue?.name || 'GPS location'}</div>
            <div className="row" style={{marginTop:8}}>
              <button onClick={async()=>{
                const r = await fetch(`${API}/${l.id}/requests`, { method:'POST', headers:{ 'Authorization': 'Bearer '+token, 'Content-Type':'application/json' } });
                const j = await r.json();
                alert(j.error ? JSON.stringify(j) : 'Request sent!');
              }}>Request to Join</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Host({ token }: { token: string }) {
  const coords = useGeo();
  const [form, setForm] = useState({ game:'Baloot', skill:'Intermediate', language:'Arabic', ttlMinutes:15, radiusKm:15 });

  if (!coords) return <div className="card">Getting your location…</div>;

  return (
    <div className="card">
      <div className="row">
        <select value={form.game} onChange={e=>setForm({...form, game:e.target.value})}>
          {['Trix','Baloot','Tarneeb','Hand','Banakel'].map(g=><option key={g} value={g}>{g}</option>)}
        </select>
        <input placeholder="Skill" value={form.skill} onChange={e=>setForm({...form, skill:e.target.value})} />
        <input placeholder="Language" value={form.language} onChange={e=>setForm({...form, language:e.target.value})} />
        <input type="number" min={5} max={60} value={form.ttlMinutes} onChange={e=>setForm({...form, ttlMinutes: Number(e.target.value)})} />
        <input type="number" min={1} max={15} value={form.radiusKm} onChange={e=>setForm({...form, radiusKm: Number(e.target.value)})} />
        <button onClick={async()=>{
          const r = await fetch(API+'/listings',{ method:'POST', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ ...form, lat: coords.lat, lng: coords.lng }) });
          const j = await r.json();
          alert(j.error ? JSON.stringify(j) : 'Listing posted for 15 minutes!');
        }}>Post Table</button>
      </div>
      <div className="muted" style={{marginTop:8}}>Posts expire automatically after TTL.</div>
    </div>
  )
}

function Requests({ token }: { token: string }) {
  const [listingId, setListingId] = useState('');
  const [requestId, setRequestId] = useState('');

  return (
    <div className="card">
      <div className="row">
        <input placeholder="Request ID to accept" value={requestId} onChange={e=>setRequestId(e.target.value)} />
        <button onClick={async()=>{
          const r = await fetch(`${API}/requests/${requestId}/accept`, { method:'POST', headers:{ 'Authorization':'Bearer '+token }});
          const j = await r.json();
          alert(j.error ? JSON.stringify(j) : `Accepted! Join token: ${j.joinToken}`);
          if (j.listingId) setListingId(j.listingId);
        }}>Accept Request</button>
      </div>
      <div className="muted" style={{marginTop:8}}>Tip: Use DevTools Network tab to see request IDs from your join attempts.</div>
      {listingId && <div className="muted">Listing reserved: {listingId}</div>}
    </div>
  )
}

function Checkin({ token }: { token: string }) {
  const coords = useGeo();
  const [listingId, setListingId] = useState('');
  const [joinToken, setJoinToken] = useState('');

  if (!coords) return <div className="card">Getting your location…</div>;

  return (
    <div className="card">
      <div className="row">
        <input placeholder="Listing ID" value={listingId} onChange={e=>setListingId(e.target.value)} />
        <input placeholder="Join token" value={joinToken} onChange={e=>setJoinToken(e.target.value)} />
        <button onClick={async()=>{
          const r = await fetch(`${API}/checkin`, { method:'POST', headers:{ 'Authorization':'Bearer '+token, 'Content-Type':'application/json' }, body: JSON.stringify({ listingId, joinToken, lat: coords.lat, lng: coords.lng }) });
          const j = await r.json();
          alert(j.error ? JSON.stringify(j) : `Checked in! Session: ${j.sessionId}`);
        }}>Check‑in</button>
      </div>
      <div className="row">
        <input placeholder="Session ID to finish" />
        <button onClick={()=>alert('Use POST /checkin/finish with sessionId (not wired in UI for brevity).')}>Finish Session</button>
      </div>
    </div>
  )
}
