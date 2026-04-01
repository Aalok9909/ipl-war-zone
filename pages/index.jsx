import React, { useState, useEffect, useRef } from 'react';
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
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- FIREBASE CONFIG (Environment will auto-fill or use your keys) ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);
const apiKey = ""; // System handled
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

const TEAMS = [
  { id: 'CSK', name: 'Chennai Super Kings', color: 'from-yellow-400 to-yellow-600', text: 'text-black', border: 'border-yellow-500', glow: 'shadow-yellow-500/40', emoji: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', color: 'from-blue-600 to-blue-800', text: 'text-white', border: 'border-blue-500', glow: 'shadow-blue-500/40', emoji: '🏆' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: 'from-red-600 to-red-800', text: 'text-white', border: 'border-red-600', glow: 'shadow-red-500/40', emoji: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: 'from-purple-700 to-indigo-900', text: 'text-white', border: 'border-purple-500', glow: 'shadow-purple-500/40', emoji: '⚔️' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: 'from-orange-500 to-orange-700', text: 'text-white', border: 'border-orange-500', glow: 'shadow-orange-500/40', emoji: '🦅' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('war');
  const [userTeam, setUserTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [votes, setVotes] = useState({});
  const [inputMsg, setInputMsg] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);
  const [generatedRoast, setGeneratedRoast] = useState("");
  const [targetTeam, setTargetTeam] = useState("RCB");

  // --- PERSISTENCE & DATA SYNC ---
  useEffect(() => {
    // Silent Login (No UI interruption)
    signInAnonymously(auth).catch(e => console.error("Auth failed", e));
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        const savedTeam = localStorage.getItem(`ipl_team_${u.uid}`);
        if(savedTeam) setUserTeam(savedTeam);
      }
    });

    // Real-time Messages (Limit to 50)
    const q = collection(db, "artifacts", "ipl-war", "public", "data", "messages");
    const unsubscribeMsgs = onSnapshot(q, (snap) => {
      const m = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(m.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 50));
    });

    // Real-time Popularity Stats
    const unsubscribeVotes = onSnapshot(collection(db, "artifacts", "ipl-war", "public", "data", "votes"), (snap) => {
      const v = {};
      snap.docs.forEach(d => v[d.id] = d.data().count || 0);
      setVotes(v);
    });

    return () => { unsubscribeMsgs(); unsubscribeVotes(); };
  }, []);

  // --- ACTIONS ---
  const handleSelectTeam = async (id) => {
    if (!user) return;
    setUserTeam(id);
    localStorage.setItem(`ipl_team_${user.uid}`, id);
    const voteDoc = doc(db, "artifacts", "ipl-war", "public", "data", "votes", id);
    await setDoc(voteDoc, { count: increment(1) }, { merge: true });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userTeam || !user) return;
    await addDoc(collection(db, "artifacts", "ipl-war", "public", "data", "messages"), {
      text: inputMsg,
      team: userTeam,
      uid: user.uid.substring(0, 5),
      timestamp: serverTimestamp()
    });
    setInputMsg("");
  };

  const generateAIRoast = async () => {
    if (roastLoading) return;
    setRoastLoading(true);
    setGeneratedRoast("");
    const teamName = TEAMS.find(t => t.id === targetTeam).name;
    const prompt = `Write a savage 2-line roast for ${teamName} fans in Hinglish. Use latest IPL 2026 memes. Output only the roast.`;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      setGeneratedRoast(data.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch {
      setGeneratedRoast("AI hargaya par teri team phir bhi hargi! 😂");
    } finally {
      setRoastLoading(false);
    }
  };

  const shareRoast = () => {
    const text = `🔥 Savage Roast check kar: "${generatedRoast}" \n\nJoin IPL War Zone: ${window.location.href} 🏏`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // --- ICONS ---
  const WarIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 22l5-5M3 21l3-3"/></svg>;
  const RoastIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.5 3.5 6.5 1.5 2 2 4.5 2 7a6 6 0 1 1-12 0c0-1.4.2-2.5.5-3.5 1.25 1 2 2.5 2 4Z"/></svg>;
  const LeaderboardIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 22V18M14 22V18M18 4H6v7a6 6 0 0 0 12 0V4Z"/></svg>;
  const ProfileIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>;

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center selection:bg-orange-500/30">
      
      {/* Dynamic Header */}
      <header className="w-full max-w-md bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800 p-5 sticky top-0 z-[100] flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-orange-500 to-red-600 p-2 rounded-xl shadow-lg shadow-orange-600/30 animate-pulse">
            <WarIcon />
          </div>
          <div>
            <h1 className="font-black italic text-xl tracking-tighter text-orange-500 leading-none">WAR ZONE</h1>
            <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">IPL 2026 Edition</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 bg-zinc-800 px-2 py-1 rounded-full border border-zinc-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-black tracking-widest text-zinc-400">SYNCED</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-md flex-1 px-5 py-8 pb-32">
        
        {/* Step 1: High-Impact Team Selection */}
        {!userTeam && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center">
              <h2 className="text-4xl font-black italic tracking-tighter leading-tight">JOIN THE<br/><span className="text-orange-500">ULTIMATE BATTLE</span></h2>
              <p className="text-zinc-500 text-sm mt-3 font-medium">Select your army to start roasting rival fans.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {TEAMS.map(team => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team.id)}
                  className={`relative group overflow-hidden bg-gradient-to-r ${team.color} p-6 rounded-3xl transition-all active:scale-95 shadow-2xl ${team.glow} flex items-center justify-between border-2 border-white/10`}
                >
                  <div className="relative z-10">
                    <h3 className={`text-2xl font-black italic ${team.text}`}>{team.id}</h3>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${team.text} opacity-70`}>{team.name}</p>
                  </div>
                  <span className="text-5xl group-hover:scale-125 transition-transform duration-500">{team.emoji}</span>
                  {/* Decorative Background Element */}
                  <div className="absolute -right-4 -bottom-4 text-white/10 text-9xl font-black rotate-12">{team.id}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Main Features (After Selection) */}
        {userTeam && (
          <div className="space-y-8">
            
            {/* Tab: War Room (Chat) */}
            {activeTab === 'war' && (
              <div className="space-y-5 animate-in slide-in-from-right-10 duration-300">
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Current Status</span>
                      <span className="text-sm font-bold text-orange-500 italic">Heavy Roast in Progress 🔥</span>
                   </div>
                   <div className="flex -space-x-2">
                      {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-xs">👤</div>)}
                   </div>
                </div>

                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="py-20 text-center opacity-20 italic">No sledges yet. Start the war!</div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className="group">
                        <div className={`flex flex-col ${msg.uid === user?.uid?.substring(0,5) ? 'items-end' : 'items-start'} gap-1.5`}>
                          <div className="flex items-center gap-2">
                             {msg.uid !== user?.uid?.substring(0,5) && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter bg-gradient-to-r ${TEAMS.find(t=>t.id===msg.team)?.color} ${TEAMS.find(t=>t.id===msg.team)?.text}`}>{msg.team}</span>}
                             <span className="text-[10px] font-bold text-zinc-600 tracking-tighter">@{msg.uid}</span>
                             {msg.uid === user?.uid?.substring(0,5) && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter bg-gradient-to-r ${TEAMS.find(t=>t.id===msg.team)?.color} ${TEAMS.find(t=>t.id===msg.team)?.text}`}>{msg.team}</span>}
                          </div>
                          <div className={`max-w-[85%] p-4 rounded-2xl border ${msg.uid === user?.uid?.substring(0,5) ? 'bg-zinc-800 border-zinc-700 rounded-tr-none' : 'bg-zinc-900 border-zinc-800 rounded-tl-none shadow-xl'}`}>
                            <p className="text-sm font-medium leading-relaxed italic">"{msg.text}"</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab: Roast Lab (AI) */}
            {activeTab === 'roast' && (
              <div className="space-y-6 animate-in slide-in-from-left-10 duration-300">
                <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 relative overflow-hidden shadow-2xl">
                   <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><RoastIcon /></div>
                   <h3 className="text-3xl font-black italic text-red-500 uppercase tracking-tighter mb-2">Sledge AI</h3>
                   <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-8">Generated by Gemini Ultra 2.5</p>

                   <div className="space-y-8">
                      <div>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">Victim Team</p>
                        <div className="flex flex-wrap gap-2">
                          {TEAMS.map(team => (
                            <button
                              key={team.id}
                              onClick={() => setTargetTeam(team.id)}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${targetTeam === team.id ? `bg-gradient-to-r ${team.color} ${team.text} scale-110 shadow-lg` : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                            >
                              {team.id}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={generateAIRoast}
                        disabled={roastLoading}
                        className="w-full bg-red-600 hover:bg-red-500 py-5 rounded-2xl font-black text-xl shadow-xl shadow-red-900/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {roastLoading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <>DESTROY THEM 🔥</>}
                      </button>

                      {generatedRoast && (
                        <div className="bg-black/50 border-2 border-dashed border-red-500/30 p-6 rounded-3xl animate-in zoom-in-95">
                          <p className="text-2xl font-black text-orange-200 italic leading-snug tracking-tighter">"{generatedRoast}"</p>
                          <button onClick={shareRoast} className="mt-8 w-full bg-green-600 hover:bg-green-500 py-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 uppercase tracking-widest">
                            Share on WhatsApp 🚀
                          </button>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            )}

            {/* Tab: Leaderboard */}
            {activeTab === 'stats' && (
              <div className="animate-in fade-in duration-500 space-y-6">
                <h3 className="text-2xl font-black italic text-yellow-500 uppercase tracking-tighter flex items-center gap-2">
                  <LeaderboardIcon /> GLOBAL DOMINANCE
                </h3>
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
                   {TEAMS.sort((a,b) => (votes[b.id]||0) - (votes[a.id]||0)).map((t, idx) => (
                     <div key={t.id} className="p-6 border-b border-zinc-800 flex items-center justify-between group transition-all hover:bg-zinc-800/50">
                        <div className="flex items-center gap-5">
                           <span className={`text-3xl font-black italic ${idx === 0 ? 'text-yellow-500' : 'text-zinc-800'}`}>#{idx + 1}</span>
                           <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center text-3xl shadow-xl shadow-black/20 group-hover:scale-110 transition-transform`}>{t.emoji}</div>
                           <div>
                              <p className="font-black text-base italic">{t.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="h-2 w-24 bg-zinc-800 rounded-full overflow-hidden">
                                   <div className={`h-full bg-gradient-to-r ${t.color}`} style={{ width: `${Math.min(100, (votes[t.id]/500)*100)}%` }}></div>
                                </div>
                                <span className="text-[10px] font-black text-zinc-500 italic uppercase">{votes[t.id] || 0} Warriors</span>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            )}

            {/* Tab: Profile */}
            {activeTab === 'profile' && (
              <div className="animate-in slide-in-from-bottom-10 space-y-6">
                <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-[3rem] text-center shadow-2xl relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${TEAMS.find(t=>t.id===userTeam)?.color}`}></div>
                  <div className={`w-32 h-32 rounded-3xl bg-gradient-to-tr ${TEAMS.find(t=>t.id===userTeam)?.color} mx-auto mb-6 flex items-center justify-center text-6xl shadow-2xl`}>
                    {TEAMS.find(t=>t.id===userTeam)?.emoji}
                  </div>
                  <h2 className="text-3xl font-black italic tracking-tighter">WARRIOR @{user?.uid?.substring(0,5)}</h2>
                  <p className="text-orange-500 font-black text-xs uppercase tracking-[0.3em] mt-2">Certified {TEAMS.find(t=>t.id===userTeam)?.name} Fan</p>
                  
                  <div className="mt-10 grid grid-cols-2 gap-4">
                     <div className="bg-zinc-800/50 p-5 rounded-3xl border border-zinc-700">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Rank</p>
                        <p className="text-xl font-black italic text-zinc-300">Commander</p>
                     </div>
                     <div className="bg-zinc-800/50 p-5 rounded-3xl border border-zinc-700">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Roasts</p>
                        <p className="text-xl font-black italic text-zinc-300">{messages.filter(m=>m.uid === user?.uid?.substring(0,5)).length}</p>
                     </div>
                  </div>

                  <button 
                    onClick={() => { localStorage.clear(); window.location.reload(); }}
                    className="mt-12 text-[10px] font-black text-zinc-700 hover:text-red-500 transition-colors uppercase tracking-[0.3em]"
                  >
                    Resign from Commission
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* Floating Chat (Visible only in War Tab) */}
      {userTeam && activeTab === 'war' && (
        <div className="fixed bottom-24 w-full max-w-md px-6 z-[100] animate-in slide-in-from-bottom-5">
           <form onSubmit={sendMessage} className="bg-zinc-900/80 backdrop-blur-2xl border border-zinc-700 rounded-full flex items-center p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pl-6">
             <input 
               type="text" 
               placeholder={`Sledge like a ${userTeam} boss...`}
               className="bg-transparent flex-1 outline-none text-sm font-bold text-white placeholder:text-zinc-600"
               value={inputMsg}
               onChange={(e) => setInputMsg(e.target.value)}
             />
             <button 
               type="submit"
               className={`bg-gradient-to-tr ${TEAMS.find(t=>t.id===userTeam).color} ${TEAMS.find(t=>t.id===userTeam).text} px-6 py-3 rounded-full font-black text-xs active:scale-90 transition-all uppercase tracking-tighter shadow-lg`}
             >
               SEND
             </button>
           </form>
        </div>
      )}

      {/* Futuristic Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md bg-zinc-900/90 backdrop-blur-3xl border-t border-zinc-800 flex justify-around p-5 z-[200] rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {[
          { id: 'war', icon: <WarIcon />, label: 'WAR' },
          { id: 'roast', icon: <RoastIcon />, label: 'ROAST' },
          { id: 'stats', icon: <LeaderboardIcon />, label: 'RANK' },
          { id: 'profile', icon: <ProfileIcon />, label: 'ME' }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === item.id ? 'text-orange-500 scale-125 -translate-y-2' : 'text-zinc-600 hover:text-zinc-400'}`}
          >
            {item.icon}
            <span className={`text-[8px] font-black uppercase tracking-widest ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`}>{item.label}</span>
            {activeTab === item.id && <div className="w-1 h-1 bg-orange-500 rounded-full mt-0.5"></div>}
          </button>
        ))}
      </nav>

    </div>
  );
}

