import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, serverTimestamp, doc, setDoc, increment 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- TERE FIREBASE CONFIG (INTEGRATED) ---
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
  { id: 'CSK', name: 'Chennai Super Kings', color: 'from-yellow-400 to-yellow-600', text: 'text-black', shadow: 'shadow-yellow-500/40', emoji: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', color: 'from-blue-600 to-blue-800', text: 'text-white', shadow: 'shadow-blue-500/40', emoji: '🏆' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: 'from-red-600 to-red-800', text: 'text-white', shadow: 'shadow-red-500/40', emoji: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: 'from-purple-700 to-indigo-900', text: 'text-white', shadow: 'shadow-purple-500/40', emoji: '⚔️' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: 'from-orange-500 to-orange-700', text: 'text-white', shadow: 'shadow-orange-500/40', emoji: '🦅' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('war');
  const [userTeam, setUserTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [votes, setVotes] = useState({});
  const [inputMsg, setInputMsg] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);
  const [generatedRoast, setGeneratedRoast] = useState("");
  const [targetTeam, setTargetTeam] = useState("RCB");
  const [db, setDb] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const _db = getFirestore(app);
      const _auth = getAuth(app);
      setDb(_db);

      signInAnonymously(_auth).catch(e => console.log("Login fail", e));
      onAuthStateChanged(_auth, (u) => {
        if(u) {
            setUser(u);
            const saved = localStorage.getItem('ipl_war_final_v1');
            if (saved) setUserTeam(saved);
        }
      });

      const q = collection(_db, "artifacts", "ipl-war-v1", "public", "data", "messages");
      const unsub = onSnapshot(q, (snap) => {
        const m = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(m.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 30));
      }, (err) => console.log("Firestore Error: ", err));

      const vUnsub = onSnapshot(collection(_db, "artifacts", "ipl-war-v1", "public", "data", "votes"), (snap) => {
        const v = {};
        snap.docs.forEach(d => v[d.id] = d.data().count || 0);
        setVotes(v);
      });

      return () => { unsub(); vUnsub(); };
    } catch (e) { console.error("Firebase Key Missing or Error"); }
  }, []);

  const selectTeam = async (id) => {
    setUserTeam(id);
    localStorage.setItem('ipl_war_final_v1', id);
    if (db) {
      const voteDoc = doc(db, "artifacts", "ipl-war-v1", "public", "data", "votes", id);
      await setDoc(voteDoc, { count: increment(1) }, { merge: true }).catch(() => {});
    }
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userTeam || !db || !user) return;
    await addDoc(collection(db, "artifacts", "ipl-war-v1", "public", "data", "messages"), {
      text: inputMsg,
      team: userTeam,
      uid: user.uid.substring(0, 5),
      timestamp: serverTimestamp()
    }).catch(e => alert("Please enable Firestore Rules in Firebase Console!"));
    setInputMsg("");
  };

  const generateSavageRoast = async () => {
    setRoastLoading(true);
    setGeneratedRoast("");
    const apiKey = ""; // System handled
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Act as a savage IPL fan. Write a funny 2-line roast for ${targetTeam} fans in Hinglish. Keep it witty and shareable on WhatsApp.` }] }] })
      });
      const data = await res.json();
      setGeneratedRoast(data.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch {
      setGeneratedRoast("Bhai server down hai, par teri team phir bhi hargi! 😂");
    }
    setRoastLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-orange-500/30">
      <Head>
        <title>IPL War Zone 2026</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
          body { font-family: 'Inter', sans-serif; }
          .font-gaming { font-family: 'Orbitron', sans-serif; }
          .glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
        `}</style>
      </Head>

      {/* 🌌 PREMIUM CYBER HEADER */}
      <header className="max-w-md mx-auto glass p-5 sticky top-0 z-[100] flex justify-between items-center shadow-2xl rounded-b-3xl">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-orange-500 to-red-600 p-2.5 rounded-2xl shadow-lg shadow-orange-600/40 animate-pulse text-white font-black text-xl">🔥</div>
          <div>
            <h1 className="font-gaming font-black italic text-xl tracking-tighter text-orange-500 leading-none">WAR ZONE</h1>
            <p className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mt-1">Live Fan Battle</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-ping shadow-[0_0_10px_#22c55e]"></div>
           <span className="text-[10px] font-black text-zinc-400">ONLINE</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-8 pb-32">
        {!userTeam ? (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center">
              <h2 className="font-gaming text-5xl font-black italic tracking-tighter leading-none mb-4 uppercase">JOIN THE<br/><span className="text-orange-500">WAR ROOM</span></h2>
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest leading-relaxed">Pick your army to start the ultimate sledge fest.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {TEAMS.map(team => (
                <button key={team.id} onClick={() => selectTeam(team.id)} className={`relative overflow-hidden bg-gradient-to-r ${team.color} p-8 rounded-[2.5rem] transition-all active:scale-95 shadow-2xl ${team.shadow} flex items-center justify-between border-2 border-white/10 group`}>
                  <div className="z-10 text-left">
                    <h3 className={`font-gaming text-3xl font-black italic ${team.text}`}>{team.id}</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${team.text} opacity-60`}>{team.name}</p>
                  </div>
                  <span className="text-7xl z-10 transition-transform duration-500 group-hover:scale-125">{team.emoji}</span>
                  <div className="absolute -right-8 -bottom-8 text-white/5 text-[12rem] font-black rotate-12">{team.id}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* 📱 NAVIGATION TABS */}
            <div className="flex glass p-1.5 rounded-[2rem] shadow-inner overflow-hidden border-zinc-800">
              {['war', 'roast', 'stats'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${activeTab === tab ? 'bg-orange-600 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400'}`}>
                  {tab === 'war' ? 'Feed' : tab === 'roast' ? 'Sledge' : 'Ranking'}
                </button>
              ))}
            </div>

            {/* TAB: FEED */}
            {activeTab === 'war' && (
              <div className="space-y-4 animate-in slide-in-from-right-10 duration-300">
                {messages.length === 0 ? (
                  <div className="py-24 text-center opacity-20 italic font-black uppercase tracking-widest">The silence before the storm...</div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.uid === user?.uid?.substring(0,5) ? 'items-end' : 'items-start'} gap-1.5`}>
                      <div className="flex items-center gap-2 px-2">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-gradient-to-r ${TEAMS.find(t=>t.id===msg.team)?.color} ${TEAMS.find(t=>t.id===msg.team)?.text}`}>{msg.team}</span>
                        <span className="text-[10px] font-bold text-zinc-600 italic">@{msg.uid}</span>
                      </div>
                      <div className={`max-w-[85%] glass p-5 rounded-[2rem] shadow-2xl ${msg.uid === user?.uid?.substring(0,5) ? 'rounded-tr-none border-orange-500/20' : 'rounded-tl-none border-zinc-800'}`}>
                        <p className="text-sm font-medium italic leading-relaxed text-zinc-200">"{msg.text}"</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: ROAST LAB */}
            {activeTab === 'roast' && (
              <div className="glass p-8 rounded-[3.5rem] shadow-2xl text-center animate-in zoom-in-95 border-red-500/10">
                <h3 className="font-gaming text-3xl font-black italic text-red-500 uppercase tracking-tighter mb-4">SLEDGE AI</h3>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">Choose a target and generate a savage burn.</p>
                
                <div className="flex flex-wrap gap-2 mb-8 justify-center">
                  {TEAMS.map(team => (
                    <button key={team.id} onClick={() => setTargetTeam(team.id)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all ${targetTeam === team.id ? `bg-gradient-to-r ${team.color} ${team.text} scale-110 shadow-xl shadow-red-900/20` : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 border border-zinc-800'}`}>{team.id}</button>
                  ))}
                </div>
                
                <button 
                  onClick={generateSavageRoast} 
                  disabled={roastLoading} 
                  className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-3xl font-black text-xl shadow-xl shadow-red-900/30 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                >
                  {roastLoading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <>BURN THEM 🔥</>}
                </button>
                
                {generatedRoast && (
                  <div className="mt-8 p-8 bg-zinc-950/50 rounded-[2.5rem] border-2 border-dashed border-red-500/20 animate-in slide-in-from-bottom-5">
                    <p className="text-2xl font-black text-orange-200 italic leading-snug tracking-tighter mb-8">"{generatedRoast}"</p>
                    <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(generatedRoast + " 🔥 #IPLWarZone")}`, '_blank')} className="w-full bg-green-600 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">WhatsApp Par Share Karo 🚀</button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: RANKING */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="font-gaming text-2xl font-black italic text-yellow-500 uppercase tracking-tighter px-2">GLOBAL RANKING</h3>
                <div className="glass rounded-[3rem] shadow-2xl overflow-hidden border-zinc-800">
                  {TEAMS.sort((a,b) => (votes[b.id]||0) - (votes[a.id]||0)).map((t, idx) => (
                    <div key={t.id} className="p-6 border-b border-zinc-800/50 flex justify-between items-center last:border-0 hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-5">
                        <span className={`font-gaming text-4xl font-black italic ${idx === 0 ? 'text-yellow-500' : 'text-zinc-800'}`}>#{idx + 1}</span>
                        <div className={`w-16 h-16 rounded-[1.8rem] bg-gradient-to-br ${t.color} flex items-center justify-center text-4xl shadow-xl transition-transform hover:scale-110`}>{t.emoji}</div>
                        <div>
                          <p className="font-gaming font-black text-lg italic leading-none mb-1">{t.name}</p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{votes[t.id] || 0} Registered Warriors</p>
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
          <form onSubmit={sendMsg} className="bg-zinc-900/95 backdrop-blur-3xl border border-zinc-700 rounded-full flex items-center p-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] pl-7">
            <input 
              type="text" 
              placeholder={`Sledge like a ${userTeam} Pro...`} 
              className="bg-transparent flex-1 outline-none text-sm font-black text-white placeholder:text-zinc-700 italic py-2"
              value={inputMsg} 
              onChange={e => setInputMsg(e.target.value)} 
            />
            <button type="submit" className={`bg-gradient-to-tr ${TEAMS.find(t=>t.id===userTeam).color} ${TEAMS.find(t=>t.id===userTeam).text} px-8 py-3.5 rounded-full font-black text-xs active:scale-90 transition-all uppercase tracking-tighter shadow-xl`}>WAR</button>
          </form>
        </div>
      )}

      <footer className="max-w-md mx-auto text-center py-10 text-zinc-800 text-[8px] font-black uppercase tracking-[0.4em]">
        Controversy of IPL Lovers only | 2026 Season
      </footer>
    </div>
  );
}

