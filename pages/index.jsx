import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, serverTimestamp, doc, setDoc, increment 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Swords, 
  Flame, 
  Trophy, 
  User, 
  Send, 
  Share2, 
  TrendingUp, 
  ShieldAlert,
  Zap,
  RotateCcw
} from 'lucide-react';

// --- CONFIGURATION (Firebase + Gemini) ---
// Bhai maine teri keys yahan pehle se daal di hain
const firebaseConfig = {
  apiKey: "AIzaSyDGSurLTsNCSch5XnlTuRj1pRk38N-2nXc",
  authDomain: "ipl-war-zone.firebaseapp.com",
  projectId: "ipl-war-zone",
  storageBucket: "ipl-war-zone.firebasestorage.app",
  messagingSenderId: "513299708708",
  appId: "1:513299708708:web:6bef20cba8c1a0d3ab51b1",
  measurementId: "G-6VHNPYVBLK"
};

const GEMINI_API_KEY = "AIzaSyAlVyqpCvtziPh9xOqyAsy393L4CkNlfcs"; 

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
  const scrollRef = useRef(null);

  // --- FIREBASE SYNC (RULE 1, 2, 3) ---
  useEffect(() => {
    try {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const _db = getFirestore(app);
      const _auth = getAuth(app);
      setDb(_db);

      // Rule 3: Auth first
      const initAuth = async () => {
        await signInAnonymously(_auth);
      };
      initAuth();

      onAuthStateChanged(_auth, (u) => {
        if(u) {
            setUser(u);
            const saved = localStorage.getItem('ipl_war_pro_max_team');
            if (saved) setUserTeam(saved);
        }
      });

      // Rule 1: Strict Path Implementation
      const appId = "ipl-war-zone-v10"; 
      const q = collection(_db, "artifacts", appId, "public", "data", "messages");
      
      const unsub = onSnapshot(q, (snap) => {
        const m = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Rule 2: Sorting in memory
        setMessages(m.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 40));
      });

      const vUnsub = onSnapshot(collection(_db, "artifacts", appId, "public", "data", "votes"), (snap) => {
        const v = {};
        snap.docs.forEach(d => v[d.id] = d.data().count || 0);
        setVotes(v);
      });

      return () => { unsub(); vUnsub(); };
    } catch (e) { console.error("Initialization Error", e); }
  }, []);

  // --- ACTIONS ---
  const selectTeam = async (id) => {
    if (!user || !db) return;
    setUserTeam(id);
    localStorage.setItem('ipl_war_pro_max_team', id);
    const appId = "ipl-war-zone-v10";
    const voteDoc = doc(db, "artifacts", appId, "public", "data", "votes", id);
    await setDoc(voteDoc, { count: increment(1) }, { merge: true });
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userTeam || !db || !user) return;
    const appId = "ipl-war-zone-v10";
    await addDoc(collection(db, "artifacts", appId, "public", "data", "messages"), {
      text: inputMsg,
      team: userTeam,
      uid: user.uid.substring(0, 5),
      timestamp: serverTimestamp()
    });
    setInputMsg("");
  };

  const generateSavageRoast = async () => {
    if (roastLoading) return;
    setRoastLoading(true);
    setGeneratedRoast("");
    
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ 
            parts: [{ text: `Act as a savage, toxic but funny Indian cricket fan. Write a savage 2-line roast for ${targetTeam} fans in Hinglish. Keep it shareable and use latest memes.` }] 
          }] 
        })
      });
      const data = await res.json();
      const roastText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      setGeneratedRoast(roastText || "Bhai AI bhi darr gaya teri team ke roast se!");
    } catch (err) {
      setGeneratedRoast("Internet slow hai, par downfall fast hai! 😂");
    } finally {
      setRoastLoading(false);
    }
  };

  const shareOnWhatsApp = () => {
    const text = `🔥 Savage Roast check kar: "${generatedRoast}" \n\nAbhi join kar IPL War Zone: ${window.location.href} 🏏`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-orange-500/30 overflow-x-hidden">
      <Head>
        <title>IPL War Zone | Pro Battle</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;900&family=Inter:wght@400;700&display=swap');
          .font-gaming { font-family: 'Orbitron', sans-serif; }
          .glass-nav { background: rgba(10, 10, 15, 0.9); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06); }
          .card-pro { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 2.5rem; }
          .neon-shadow { box-shadow: 0 0 20px rgba(255, 80, 0, 0.1); }
          @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
          .animate-pulse-slow { animation: bounce-slow 3s infinite; }
        `}</style>
      </Head>

      {/* 🚀 HIGH-END HEADER */}
      <header className="max-w-md mx-auto glass-nav p-6 sticky top-0 z-[100] flex justify-between items-center rounded-b-[2.5rem]">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-orange-500 to-red-600 p-2.5 rounded-2xl shadow-lg shadow-orange-600/40 animate-pulse text-white">
            <Flame size={24} />
          </div>
          <div>
            <h1 className="font-gaming font-black italic text-2xl tracking-tighter text-orange-500 leading-none">WAR ZONE</h1>
            <p className="text-[10px] font-bold text-zinc-500 tracking-[0.4em] uppercase mt-1">Live Sync Active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
           <span className="text-[10px] font-black text-zinc-400">READY</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-8 pb-36">
        {!userTeam ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="text-center">
              <h2 className="font-gaming text-5xl font-black italic tracking-tighter leading-none mb-4 uppercase tracking-tight">Select<br/><span className="text-orange-500">Your Side</span></h2>
              <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Ek baar army chuni to piche mudna mana hai!</p>
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              {TEAMS.map(team => (
                <button key={team.id} onClick={() => selectTeam(team.id)} className={`relative group overflow-hidden bg-gradient-to-r ${team.color} p-8 rounded-[2.5rem] transition-all active:scale-95 shadow-2xl ${team.shadow} flex items-center justify-between border-2 border-white/10`}>
                  <div className="z-10 text-left">
                    <h3 className={`font-gaming text-4xl font-black italic ${team.text}`}>{team.id}</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${team.text} opacity-60`}>{team.name}</p>
                  </div>
                  <span className="text-7xl z-10 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12">{team.emoji}</span>
                  <div className="absolute -right-8 -bottom-8 text-white/5 text-[12rem] font-black rotate-12 select-none">{team.id}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* 📱 PRO NAVIGATION TABS */}
            <div className="flex glass-nav p-1.5 rounded-[2.5rem] shadow-inner border border-zinc-900">
              {[
                { id: 'war', label: 'Feed', icon: <Swords size={16} /> },
                { id: 'roast', label: 'Sledge', icon: <Zap size={16} /> },
                { id: 'stats', label: 'Rank', icon: <TrendingUp size={16} /> }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`flex-1 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-orange-600 text-white shadow-xl neon-glow' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: BATTLE FEED */}
            {activeTab === 'war' && (
              <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
                {messages.length === 0 ? (
                  <div className="py-24 text-center opacity-20 italic font-black uppercase tracking-widest flex flex-col items-center gap-4">
                     <RotateCcw className="animate-spin" />
                     <span>Waiting for the first shot...</span>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.uid === user?.uid?.substring(0,5) ? 'items-end' : 'items-start'} gap-2`}>
                      <div className="flex items-center gap-2 px-3">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-gradient-to-r ${TEAMS.find(t=>t.id===msg.team)?.color} ${TEAMS.find(t=>t.id===msg.team)?.text}`}>{msg.team}</span>
                        <span className="text-[10px] font-bold text-zinc-600 italic">@{msg.uid}</span>
                      </div>
                      <div className={`max-w-[85%] card-pro p-5 shadow-2xl ${msg.uid === user?.uid?.substring(0,5) ? 'rounded-tr-none border-orange-500/20 bg-orange-950/10' : 'rounded-tl-none border-zinc-800'}`}>
                        <p className="text-sm font-medium italic leading-relaxed text-zinc-200 font-inter">"{msg.text}"</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: SLEDGE LAB (GEMINI POWERED) */}
            {activeTab === 'roast' && (
              <div className="card-pro p-8 shadow-2xl text-center animate-in zoom-in-95 border-red-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><ShieldAlert size={100} /></div>
                <h3 className="font-gaming text-3xl font-black italic text-red-500 uppercase tracking-tighter mb-4">SLEDGE AI</h3>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-10 leading-relaxed italic">Destroy rival fans with savage AI burns.</p>
                
                <div className="flex flex-wrap gap-2 mb-10 justify-center">
                  {TEAMS.map(team => (
                    <button key={team.id} onClick={() => setTargetTeam(team.id)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all ${targetTeam === team.id ? `bg-gradient-to-r ${team.color} ${team.text} scale-110 shadow-xl shadow-red-900/40` : 'bg-zinc-900 text-zinc-600 hover:bg-zinc-800 border border-zinc-800'}`}>{team.id}</button>
                  ))}
                </div>
                
                <button 
                  onClick={generateSavageRoast} 
                  disabled={roastLoading} 
                  className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-red-900/50 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                >
                  {roastLoading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <>GENERATE BURN 🔥</>}
                </button>
                
                {generatedRoast && (
                  <div className="mt-10 p-8 bg-black/40 rounded-[2.5rem] border-2 border-dashed border-red-500/20 animate-in slide-in-from-bottom-5">
                    <p className="text-2xl font-black text-orange-200 italic leading-snug tracking-tighter mb-8 italic">"{generatedRoast}"</p>
                    <button onClick={shareOnWhatsApp} className="w-full bg-green-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 flex items-center justify-center gap-2">
                      <Share2 size={16} /> WhatsApp Pe Aag Lagao
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: LEADERBOARD */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="font-gaming text-2xl font-black italic text-yellow-500 uppercase tracking-tighter px-2 flex items-center gap-3">
                  <Trophy size={24} /> Global Dominance
                </h3>
                <div className="card-pro shadow-2xl overflow-hidden border-zinc-800">
                  {TEAMS.sort((a,b) => (votes[b.id]||0) - (votes[a.id]||0)).map((t, idx) => (
                    <div key={t.id} className="p-6 border-b border-zinc-800/50 flex justify-between items-center last:border-0 hover:bg-white/5 transition-all group">
                      <div className="flex items-center gap-6">
                        <span className={`font-gaming text-4xl font-black italic ${idx === 0 ? 'text-yellow-500' : 'text-zinc-800'}`}>#{idx + 1}</span>
                        <div className={`w-16 h-16 rounded-[1.8rem] bg-gradient-to-br ${t.color} flex items-center justify-center text-4xl shadow-xl transition-transform group-hover:scale-110`}>{t.emoji}</div>
                        <div>
                          <p className="font-gaming font-black text-lg italic leading-none mb-1">{t.name}</p>
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

      {/* 🏹 THE ULTIMATE WAR INPUT */}
      {userTeam && activeTab === 'war' && (
        <div className="fixed bottom-8 w-full max-w-md px-6 z-[110] animate-in slide-in-from-bottom-10">
          <form onSubmit={sendMsg} className="glass-nav border border-zinc-700 rounded-full flex items-center p-2 shadow-[0_25px_60px_rgba(0,0,0,1)] pl-7">
            <input 
              type="text" 
              placeholder={`Sledge like a ${userTeam} Boss...`} 
              className="bg-transparent flex-1 outline-none text-sm font-black text-white placeholder:text-zinc-700 italic py-4 font-inter"
              value={inputMsg} 
              onChange={e => setInputMsg(e.target.value)} 
            />
            <button type="submit" className={`bg-gradient-to-tr ${TEAMS.find(t=>t.id===userTeam).color} ${TEAMS.find(t=>t.id===userTeam).text} px-8 py-4 rounded-full font-black text-xs active:scale-95 transition-all uppercase tracking-tighter shadow-xl flex items-center gap-2`}>
              <Send size={16} /> WAR
            </button>
          </form>
        </div>
      )}

      <footer className="max-w-md mx-auto text-center py-10 text-zinc-900 text-[8px] font-black uppercase tracking-[0.5em] mt-auto select-none">
        Built for the controversy of IPL Lovers | 2026 Season
      </footer>
    </div>
  );
}
