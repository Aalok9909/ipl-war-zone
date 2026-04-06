import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, serverTimestamp, doc, setDoc, increment 
} from 'firebase/firestore';
import { 
  getAuth,
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  Swords, Flame, Trophy, User, Send, Share2, 
  TrendingUp, ShieldAlert, Zap, LogOut, Mail, Lock, UserCircle, RefreshCw, ChevronRight
} from 'lucide-react';

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDGSurLTsNCSch5XnlTuRj1pRk38N-2nXc",
  authDomain: "ipl-war-zone.firebaseapp.com",
  projectId: "ipl-war-zone",
  storageBucket: "ipl-war-zone.firebasestorage.app",
  messagingSenderId: "513299708708",
  appId: "1:513299708708:web:6bef20cba8c1a0d3ab51b1",
  measurementId: "G-6VHNPYVBLK"
};

const GEMINI_KEY = "AIzaSyAlVyqpCvtziPh9xOqyAsy393L4CkNlfcs";

const TEAMS = [
  { id: 'CSK', name: 'Chennai Super Kings', color: 'from-yellow-400 to-yellow-600', text: 'text-black', glow: 'shadow-yellow-500/40', emoji: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', color: 'from-blue-600 to-blue-800', text: 'text-white', glow: 'shadow-blue-500/40', emoji: '🏆' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: 'from-red-600 to-red-800', text: 'text-white', glow: 'shadow-red-500/40', emoji: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: 'from-purple-700 to-indigo-900', text: 'text-white', glow: 'shadow-purple-500/40', emoji: '⚔️' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: 'from-orange-500 to-orange-700', text: 'text-white', glow: 'shadow-orange-500/40', emoji: '🦅' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('war');
  const [userTeam, setUserTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [votes, setVotes] = useState({});
  const [inputMsg, setInputMsg] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);
  const [generatedRoast, setGeneratedRoast] = useState("");
  const [targetTeam, setTargetTeam] = useState("RCB");

  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const appId = "ipl-war-final-v10";

  useEffect(() => {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const _db = getFirestore(app);
    const _auth = getAuth(app);
    setDb(_db);
    setAuth(_auth);

    const unsubAuth = onAuthStateChanged(_auth, (u) => {
      setUser(u);
      if (u) {
        const saved = localStorage.getItem(`team_${u.uid}`);
        if (saved) setUserTeam(saved);
      }
      setLoading(false);
    });

    const msgCol = collection(_db, "artifacts", appId, "public", "data", "messages");
    const unsubMsgs = onSnapshot(msgCol, (snap) => {
      const m = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(m.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 50));
    });

    const unsubVotes = onSnapshot(collection(_db, "artifacts", appId, "public", "data", "votes"), (snap) => {
      const v = {};
      snap.docs.forEach(d => v[d.id] = d.data().count || 0);
      setVotes(v);
    });

    return () => { unsubAuth(); unsubMsgs(); unsubVotes(); };
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'signup') {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: username });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = async (id) => {
    setUserTeam(id);
    localStorage.setItem(`team_${user.uid}`, id);
    const voteDoc = doc(db, "artifacts", appId, "public", "data", "votes", id);
    await setDoc(voteDoc, { count: increment(1) }, { merge: true });
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userTeam || !db || !user) return;
    await addDoc(collection(db, "artifacts", appId, "public", "data", "messages"), {
      text: inputMsg,
      team: userTeam,
      userName: user.displayName || 'Warrior',
      uid: user.uid,
      timestamp: serverTimestamp()
    });
    setInputMsg("");
  };

  const generateBurn = async () => {
    if (roastLoading) return;
    setRoastLoading(true);
    setGeneratedRoast("");
    
    const target = TEAMS.find(t => t.id === targetTeam).name;
    const prompt = `Act as a savage, toxic Indian cricket fan. Write a funny and painful 2-line roast for ${target} fans in Hinglish. Keep it current with 2026 memes. Output ONLY the text.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      setGeneratedRoast(data.candidates?.[0]?.content?.parts?.[0]?.text || "Bhai system hang ho gaya!");
    } catch (err) {
      setGeneratedRoast("Bhai server down hai par teri team phir bhi hargi! 😂");
    } finally {
      setRoastLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <RefreshCw className="animate-spin text-orange-500 mb-4" size={48} />
      <p className="text-orange-500 font-black tracking-widest animate-pulse uppercase italic">Preparing Battleground...</p>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center justify-center p-6">
      <Head><script src="https://cdn.tailwindcss.com"></script></Head>
      <div className="w-full max-w-sm space-y-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-tr from-orange-600 to-red-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-600/30">
            <Swords size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">IPL War Zone</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Dunia Ka Sabse Savage Battleground</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'signup' && (
            <div className="relative group">
              <UserCircle className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors" size={18} />
              <input 
                type="text" placeholder="WARRIOR NAME" required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-12 py-4 outline-none focus:border-orange-500 transition-all font-bold text-sm"
                value={username} onChange={e => setUsername(e.target.value)}
              />
            </div>
          )}
          <div className="relative group">
            <Mail className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors" size={18} />
            <input 
              type="email" placeholder="EMAIL ADDRESS" required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-12 py-4 outline-none focus:border-orange-500 transition-all font-bold text-sm"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors" size={18} />
            <input 
              type="password" placeholder="PASSWORD" required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-12 py-4 outline-none focus:border-orange-500 transition-all font-bold text-sm"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-orange-600/20 active:scale-95 transition-all uppercase tracking-widest text-sm italic">
            {authMode === 'login' ? 'Enter The War' : 'Join The Legion'}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-xs font-bold">
          {authMode === 'login' ? "Naye ho? " : "Pehle se warrior ho? "}
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-orange-500 uppercase ml-1 underline decoration-orange-900/30 underline-offset-4">
            {authMode === 'login' ? 'Sign Up' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-orange-500/30 overflow-x-hidden">
      <Head>
        <title>WAR ZONE | Elite IPL Battles</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;900&display=swap');
          .font-gaming { font-family: 'Orbitron', sans-serif; }
          .glass { background: rgba(10, 10, 15, 0.85); backdrop-filter: blur(30px); border-bottom: 1px solid rgba(255,255,255,0.06); }
          .card-pro { background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 2.5rem; }
          .neon-btn { box-shadow: 0 0 20px rgba(249, 115, 22, 0.2); }
        `}</style>
      </Head>

      <header className="max-w-md mx-auto glass p-6 sticky top-0 z-[100] flex justify-between items-center rounded-b-[2.5rem]">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-orange-500 to-red-600 p-2.5 rounded-2xl shadow-lg text-white">
            <Flame size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="font-gaming font-black italic text-2xl tracking-tighter text-orange-500 leading-none">WAR ZONE</h1>
            <p className="text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase mt-1">Live Fan Battle</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
           <span className="text-[9px] font-black text-zinc-400">ACTIVE</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-8 pb-44">
        {!userTeam ? (
          <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700">
            <div className="text-center">
              <h2 className="font-gaming text-5xl font-black italic tracking-tighter leading-none mb-4 uppercase">Join The<br/><span className="text-orange-500">Battle</span></h2>
              <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest leading-relaxed italic px-4">Choose your army. Loyalty test: Ek baar chuni to logout tak wahi rahegi!</p>
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              {TEAMS.map(team => (
                <button key={team.id} onClick={() => selectTeam(team.id)} className={`relative group overflow-hidden bg-gradient-to-r ${team.color} p-8 rounded-[3rem] transition-all active:scale-95 shadow-2xl flex items-center justify-between border-2 border-white/10`}>
                  <div className="z-10 text-left">
                    <h3 className={`font-gaming text-4xl font-black italic ${team.text}`}>{team.id}</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${team.text} opacity-60`}>{team.name}</p>
                  </div>
                  <span className="text-7xl z-10 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12">{team.emoji}</span>
                  <div className="absolute -right-8 -bottom-8 text-white/5 text-[12rem] font-black rotate-12 select-none uppercase tracking-tighter">{team.id}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex glass p-1.5 rounded-[2.5rem] shadow-inner border border-zinc-900 sticky top-[90px] z-50">
              {[
                { id: 'war', label: 'Feed', icon: <Swords size={16} /> },
                { id: 'roast', label: 'Burn', icon: <Zap size={16} /> },
                { id: 'stats', label: 'Rank', icon: <Trophy size={16} /> },
                { id: 'profile', label: 'Me', icon: <User size={16} /> }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-orange-600 text-white shadow-xl neon-btn' : 'text-zinc-600 hover:text-zinc-400'}`}>
                  {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {activeTab === 'war' && (
              <div className="space-y-6 animate-in slide-in-from-right-10 duration-300">
                {messages.length === 0 ? (
                  <div className="py-24 text-center opacity-20 italic font-black flex flex-col items-center gap-4">
                     <RefreshCw className="animate-spin text-orange-500" size={40} />
                     <span>Sledging hasn't started yet...</span>
                  </div>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.uid === user.uid ? 'items-end' : 'items-start'} gap-2`}>
                      <div className="flex items-center gap-2 px-3">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-gradient-to-r ${TEAMS.find(t=>t.id===msg.team)?.color} ${TEAMS.find(t=>t.id===msg.team)?.text}`}>{msg.team}</span>
                        <span className="text-[10px] font-bold text-zinc-600 italic">@{msg.userName}</span>
                      </div>
                      <div className={`max-w-[85%] card-pro p-5 shadow-2xl ${msg.uid === user.uid ? 'rounded-tr-none border-orange-500/20 bg-orange-950/10' : 'rounded-tl-none border-zinc-800 bg-zinc-900/40'}`}>
                        <p className="text-sm font-medium italic leading-relaxed text-zinc-200">"{msg.text}"</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'roast' && (
              <div className="card-pro p-8 shadow-2xl text-center animate-in zoom-in-95 border-red-500/20">
                <h3 className="font-gaming text-3xl font-black italic text-red-500 uppercase tracking-tighter mb-4">SLEDGE AI</h3>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-10 italic underline decoration-red-900">Burn them with Gemini Power</p>
                
                <div className="flex flex-wrap gap-2 mb-10 justify-center">
                  {TEAMS.map(team => (
                    <button key={team.id} onClick={() => setTargetTeam(team.id)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all ${targetTeam === team.id ? `bg-gradient-to-r ${team.color} ${team.text} scale-110 shadow-xl shadow-red-900/40` : 'bg-zinc-900 text-zinc-600 hover:bg-zinc-800 border border-zinc-800'}`}>{team.id}</button>
                  ))}
                </div>
                
                <button 
                  onClick={generateBurn} 
                  disabled={roastLoading} 
                  className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-[2.5rem] font-black text-xl shadow-xl shadow-red-900/50 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 italic"
                >
                  {roastLoading ? <RefreshCw className="animate-spin" /> : <>DESTROY THEM 🔥</>}
                </button>
                
                {generatedRoast && (
                  <div className="mt-10 p-8 bg-black/40 rounded-[2.5rem] border-2 border-dashed border-red-500/20 animate-in slide-in-from-bottom-5">
                    <p className="text-2xl font-black text-orange-200 italic leading-snug tracking-tighter mb-8 italic">"{generatedRoast}"</p>
                    <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(generatedRoast + " 🔥 Checkout: " + window.location.href)}`, '_blank')} className="w-full bg-green-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 flex items-center justify-center gap-2">
                      <Share2 size={16} /> WhatsApp Pe Share Karo
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="font-gaming text-2xl font-black italic text-yellow-500 uppercase tracking-tighter px-2 flex items-center gap-3">
                  <Trophy size={24} /> WORLD DOMINANCE
                </h3>
                <div className="card-pro shadow-2xl overflow-hidden border-zinc-800">
                  {TEAMS.sort((a,b) => (votes[b.id]||0) - (votes[a.id]||0)).map((t, idx) => (
                    <div key={t.id} className="p-6 border-b border-zinc-800/50 flex justify-between items-center last:border-0 hover:bg-white/5 transition-all group">
                      <div className="flex items-center gap-6">
                        <span className={`font-gaming text-4xl font-black italic ${idx === 0 ? 'text-yellow-500' : 'text-zinc-800'}`}>#{idx + 1}</span>
                        <div className={`w-16 h-16 rounded-[2rem] bg-gradient-to-br ${t.color} flex items-center justify-center text-4xl shadow-xl transition-transform group-hover:scale-110 shadow-black/40`}>{t.emoji}</div>
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

            {activeTab === 'profile' && (
              <div className="card-pro p-10 text-center animate-in slide-in-from-bottom-5 border-zinc-800 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${TEAMS.find(t=>t.id===userTeam)?.color}`}></div>
                <div className={`w-24 h-24 rounded-3xl bg-gradient-to-tr ${TEAMS.find(t=>t.id===userTeam)?.color} mx-auto mb-6 flex items-center justify-center text-5xl shadow-2xl`}>
                  {TEAMS.find(t=>t.id===userTeam)?.emoji || '👤'}
                </div>
                <h2 className="text-3xl font-black italic tracking-tighter uppercase">{user.displayName}</h2>
                <p className="text-orange-500 font-black text-[10px] uppercase tracking-[0.5em] mt-2 italic">{TEAMS.find(t=>t.id===userTeam)?.name} Warrior</p>
                
                <div className="mt-12 space-y-4">
                  <div className="bg-zinc-900/50 p-5 rounded-3xl border border-zinc-800 flex justify-between items-center">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Global Rank</span>
                    <span className="text-xl font-black text-orange-500 italic">Commander</span>
                  </div>
                  <button onClick={() => { signOut(auth); setUserTeam(null); localStorage.clear(); }} className="w-full bg-red-950/20 text-red-500 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] border border-red-500/10 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <LogOut size={16} /> Leave War Zone
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {userTeam && activeTab === 'war' && (
        <div className="fixed bottom-8 w-full max-w-md px-6 z-[110] animate-in slide-in-from-bottom-10">
          <form onSubmit={sendMsg} className="glass border border-zinc-800 rounded-full flex items-center p-2 shadow-[0_25px_60px_rgba(0,0,0,1)] pl-7">
            <input 
              type="text" 
              placeholder={`Sledge like a ${userTeam} Boss...`} 
              className="bg-transparent flex-1 outline-none text-sm font-black text-white placeholder:text-zinc-800 italic py-4"
              value={inputMsg} 
              onChange={(e) => setInputMsg(e.target.value)} 
            />
            <button type="submit" className={`bg-gradient-to-tr ${TEAMS.find(t=>t.id===userTeam).color} ${TEAMS.find(t=>t.id===userTeam).text} px-8 py-4 rounded-full font-black text-xs active:scale-90 transition-all uppercase tracking-tighter shadow-xl flex items-center gap-2`}>
              <Send size={16} /> WAR
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
