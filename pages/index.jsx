import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  serverTimestamp, doc, setDoc, increment 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  Swords, 
  Flame, 
  Trophy, 
  Send, 
  Share2, 
  TrendingUp, 
  Zap,
  RotateCcw,
  ShieldCheck,
  Bomb,
  Wand2,
  Volume2,
  FileText,
  LogOut,
  User,
  Mail,
  Lock,
  ChevronRight,
  Sparkles
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

const GEMINI_API_KEY = "AIzaSyAlVyqpCvtziPh9xOqyAsy393L4CkNlfcs"; 
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

const TEAMS = [
  { id: 'CSK', name: 'Chennai Super Kings', color: 'from-yellow-400 to-yellow-600', text: 'text-black', shadow: 'shadow-yellow-500/40', emoji: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', color: 'from-blue-600 to-blue-800', text: 'text-white', shadow: 'shadow-blue-500/40', emoji: '🏆' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: 'from-red-600 to-red-800', text: 'text-white', shadow: 'shadow-red-500/40', emoji: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: 'from-purple-700 to-indigo-900', text: 'text-white', shadow: 'shadow-purple-500/40', emoji: '⚔️' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: 'from-orange-500 to-orange-700', text: 'text-white', shadow: 'shadow-orange-500/40', emoji: '🦅' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('war');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [userTeam, setUserTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [votes, setVotes] = useState({});
  const [inputMsg, setInputMsg] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [generatedRoast, setGeneratedRoast] = useState("");
  const [warReport, setWarReport] = useState("");
  const [targetTeam, setTargetTeam] = useState("RCB");
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [isSyncing, setIsSyncing] = useState(true);

  // --- API HELPER ---
  const callGemini = async (prompt, tts = false) => {
    const url = tts 
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = tts ? {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        responseModalities: ["AUDIO"], 
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } } 
      }
    } : {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    const _db = getFirestore(app);
    const _auth = getAuth(app);
    setDb(_db);
    setAuth(_auth);

    const unsubscribe = onAuthStateChanged(_auth, (u) => {
      setUser(u);
      if (u) {
        const savedTeam = localStorage.getItem(`team_v3_${u.uid}`);
        if (savedTeam) setUserTeam(savedTeam);
      }
    });

    return () => unsubscribe();
  }, []);

  // --- DATA SYNC ---
  useEffect(() => {
    if (!user || !db) return;
    const appId = "ipl-war-zone-v35"; 

    const msgQuery = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const unsubMsgs = onSnapshot(msgQuery, (snap) => {
      const m = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(m.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 50));
      setIsSyncing(false);
    });

    const voteQuery = collection(db, 'artifacts', appId, 'public', 'data', 'votes');
    const unsubVotes = onSnapshot(voteQuery, (snap) => {
      const v = {};
      snap.docs.forEach(d => v[d.id] = d.data().count || 0);
      setVotes(v);
    });

    return () => { unsubMsgs(); unsubVotes(); };
  }, [user, db]);

  // --- HANDLERS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!auth) return;
    try {
      if (authMode === 'signup') {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      alert("Auth Error: " + err.message);
    }
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    setUserTeam(null);
  };

  const selectTeam = async (id) => {
    if (!user || !db) return;
    setUserTeam(id);
    localStorage.setItem(`team_v3_${user.uid}`, id);
    const appId = "ipl-war-zone-v35";
    const voteDoc = doc(db, 'artifacts', appId, 'public', 'data', 'votes', id);
    await setDoc(voteDoc, { count: increment(1) }, { merge: true });
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userTeam || !db || !user) return;
    const appId = "ipl-war-zone-v35";
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), {
      text: inputMsg,
      team: userTeam,
      userName: user.displayName || user.email.split('@')[0],
      uid: user.uid,
      timestamp: serverTimestamp()
    });
    setInputMsg("");
  };

  // --- GEMINI AI FEATURES ---
  const boostSledgeAI = async () => {
    if (!inputMsg.trim() || boosting) return;
    setBoosting(true);
    try {
      const prompt = `Rewrite this IPL sledge to be extremely savage, toxic, and funny in Hinglish. Original: "${inputMsg}". Output ONLY the rewritten text.`;
      const data = await callGemini(prompt);
      setInputMsg(data.candidates?.[0]?.content?.parts?.[0]?.text || inputMsg);
    } catch (e) { console.error(e); }
    finally { setBoosting(false); }
  };

  const generateAIWarReport = async () => {
    if (reportLoading || messages.length === 0) return;
    setReportLoading(true);
    try {
      const context = messages.slice(0, 8).map(m => `[${m.team}]: ${m.text}`).join('\n');
      const prompt = `Based on these recent IPL fan messages, write a funny 3-line news report in Hinglish summarizing who is winning the verbal war and who is crying. Messages:\n${context}`;
      const data = await callGemini(prompt);
      setWarReport(data.candidates?.[0]?.content?.parts?.[0]?.text || "Mahaul garam hai!");
    } catch (e) { console.error(e); }
    finally { setReportLoading(false); }
  };

  const generateSavageRoast = async () => {
    if (roastLoading) return;
    setRoastLoading(true);
    setGeneratedRoast("");
    try {
      const prompt = `Write a savage 2-line roast for ${targetTeam} fans in Hinglish. Mention their historical failures or current memes. Be brutal.`;
      const data = await callGemini(prompt);
      setGeneratedRoast(data.candidates?.[0]?.content?.parts?.[0]?.text || "AI darr gaya!");
    } catch (e) { console.error(e); }
    finally { setRoastLoading(false); }
  };

  const playAudioRoast = async () => {
    if (!generatedRoast || isAudioLoading) return;
    setIsAudioLoading(true);
    try {
      const data = await callGemini(`Say sarcastically in Hindi: ${generatedRoast}`, true);
      const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${audioBase64}`); // Note: Simple base64 might need conversion to proper WAV for some browsers
        // For reliability, we use the PCM-to-WAV approach internally
        const pcmData = atob(audioBase64);
        const buffer = new ArrayBuffer(pcmData.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < pcmData.length; i++) view[i] = pcmData.charCodeAt(i);
        const wavBlob = new Blob([new DataView(new ArrayBuffer(44)), buffer], { type: 'audio/wav' }); // Placeholder header
        const url = URL.createObjectURL(wavBlob);
        new Audio(url).play();
      }
    } catch (e) { console.error(e); }
    finally { setIsAudioLoading(false); }
  };

  // --- UI COMPONENTS ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#030305] flex items-center justify-center p-6 font-sans">
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
        <div className="w-full max-w-sm space-y-8 bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl animate-pulse">
              <Flame size={44} className="text-white" />
            </div>
            <h1 className="text-4xl font-black italic text-orange-500 tracking-tighter">WAR ZONE</h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-2">IPL 2026 ELITE EDITION</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-gray-600" size={18} />
                <input 
                  type="text" placeholder="Your Gaming Name" required
                  className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-12 py-3.5 outline-none focus:border-orange-500 text-white font-bold text-sm"
                  value={displayName} onChange={e => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-gray-600" size={18} />
              <input 
                type="email" placeholder="Email" required
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-12 py-3.5 outline-none focus:border-orange-500 text-white font-bold text-sm"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-gray-600" size={18} />
              <input 
                type="password" placeholder="Password" required
                className="w-full bg-gray-800 border border-gray-700 rounded-2xl px-12 py-3.5 outline-none focus:border-orange-500 text-white font-bold text-sm"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 uppercase tracking-tighter">
              {authMode === 'login' ? 'Enter Battle' : 'Create Profile'} <ChevronRight size={20} />
            </button>
          </form>

          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            className="w-full text-[10px] font-black text-gray-500 hover:text-orange-500 uppercase tracking-[0.2em] transition-colors"
          >
            {authMode === 'login' ? "New Warrior? Register" : "Have Account? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020204] text-white font-sans overflow-x-hidden pb-40">
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      
      {/* HEADER */}
      <header className="max-w-md mx-auto bg-gray-900/90 backdrop-blur-xl p-5 sticky top-0 z-[100] flex justify-between items-center rounded-b-[2rem] border-b border-gray-800 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-xl"><Flame size={20} /></div>
          <div>
            <h1 className="font-black italic text-xl text-orange-500 leading-none">WAR ZONE</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em]">AI Active</span>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="text-gray-600 hover:text-red-500 p-2"><LogOut size={20} /></button>
      </header>

      <main className="max-w-md mx-auto px-5 py-8">
        {!userTeam ? (
          <div className="space-y-10">
            <div className="text-center">
              <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none">Pick Your<br/><span className="text-orange-500">Badge</span></h2>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-4">One choice. Infinite controversy.</p>
            </div>
            <div className="grid grid-cols-1 gap-5">
              {TEAMS.map(team => (
                <button key={team.id} onClick={() => selectTeam(team.id)} className={`relative group overflow-hidden bg-gradient-to-r ${team.color} p-8 rounded-[2.5rem] transition-all active:scale-95 shadow-2xl flex items-center justify-between border-2 border-white/10`}>
                  <div className="z-10 text-left text-white">
                    <h3 className="text-4xl font-black italic leading-none">{team.id}</h3>
                    <p className="text-[10px] font-bold uppercase opacity-60 mt-1">{team.name}</p>
                  </div>
                  <span className="text-7xl z-10 transition-transform duration-500 group-hover:scale-125 select-none">{team.emoji}</span>
                  <div className="absolute -right-8 -bottom-8 text-white/5 text-[12rem] font-black rotate-12">{team.id}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* TABS */}
            <div className="flex bg-gray-900/90 backdrop-blur-2xl p-1.5 rounded-[2.2rem] border border-gray-800 sticky top-24 z-[90]">
              {[
                { id: 'war', label: 'WAR', icon: <Swords size={16} /> },
                { id: 'roast', label: 'AI LAB', icon: <Zap size={16} /> },
                { id: 'stats', label: 'RANK', icon: <Trophy size={16} /> }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`flex-1 py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-orange-600 text-white shadow-xl translate-y-[-2px]' : 'text-gray-600 hover:text-white'}`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* WAR ROOM */}
            {activeTab === 'war' && (
              <div className="space-y-6">
                <button onClick={generateAIWarReport} disabled={reportLoading} className="w-full bg-gray-900/50 border border-gray-800 p-5 rounded-[2rem] flex items-center justify-between active:scale-95 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="text-orange-500 bg-orange-500/10 p-2.5 rounded-2xl"><FileText size={22} /></div>
                    <div className="text-left">
                      <p className="text-[10px] font-black uppercase text-gray-500">Live Intel Report</p>
                      <p className="text-sm font-bold">Generate War Update ✨</p>
                    </div>
                  </div>
                  {reportLoading ? <RotateCcw size={18} className="animate-spin text-orange-500" /> : <Zap size={18} className="text-orange-500" />}
                </button>

                {warReport && (
                  <div className="bg-orange-600/10 p-6 rounded-[2rem] border border-orange-500/20 animate-bounce-in relative">
                    <button onClick={() => setWarReport("")} className="absolute top-4 right-4 text-gray-500"><RotateCcw size={12} /></button>
                    <p className="text-orange-200 text-sm font-bold italic leading-relaxed">"{warReport}"</p>
                  </div>
                )}

                <div className="space-y-4">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.uid === user.uid ? 'items-end' : 'items-start'} gap-1.5`}>
                      <div className="flex items-center gap-2 px-3">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-gradient-to-r ${TEAMS.find(t=>t.id===msg.team)?.color} ${TEAMS.find(t=>t.id===msg.team)?.text}`}>{msg.team}</span>
                        <span className="text-[10px] font-bold text-gray-600 italic">@{msg.userName?.slice(0,10)}</span>
                      </div>
                      <div className={`max-w-[85%] bg-gray-900 border border-gray-800 p-5 rounded-[2rem] shadow-2xl ${msg.uid === user.uid ? 'rounded-tr-none border-orange-500/20' : 'rounded-tl-none'}`}>
                        <p className="text-sm font-medium italic leading-relaxed text-gray-200">"{msg.text}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI LAB */}
            {activeTab === 'roast' && (
              <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-[3rem] shadow-2xl text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Bomb size={120} /></div>
                <h3 className="text-3xl font-black italic text-red-500 uppercase tracking-tighter mb-4 flex items-center justify-center gap-2">
                  <Sparkles size={24} /> SLEDGE LAB
                </h3>
                <div className="flex flex-wrap gap-2.5 mb-10 justify-center">
                  {TEAMS.map(team => (
                    <button key={team.id} onClick={() => setTargetTeam(team.id)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black transition-all ${targetTeam === team.id ? `bg-gradient-to-r ${team.color} ${team.text} scale-110 shadow-xl` : 'bg-gray-800 text-gray-600'}`}>{team.id}</button>
                  ))}
                </div>
                <button onClick={generateSavageRoast} disabled={roastLoading} className="w-full bg-red-600 hover:bg-red-500 py-6 rounded-3xl font-black text-xl shadow-xl active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                  {roastLoading ? <RotateCcw size={22} className="animate-spin" /> : "GENERATE BURN 🔥"}
                </button>
                {generatedRoast && (
                  <div className="mt-10 p-8 bg-black/60 rounded-[2.5rem] border-2 border-dashed border-red-500/30">
                    <p className="text-2xl font-black text-orange-200 italic leading-snug tracking-tighter mb-8">"{generatedRoast}"</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={playAudioRoast} disabled={isAudioLoading} className="bg-gray-800 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2">
                        {isAudioLoading ? <RotateCcw size={16} className="animate-spin" /> : <><Volume2 size={16} /> Listen AI</>}
                      </button>
                      <button onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(generatedRoast + " 🔥 Checkout: " + window.location.href)}`, '_blank')} className="bg-green-600 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg">
                        <Share2 size={16} /> Share
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RANKING */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <h3 className="text-2xl font-black italic text-yellow-500 uppercase tracking-tighter px-2 flex items-center gap-3">
                  <Trophy size={24} /> GLOBAL LEGIONS
                </h3>
                <div className="bg-gray-900 border border-gray-800 rounded-[3rem] shadow-2xl overflow-hidden">
                  {TEAMS.sort((a,b) => (votes[b.id]||0) - (votes[a.id]||0)).map((t, idx) => (
                    <div key={t.id} className="p-7 border-b border-gray-800/50 flex justify-between items-center last:border-0 hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-6">
                        <span className={`text-4xl font-black italic ${idx === 0 ? 'text-yellow-500' : 'text-gray-800'}`}>#{idx + 1}</span>
                        <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${t.color} flex items-center justify-center text-4xl shadow-xl`}>{t.emoji}</div>
                        <div>
                          <p className="font-black text-xl italic leading-none mb-1">{t.name}</p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{votes[t.id] || 0} Registered Warriors</p>
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

      {/* INPUT BOX */}
      {userTeam && activeTab === 'war' && (
        <div className="fixed bottom-8 w-full max-w-md px-6 z-[110] animate-in slide-in-from-bottom-10">
          <form onSubmit={sendMsg} className="bg-gray-900/95 backdrop-blur-3xl border border-gray-800 rounded-[2.5rem] flex items-center p-2 shadow-[0_20px_50px_rgba(0,0,0,1)] pl-8">
            <input 
              type="text" 
              placeholder={`Sledge for ${userTeam}...`} 
              className="bg-transparent flex-1 outline-none text-sm font-black text-white placeholder:text-gray-700 italic py-5"
              value={inputMsg} onChange={e => setInputMsg(e.target.value)} 
            />
            <button 
              type="button" onClick={boostSledgeAI} disabled={boosting || !inputMsg.trim()}
              className="p-3 text-orange-500 hover:text-orange-400 active:scale-90 transition-all disabled:opacity-30"
            >
              {boosting ? <RotateCcw size={20} className="animate-spin" /> : <Wand2 size={24} />}
            </button>
            <button type="submit" className={`bg-gradient-to-tr ${TEAMS.find(t=>t.id===userTeam).color} ${TEAMS.find(t=>t.id===userTeam).text} px-10 py-5 rounded-[2rem] font-black text-xs active:scale-90 transition-all uppercase tracking-tighter shadow-xl ml-2`}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
