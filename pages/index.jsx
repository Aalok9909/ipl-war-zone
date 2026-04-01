import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  serverTimestamp, 
  doc, 
  setDoc, 
  increment 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';

// --- BHAU, APNA FIREBASE CONFIG YAHAN DALNA ---
// Agar config nahi hai, toh ye empty object site crash nahi hone dega, bas data save nahi hoga.
const firebaseConfig = {
  apiKey: "AIzaSy...", // Firebase Console se copy karo
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize logic that won't crash on Vercel
let db, auth;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase init failed", e);
}

const TEAMS = [
  { id: 'CSK', name: 'Chennai Super Kings', color: 'from-yellow-400 to-yellow-600', text: 'text-black', emoji: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', color: 'from-blue-600 to-blue-800', text: 'text-white', emoji: '🏆' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: 'from-red-600 to-red-800', text: 'text-white', emoji: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: 'from-purple-700 to-indigo-900', text: 'text-white', emoji: '⚔️' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: 'from-orange-500 to-orange-700', text: 'text-white', emoji: '🦅' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('war');
  const [user, setUser] = useState(null);
  const [userTeam, setUserTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [votes, setVotes] = useState({});
  const [inputMsg, setInputMsg] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);
  const [generatedRoast, setGeneratedRoast] = useState("");
  const [targetTeam, setTargetTeam] = useState("RCB");

  useEffect(() => {
    if (!auth || !db) return;

    signInAnonymously(auth).catch(e => console.log("Login fail", e));
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const saved = localStorage.getItem(`ipl_team_${u.uid}`);
        if (saved) setUserTeam(saved);
      }
    });

    const unsubMsgs = onSnapshot(collection(db, "messages"), (snap) => {
      const m = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(m.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 30));
    });

    const unsubVotes = onSnapshot(collection(db, "votes"), (snap) => {
      const v = {};
      snap.docs.forEach(d => v[d.id] = d.data().count || 0);
      setVotes(v);
    });

    return () => { unsubMsgs(); unsubVotes(); };
  }, []);

  const selectTeam = async (id) => {
    setUserTeam(id);
    localStorage.setItem(`ipl_team_${user?.uid}`, id);
    if (db) await setDoc(doc(db, "votes", id), { count: increment(1) }, { merge: true });
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userTeam || !db) return;
    await addDoc(collection(db, "messages"), {
      text: inputMsg,
      team: userTeam,
      uid: user?.uid?.substring(0, 5) || "Fan",
      timestamp: serverTimestamp()
    });
    setInputMsg("");
  };

  const getRoast = async () => {
    setRoastLoading(true);
    setGeneratedRoast("");
    // Use an empty string for the key as requested, the environment will handle it.
    const apiKeyStr = ""; 
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKeyStr}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Write a savage 2-line roast for ${targetTeam} fans in Hinglish.` }] }] })
      });
      const data = await res.json();
      setGeneratedRoast(data.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch {
      setGeneratedRoast("Error! Par teri team phir bhi hargi! 😂");
    }
    setRoastLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center">
      <header className="w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800 p-5 sticky top-0 z-[100] flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-xl shadow-lg animate-pulse">🔥</div>
          <h1 className="font-black italic text-xl tracking-tighter text-orange-500">WAR ZONE</h1>
        </div>
      </header>

      <main className="w-full max-w-md flex-1 px-5 py-8 pb-32">
        {!userTeam ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95">
            <h2 className="text-3xl font-black italic text-center">JOIN THE BATTLE 🏏</h2>
            <div className="grid grid-cols-1 gap-4">
              {TEAMS.map(team => (
                <button key={team.id} onClick={() => selectTeam(team.id)} className={`bg-gradient-to-r ${team.color} p-6 rounded-3xl font-black text-2xl flex justify-between items-center active:scale-95 transition-all`}>
                  <span>{team.id}</span>
                  <span className="text-4xl">{team.emoji}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 shadow-xl">
              <button onClick={() => setActiveTab('war')} className={`flex-1 py-3 rounded-xl font-black text-xs ${activeTab === 'war' ? 'bg-orange-600' : 'text-zinc-500'}`}>WAR ROOM</button>
              <button onClick={() => setActiveTab('roast')} className={`flex-1 py-3 rounded-xl font-black text-xs ${activeTab === 'roast' ? 'bg-red-600' : 'text-zinc-500'}`}>ROAST LAB</button>
              <button onClick={() => setActiveTab('stats')} className={`flex-1 py-3 rounded-xl font-black text-xs ${activeTab === 'stats' ? 'bg-yellow-600' : 'text-zinc-500'}`}>STATS</button>
            </div>

            {activeTab === 'war' && (
              <div className="space-y-4">
                {messages.map(m => (
                  <div key={m.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${TEAMS.find(t=>t.id===m.team)?.color} ${TEAMS.find(t=>t.id===m.team)?.text}`}>{m.team}</span>
                      <span className="text-[10px] font-bold text-zinc-500">@{m.uid}</span>
                    </div>
                    <p className="text-sm font-medium italic">"{m.text}"</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'roast' && (
              <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-center">
                <h3 className="text-2xl font-black text-red-500 mb-6 uppercase italic">AI SLEDGE</h3>
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  {TEAMS.map(team => (
                    <button key={team.id} onClick={() => setTargetTeam(team.id)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${targetTeam === team.id ? `bg-gradient-to-r ${team.color} ${team.text}` : 'bg-zinc-800 text-zinc-500'}`}>{team.id}</button>
                  ))}
                </div>
                <button onClick={getRoast} disabled={roastLoading} className="w-full bg-red-600 py-4 rounded-2xl font-black text-lg active:scale-95 mb-6 shadow-xl shadow-red-900/30">
                  {roastLoading ? "Burning..." : "GENERATE BURN 🔥"}
                </button>
                {generatedRoast && <div className="p-6 bg-black rounded-2xl border-2 border-dashed border-red-500/30 font-black italic text-xl text-orange-200">"{generatedRoast}"</div>}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
                {TEAMS.sort((a,b) => (votes[b.id]||0) - (votes[a.id]||0)).map((t, i) => (
                  <div key={t.id} className="p-5 border-b border-zinc-800 flex justify-between items-center">
                    <span className="font-black text-slate-700 text-xl">#{i+1} {t.emoji}</span>
                    <span className="font-black text-sm">{t.name}</span>
                    <span className="text-xs font-black text-slate-400">{votes[t.id] || 0} Fans</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {userTeam && activeTab === 'war' && (
        <div className="fixed bottom-6 w-full max-w-md px-6 z-[110]">
          <form onSubmit={sendMsg} className="bg-zinc-900 border border-zinc-700 rounded-full flex items-center p-1.5 shadow-2xl pl-6">
            <input type="text" placeholder="Drop a sledge..." className="bg-transparent flex-1 outline-none text-sm font-bold" value={inputMsg} onChange={e => setInputMsg(e.target.value)} />
            <button type="submit" className="bg-orange-600 px-6 py-2.5 rounded-full font-black text-xs">SEND</button>
          </form>
        </div>
      )}
    </div>
  );
}

