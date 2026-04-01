import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, serverTimestamp, doc, setDoc, increment 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- YOUR FIREBASE CONFIG INTEGRATED ---
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
  { id: 'CSK', name: 'Chennai Super Kings', color: 'from-yellow-400 to-yellow-600', text: 'text-black', glow: 'shadow-yellow-500/40', emoji: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', color: 'from-blue-600 to-blue-800', text: 'text-white', glow: 'shadow-blue-500/40', emoji: '🏆' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: 'from-red-600 to-red-800', text: 'text-white', glow: 'shadow-red-500/40', emoji: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: 'from-purple-700 to-indigo-900', text: 'text-white', glow: 'shadow-purple-500/40', emoji: '⚔️' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: 'from-orange-500 to-orange-700', text: 'text-white', glow: 'shadow-orange-500/40', emoji: '🦅' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [userTeam, setUserTeam] = useState(null);
  const [activeTab, setActiveTab] = useState('war');
  const [messages, setMessages] = useState([]);
  const [votes, setVotes] = useState({});
  const [inputMsg, setInputMsg] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);
  const [generatedRoast, setGeneratedRoast] = useState("");
  const [targetTeam, setTargetTeam] = useState("RCB");

  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const appId = "ipl-war-zone-v1"; // Custom ID for artifacts path

  useEffect(() => {
    // 1. Initialize Firebase
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const _db = getFirestore(app);
    const _auth = getAuth(app);
    setDb(_db);
    setAuth(_auth);

    // 2. Auth Flow (Rule 3)
    const initAuth = async () => {
        try {
            await signInAnonymously(_auth);
        } catch (e) { console.error("Auth Error", e); }
    };
    initAuth();

    const unsubAuth = onAuthStateChanged(_auth, (u) => {
      if (u) {
        setUser(u);
        const saved = localStorage.getItem('ipl_war_v1_team');
        if (saved) setUserTeam(saved);
      }
    });

    // 3. Real-time Data Sync (Rule 1 & 2)
    const msgCol = collection(_db, "artifacts", appId, "public", "data", "messages");
    const unsubMsgs = onSnapshot(msgCol, (snap) => {
      const m = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sorting in memory (Rule 2)
      setMessages(m.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 50));
    });

    const voteCol = collection(_db, "artifacts", appId, "public", "data", "votes");
    const unsubVotes = onSnapshot(voteCol, (snap) => {
      const v = {};
      snap.docs.forEach(d => v[d.id] = d.data().count || 0);
      setVotes(v);
    });

    return () => { unsubAuth(); unsubMsgs(); unsubVotes(); };
  }, []);

  const selectTeam = async (id) => {
    if (!user || !db) return;
    setUserTeam(id);
    localStorage.setItem('ipl_war_v1_team', id);
    const voteDoc = doc(db, "artifacts", appId, "public", "data", "votes", id);
    await setDoc(voteDoc, { count: increment(1) }, { merge: true });
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userTeam || !db || !user) return;
    try {
        await addDoc(collection(db, "artifacts", appId, "public", "data", "messages"), {
          text: inputMsg,
          team: userTeam,
          uid: user.uid.substring(0, 5),
          timestamp: serverTimestamp()
        });
        setInputMsg("");
    } catch (e) { console.error("Send Error", e); }
  };

  const generateSavageRoast = async () => {
    if (roastLoading) return;
    setRoastLoading(true);
    setGeneratedRoast("");
    const apiKeyGemini = ""; // Handled by Environment
    const MODEL = "gemini-2.5-flash-preview-09-2025";
    
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKeyGemini}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Write a savage, witty 2-line roast for ${targetTeam} fans in Hinglish. Keep it funny and based on latest IPL memes.` }] }] })
      });
      const data = await res.json();
      setGeneratedRoast(data.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch {
      setGeneratedRoast("AI bhi hargaya teri team se! 😂");
    }
    setRoastLoading(false);
  };

  const copyAndShare = () => {
    const text = `🔥 Savage Roast check kar: "${generatedRoast}" \n\nJoin IPL War Zone: ${window.location.href} 🏏`;
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center selection:bg-orange-500/30 overflow-x-hidden">
      
      {/* 🏙️ PREMIUM GAMING HEADER */}
      <header className="w-full max-w-md bg-zinc-900/90 backdrop-blur-3xl border-b border-zinc-800 p-6 sticky top-0 z-[100] flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-orange-500 to-red-600 p-2.5 rounded-2xl shadow-lg shadow-orange-600/30 animate-pulse text-white">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 22l5-5M3 21l3-3"/></svg>
          </div>
          <div>
            <h1 className="font-black italic text-2xl tracking-tighter text-orange-500 leading-none uppercase">WAR ZONE</h1>
            <p className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase mt-1">Live Fan Battle</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping shadow-[0_0_10px_#22c55e]"></div>
        </div>
      </header>

      <main className="w-full max-w-md flex-1 px-5 py-8 pb-32">
        {!userTeam ? (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center">
              <h2 className="text-5xl font-black italic tracking-tighter leading-none mb-4 uppercase">Join The<br/><span className="text-orange-500">Elite Warriors</span></h2>
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Select your side to enter the war room.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {TEAMS.map(team => (
                <button key={team.id} onClick={() => selectTeam(team.id)} className={`relative group overflow-hidden bg-gradient-to-r ${team.color} p-7 rounded-[2.5rem] transition-all active:scale-95 shadow-2xl ${team.glow} flex items-center justify-between border-2 border-white/10`}>
                  <div className="z-10">
                    <h3 className={`text-3xl font-black italic ${team.text}`}>{team.id}</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${team.text} opacity-60`}>{team.name}</p>
                  </div>
                  <span className="text-6xl z-10 group-hover:scale-125 transition-transform duration-500">{team.emoji}</span>
                  <div className="absolute -right-6 -bottom-6 text-white/5 text-[10rem] font-black rotate-12">{team.id}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 📱 NAVIGATION TABS */}
            <div className="flex bg-zinc-900 p-1.5 rounded-[2rem] border border-zinc-800 shadow-inner overflow-hidden">
              {['war', 'roast', 'stats'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`flex-1 py-3.5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-orange-600 text-white shadow-xl' : 'text-zinc-600'}`}
                >
                  {tab === 'war' ? 'WarRoom' : tab === 'roast' ? 'SledgeLab' : 'Ranking'}
                </button>
              ))}
            </div>

            {activeTab === 'war' && (
              <div className="space-y-4 animate-in slide-in-from-right-10 duration-300">
                {messages.length === 0 ? (
                  <div className="py-24 text-center opacity-20 italic font-black uppercase tracking-widest">Waiting for the first sledge...</div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.uid === user?.uid?.substring(0,5) ? 'items-end' : 'items-start'} gap-1.5`}>
                      <div className="flex items-center gap-2 px-2">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter bg-gradient-to-r ${TEAMS.find(t=>t.id===msg.team)?.color} ${TEAMS.find(t=>t.id===msg.team)?.text}`}>{msg.team}</span>
                        <span className="text-[10px] font-bold text-zinc-600 italic">@{msg.uid}</span>
                      </div>
                      <div className={`max-w-[85%] p-4 rounded-[1.5rem] border shadow-2xl ${msg.uid === user?.uid?.substring(0,5) ? 'bg-zinc-800 border-zinc-700 rounded-tr-none' : 'bg-zinc-900 border-zinc-800 rounded-tl-none'}`}>
                        <p className="text-sm font-medium leading-relaxed italic">"{msg.text}"</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'roast' && (
              <div className="bg-zinc-900 p-8 rounded-[3rem] border border-zinc-800 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                <h3 className="text-3xl font-black italic text-red-500 uppercase tracking-tighter mb-4 flex items-center gap-2 underline decoration-red-900/30">
                  SLEDGE AI
                </h3>
                <div className="flex flex-wrap gap-2 mb-8 justify-center">
                  {TEAMS.map(team => (
                    <button key={team.id} onClick={() => setTargetTeam(team.id)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all ${targetTeam === team.id ? `bg-gradient-to-r ${team.color} ${team.text} scale-110 shadow-xl` : 'bg-zinc-800 text-zinc-500'}`}>{team.id}</button>
                  ))}
                </div>
                <button onClick={generateSavageRoast} disabled={roastLoading} className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-3xl font-black text-xl shadow-xl active:scale-95 disabled:opacity-50 transition-all">
                  {roastLoading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div> : <>DESTROY THEM 🔥</>}
                </button>
                {generatedRoast && (
                  <div className="mt-8 p-6 bg-black rounded-[2rem] border-2 border-dashed border-red-500/30 animate-in slide-in-from-bottom-5">
                    <p className="text-2xl font-black text-orange-200 italic leading-snug tracking-tighter">"{generatedRoast}"</p>
                    <button 
                      onClick={copyAndShare} 
                      className="mt-6 w-full bg-green-600 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                    >
                      Share on WhatsApp 🚀
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6 animate-in fade-in">
                <h3 className="text-2xl font-black italic text-yellow-500 uppercase tracking-tighter px-2">Global Dominance</h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl">
                  {TEAMS.sort((a,b) => (votes[b.id]||0) - (votes[a.id]||0)).map((t, idx) => (
                    <div key={t.id} className="p-6 border-b border-zinc-800 flex justify-between items-center hover:bg-zinc-800/50 transition-all">
                      <div className="flex items-center gap-5">
                        <span className={`text-4xl font-black italic ${idx === 0 ? 'text-yellow-500' : 'text-zinc-800'}`}>#{idx + 1}</span>
                        <div className={`w-14 h-14 rounded-3xl bg-gradient-to-br ${t.color} flex items-center justify-center text-3xl shadow-xl`}>{t.emoji}</div>
                        <div>
                          <p className="font-black text-lg italic leading-none mb-1">{t.name}</p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{votes[t.id] || 0} Registered Fans</p>
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

      {/* 🚀 FLOATING WAR INPUT */}
      {userTeam && activeTab === 'war' && (
        <div className="fixed bottom-8 w-full max-w-md px-6 z-[110] animate-in slide-in-from-bottom-10">
          <form onSubmit={sendMsg} className="bg-zinc-900/80 backdrop-blur-3xl border border-zinc-700 rounded-full flex items-center p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pl-7 border-t-white/10">
            <input 
              type="text" 
              placeholder={`Sledge as a ${userTeam} Legend...`}
              className="bg-transparent flex-1 outline-none text-sm font-black text-white placeholder:text-zinc-700 italic"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
            />
            <button 
              type="submit" 
              className={`bg-gradient-to-tr ${TEAMS.find(t=>t.id===userTeam).color} ${TEAMS.find(t=>t.id===userTeam).text} px-8 py-3.5 rounded-full font-black text-xs active:scale-90 transition-all shadow-xl uppercase tracking-tighter`}
            >
              WAR
            </button>
          </form>
        </div>
      )}
      
      <footer className="w-full max-w-md text-center py-6 text-zinc-800 text-[8px] font-black uppercase tracking-[0.4em] mt-auto">
        Built for the controversy of IPL Lovers | 2026 Season
      </footer>
    </div>
  );
}

