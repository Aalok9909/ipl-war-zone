
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  onSnapshot, 
  serverTimestamp,
  increment 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

/**
 * IPL WAR ZONE - FULLSTACK MOBILE-READY APP
 * Features: Live Fan Chat, AI Savage Roasts, Real-time Leaderboard
 */

// --- FIREBASE & API CONFIG ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ipl-war-2026';
const apiKey = ""; // System automatically handles this
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

const TEAMS = [
  { id: 'CSK', name: 'Chennai Super Kings', color: 'bg-yellow-400', text: 'text-black', emoji: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', color: 'bg-blue-600', text: 'text-white', emoji: '🏆' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: 'bg-red-600', text: 'text-white', emoji: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: 'bg-purple-700', text: 'text-white', emoji: '⚔️' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: 'bg-orange-500', text: 'text-white', emoji: '🦅' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [userTeam, setUserTeam] = useState(localStorage.getItem('ipl_team') || null);
  const [activeTab, setActiveTab] = useState('war'); 
  const [messages, setMessages] = useState([]);
  const [votes, setVotes] = useState({});
  const [inputMsg, setInputMsg] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);
  const [generatedRoast, setGeneratedRoast] = useState("");
  const [targetTeam, setTargetTeam] = useState("RCB");

  // 1. Authentication (Rule 3)
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { if(u) setUser(u); });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Sync (Rule 1 & 2)
  useEffect(() => {
    if (!user) return;

    // Messages Sync
    const msgCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const unsubscribeMsgs = onSnapshot(msgCol, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 50));
    });

    // Votes Sync
    const voteCol = collection(db, 'artifacts', appId, 'public', 'data', 'votes');
    const unsubscribeVotes = onSnapshot(voteCol, (snap) => {
      const v = {};
      snap.docs.forEach(d => v[d.id] = d.data().count || 0);
      setVotes(v);
    });

    return () => {
      unsubscribeMsgs();
      unsubscribeVotes();
    };
  }, [user]);

  // 3. Handlers
  const selectTeam = async (id) => {
    setUserTeam(id);
    localStorage.setItem('ipl_team', id);
    const voteDoc = doc(db, 'artifacts', appId, 'public', 'data', 'votes', id);
    await setDoc(voteDoc, { count: increment(1) }, { merge: true });
  };

  const sendSledge = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userTeam || !user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), {
      uid: user.uid,
      team: userTeam,
      text: inputMsg,
      timestamp: serverTimestamp()
    });
    setInputMsg("");
  };

  const getSavageRoast = async () => {
    if (roastLoading) return;
    setRoastLoading(true);
    const teamName = TEAMS.find(t => t.id === targetTeam).name;
    const prompt = `Write a savage, funny 2-line roast for ${teamName} fans in Hinglish. Use current memes. Be sharp. Only return the text.`;
    
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      setGeneratedRoast(data.candidates?.[0]?.content?.parts?.[0]?.text || "Bhai network hargaya!");
    } catch {
      setGeneratedRoast("Error! Par teri team phir bhi hargi! 😂");
    } finally {
      setRoastLoading(false);
    }
  };

  // UI Components
  const Icon = ({ type }) => {
    if (type === 'fire') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6.5 1.5 2 2 4.5 2 7a6 6 0 1 1-12 0c0-1.4.2-2.5.5-3.5 1.25 1 2 2.5 2 4Z"/></svg>;
    if (type === 'zap') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-md bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-orange-600 p-1.5 rounded-lg animate-pulse text-white"><Icon type="fire" /></div>
          <h1 className="font-black text-xl italic tracking-tighter text-orange-500">WAR ZONE</h1>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div> Live
        </div>
      </header>

      <main className="w-full max-w-md flex-1 px-4 py-6 pb-24">
        {!userTeam ? (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-4">Select Your Side 🏏</h2>
            <div className="grid grid-cols-2 gap-3">
              {TEAMS.map(t => (
                <button key={t.id} onClick={() => selectTeam(t.id)} className={`p-5 rounded-2xl ${t.color} ${t.text} font-black text-xl flex flex-col items-center gap-2 active:scale-95 transition-all`}>
                  <span className="text-3xl">{t.emoji}</span> {t.id}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs */}
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
              <button onClick={() => setActiveTab('war')} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${activeTab === 'war' ? 'bg-orange-600' : 'text-slate-500'}`}>WAR ROOM</button>
              <button onClick={() => setActiveTab('roast')} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${activeTab === 'roast' ? 'bg-red-600' : 'text-slate-500'}`}>ROAST LAB</button>
              <button onClick={() => setActiveTab('stats')} className={`flex-1 py-3 rounded-xl font-black text-[10px] ${activeTab === 'stats' ? 'bg-yellow-600' : 'text-slate-500'}`}>RANKING</button>
            </div>

            {activeTab === 'war' && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                {messages.map(m => (
                  <div key={m.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${TEAMS.find(t=>t.id===m.team)?.color}`}></div>
                    <div className="text-[10px] font-black text-slate-500 mb-1 flex justify-between">
                      <span>@{m.uid?.slice(0,5)} from {m.team}</span>
                    </div>
                    <p className="text-sm italic font-medium">"{m.text}"</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'roast' && (
              <div className="animate-in slide-in-from-left-4 space-y-6">
                <div className="bg-gradient-to-br from-red-900/40 to-black p-6 rounded-3xl border border-red-500/30">
                  <h3 className="font-black text-red-500 flex items-center gap-2 mb-4"><Icon type="zap" /> SLEDGE GEN</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {TEAMS.map(t => (
                      <button key={t.id} onClick={() => setTargetTeam(t.id)} className={`px-4 py-2 rounded-xl text-xs font-black ${targetTeam === t.id ? t.color + ' ' + t.text : 'bg-slate-800 text-slate-500'}`}>{t.id}</button>
                    ))}
                  </div>
                  <button onClick={getSavageRoast} disabled={roastLoading} className="w-full bg-red-600 py-4 rounded-2xl font-black text-lg active:scale-95 disabled:opacity-50">
                    {roastLoading ? "Generating..." : "GENERATE BURN 🔥"}
                  </button>
                  {generatedRoast && (
                    <div className="mt-4 p-4 bg-black/50 border border-red-500/50 rounded-xl">
                      <p className="text-orange-200 font-bold italic">"{generatedRoast}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden animate-in fade-in">
                {TEAMS.sort((a,b) => (votes[b.id]||0) - (votes[a.id]||0)).map((t, i) => (
                  <div key={t.id} className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-600 text-xl">#{i+1}</span>
                      <div className={`w-8 h-8 rounded-full ${t.color} flex items-center justify-center`}>{t.emoji}</div>
                      <span className="font-black text-sm">{t.name}</span>
                    </div>
                    <span className="text-xs font-black text-slate-400">{votes[t.id] || 0} Fans</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {userTeam && activeTab === 'war' && (
        <div className="fixed bottom-6 w-full max-w-md px-4">
          <form onSubmit={sendSledge} className="bg-slate-900 border border-slate-700 rounded-full p-1.5 flex items-center pl-5 shadow-2xl">
            <input type="text" placeholder="Drop a sledge..." className="bg-transparent flex-1 outline-none text-sm" value={inputMsg} onChange={e => setInputMsg(e.target.value)} />
            <button type="submit" className={`${TEAMS.find(t=>t.id===userTeam).color} ${TEAMS.find(t=>t.id===userTeam).text} px-4 py-2 rounded-full font-black text-xs`}>GO</button>
          </form>
        </div>
      )}
    </div>
  );
}

