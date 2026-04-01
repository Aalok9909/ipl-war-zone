import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, doc, setDoc, increment } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- TERE FIREBASE KEYS ---
const firebaseConfig = {
  apiKey: "AIzaSyDGSurLTsNCSch5XnlTuRj1pRk38N-2nXc",
  authDomain: "ipl-war-zone.firebaseapp.com",
  projectId: "ipl-war-zone",
  storageBucket: "ipl-war-zone.firebasestorage.app",
  messagingSenderId: "513299708708",
  appId: "1:513299708708:web:6bef20cba8c1a0d3ab51b1",
  measurementId: "G-6VHNPYVBLK"
};

const TEAMS = [
  { id: 'CSK', name: 'Chennai Super Kings', color: 'from-yellow-400 to-yellow-600', text: 'text-black', shadow: 'shadow-yellow-500/50', emoji: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', color: 'from-blue-600 to-blue-800', text: 'text-white', shadow: 'shadow-blue-500/50', emoji: '🏆' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: 'from-red-600 to-red-800', text: 'text-white', shadow: 'shadow-red-500/50', emoji: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: 'from-purple-700 to-indigo-900', text: 'text-white', shadow: 'shadow-purple-500/50', emoji: '⚔️' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: 'from-orange-500 to-orange-700', text: 'text-white', shadow: 'shadow-orange-500/50', emoji: '🦅' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('war');
  const [userTeam, setUserTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [votes, setVotes] = useState({ CSK: 520, MI: 480, RCB: 610, KKR: 230, SRH: 190 });
  const [inputMsg, setInputMsg] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);
  const [generatedRoast, setGeneratedRoast] = useState("");
  const [targetTeam, setTargetTeam] = useState("RCB");
  const [db, setDb] = useState(null);

  useEffect(() => {
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const _db = getFirestore(app);
      const _auth = getAuth(app);
      setDb(_db);

      signInAnonymously(_auth).catch(() => console.log("Firebase Auth disabled, using guest mode."));

      const q = collection(_db, "artifacts", "ipl-war-2026", "public", "data", "messages");
      const unsub = onSnapshot(q, (snap) => {
        const m = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(m.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 30));
      }, () => console.log("Firestore Rules check fail, using local feed."));

      const vUnsub = onSnapshot(collection(_db, "artifacts", "ipl-war-2026", "public", "data", "votes"), (snap) => {
        const v = {};
        snap.docs.forEach(d => v[d.id] = d.data().count || 0);
        if(Object.keys(v).length > 0) setVotes(v);
      });

      return () => { unsub(); vUnsub(); };
    } catch (e) { console.error("Firebase Key Error"); }
  }, []);

  const selectTeam = async (id) => {
    setUserTeam(id);
    localStorage.setItem('ipl_team_pref', id);
    if (db) {
      const voteDoc = doc(db, "artifacts", "ipl-war-2026", "public", "data", "votes", id);
      await setDoc(voteDoc, { count: increment(1) }, { merge: true }).catch(() => {});
    }
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userTeam) return;
    const newMsg = { text: inputMsg, team: userTeam, timestamp: { seconds: Date.now()/1000 }, uid: 'You' };
    setMessages([newMsg, ...messages]);
    if (db) {
      await addDoc(collection(db, "artifacts", "ipl-war-2026", "public", "data", "messages"), {
        text: inputMsg,
        team: userTeam,
        timestamp: serverTimestamp()
      }).catch(() => {});
    }
    setInputMsg("");
  };

  const getSavageRoast = async () => {
    setRoastLoading(true);
    setGeneratedRoast("");
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Savage 2-line roast for ${targetTeam} fans in Hinglish.` }] }] })
      });
      const data = await res.json();
      setGeneratedRoast(data.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch {
      setGeneratedRoast("Bhai server slow hai par teri team phir bhi hargi! 😂");
    }
    setRoastLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center overflow-x-hidden">
      {/* 🌌 NEON HEADER */}
      <header className="w-full max-w-md bg-zinc-900/90 backdrop-blur-2xl border-b border-zinc-800 p-6 sticky top-0 z-[100] flex justify-between items-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-orange-500 to-red-600 p-2.5 rounded-2xl shadow-lg shadow-orange-600/40 animate-pulse text-white font-black text-xl">🔥</div>
          <div>
            <h1 className="font-black italic text-2xl tracking-tighter text-orange-500 leading-none">WAR ZONE</h1>
            <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase mt-1">Fan Battlegrounds</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">
           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
           <span className="text-[9px] font-black tracking-widest text-zinc-400">SYNCED</span>
        </div>
      </header>

      <main className="w-full max-w-md flex-1 px-5 py-8 pb-32">
        {!userTeam ? (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center">
              <h2 className="text-5xl font-black italic tracking-tighter leading-none mb-4 uppercase">CHOOSE YOUR<br/><span className="text-orange-500">LEGION</span></h2>
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">LOYALTY TEST: EK BAAR CHUN LIYA TO WAR SHURU!</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {TEAMS.map(team => (
                <button key={team.id} onClick={() => selectTeam(team.id)} className={`relative group overflow-hidden bg-gradient-to-r ${team.color} p-8 rounded-[2.5rem] transition-all active:scale-95 shadow-2xl ${team.shadow} flex items-center justify-between border-2 border-white/10`}>
                  <div className="z-10 text-left">
                    <h3 className={`text-4xl font-black italic ${team.text}`}>{team.id}</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${team.text} opacity-60`}>{team.name}</p>
                  </div>
                  <span className="text-7xl z-10 transition-transform duration-500 group-hover:scale-110">{team.emoji}</span>
                  <div className="absolute -right-8 -bottom-8 text-white/5 text-[12rem] font-black rotate-12">{team.id}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in">
            {/* TABS */}
            <div className="flex bg-zinc-900 p-1.5 rounded-[2rem] border border-zinc-800 shadow-inner overflow-hidden">
              {['war', 'roast', 'stats'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-orange-600 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}>
                  {tab === 'war' ? 'WarRoom' : tab === 'roast' ? 'SledgeLab' : 'Ranking'}
                </button>
              ))}
            </div>

            {activeTab === 'war' && (
              <div className="space-y-4 animate-in slide-in-from-right-10 duration-300">
                {messages.length === 0 ? (
                  <div className="py-24 text-center opacity-20 italic font-black uppercase">Battleground is silent...</div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 px-2">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-gradient-to-r ${TEAMS.find(t=>t.id===msg.team)?.color} ${TEAMS.find(t=>t.id===msg.team)?.text}`}>{msg.team}</span>
                        <span className="text-[10px] font-bold text-zinc-600 italic">@Warrior</span>
                      </div>
                      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-[1.8rem] rounded-tl-none shadow-2xl">
                        <p className="text-sm font-medium italic leading-relaxed text-zinc-200">"{msg.text}"</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'roast' && (
              <div className="bg-zinc-900 p-8 rounded-[3rem] border border-zinc-800 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                <h3 className="text-3xl font-black italic text-red-500 uppercase tracking-tighter mb-4 text-center">AI SLEDGE LAB</h3>
                <div className="flex flex-wrap gap-2 mb-8 justify-center">
                  {TEAMS.map(team => (
                    <button key={team.id} onClick={() => setTargetTeam(team.id)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all ${targetTeam === team.id ? `bg-gradient-to-r ${team.color} ${team.text} scale-110 shadow-xl` : 'bg-zinc-800 text-zinc-500'}`}>{team.id}</button>
                  ))}
                </div>
                <button onClick={getSavageRoast} disabled={roastLoading} className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-3xl font-black text-xl shadow-xl active:scale-95 disabled:opacity-50 transition-all">
                  {roastLoading ? "Burning..." : "GENERATE BURN 🔥"}
                </button>
                {generatedRoast && (
                  <div className="mt-8 p-8 bg-black rounded-[2.5rem] border-2 border-dashed border-red-500/30 animate-in slide-in-from-bottom-5 text-center">
                    <p className="text-2xl font-black text-orange-200 italic leading-snug tracking-tighter mb-6">"{generatedRoast}"</p>
                    <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(generatedRoast + " 🔥 Checkout: " + window.location.href)}`, '_blank')} className="w-full bg-green-600 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg">WhatsApp Par Share Karo 🚀</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black italic text-yellow-500 uppercase tracking-tighter px-2">Global Ranking</h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] shadow-2xl overflow-hidden">
                  {TEAMS.sort((a,b) => (votes[b.id]||0) - (votes[a.id]||0)).map((t, idx) => (
                    <div key={t.id} className="p-6 border-b border-zinc-800 flex justify-between items-center last:border-0 hover:bg-zinc-800/50 transition-all">
                      <div className="flex items-center gap-5">
                        <span className={`text-4xl font-black italic ${idx === 0 ? 'text-yellow-500' : 'text-zinc-800'}`}>#{idx + 1}</span>
                        <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${t.color} flex items-center justify-center text-4xl shadow-xl shadow-black/40 transition-transform hover:scale-110`}>{t.emoji}</div>
                        <div>
                          <p className="font-black text-xl italic leading-none mb-1">{t.name}</p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{votes[t.id] || 0} Power Points</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 🚀 FLOATING INPUT */}
      {userTeam && activeTab === 'war' && (
        <div className="fixed bottom-8 w-full max-w-md px-6 z-[110] animate-in slide-in-from-bottom-10">
          <form onSubmit={sendMsg} className="bg-zinc-900/90 backdrop-blur-3xl border border-zinc-700 rounded-full flex items-center p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pl-7 border-t-white/10">
            <input 
              type="text" 
              placeholder={`Drop a sledge for ${userTeam}...`}
              className="bg-transparent flex-1 outline-none text-sm font-black text-white placeholder:text-zinc-700 italic"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
            />
            <button 
              type="submit" 
              className={`bg-gradient-to-tr ${TEAMS.find(t=>t.id===userTeam).color} ${TEAMS.find(t=>t.id===userTeam).text} px-8 py-3.5 rounded-full font-black text-xs active:scale-90 transition-all uppercase tracking-tighter shadow-xl`}
            >
              WAR
            </button>
          </form>
        </div>
      )}
      
      <footer className="w-full max-w-md text-center py-6 text-zinc-800 text-[8px] font-black uppercase tracking-[0.4em] mt-auto">
        Controversy of IPL Lovers | 2026 Season
      </footer>
    </div>
  );
}

