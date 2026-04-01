import React, { useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp, doc, setDoc, increment } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- BHAU, APNA FIREBASE CONFIG YAHAN DALNA ---
// Firebase Console (Settings -> Your Apps) se mil jayega
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

const TEAMS = [
  { id: 'CSK', name: 'Chennai Super Kings', color: 'bg-yellow-400', text: 'text-black', emoji: '🦁' },
  { id: 'MI', name: 'Mumbai Indians', color: 'bg-blue-600', text: 'text-white', emoji: '🏆' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: 'bg-red-600', text: 'text-white', emoji: '👑' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: 'bg-purple-700', text: 'text-white', emoji: '⚔️' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: 'bg-orange-500', text: 'text-white', emoji: '🦅' },
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [userTeam, setUserTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('war');
  const [inputMsg, setInputMsg] = useState("");
  const [votes, setVotes] = useState({});

  useEffect(() => {
    // Auth
    signInAnonymously(auth).catch(e => console.log("Auth error: ", e));
    onAuthStateChanged(auth, (u) => setUser(u));
    
    // Real-time Messages
    const q = collection(db, "messages");
    const unsub = onSnapshot(q, (snap) => {
      const m = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(m.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });

    // Real-time Votes
    const vUnsub = onSnapshot(collection(db, "votes"), (snap) => {
      const v = {};
      snap.docs.forEach(d => v[d.id] = d.data().count || 0);
      setVotes(v);
    });

    return () => { unsub(); vUnsub(); };
  }, []);

  const selectTeam = async (id) => {
    setUserTeam(id);
    try {
      await setDoc(doc(db, "votes", id), { count: increment(1) }, { merge: true });
    } catch (e) { console.error(e); }
  };

  const sendMsg = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !userTeam || !user) return;
    try {
      await addDoc(collection(db, "messages"), {
        text: inputMsg,
        team: userTeam,
        uid: user.uid.substring(0, 5),
        timestamp: serverTimestamp()
      });
      setInputMsg("");
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col items-center">
      <header className="w-full max-w-md bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-orange-600 p-1 rounded-lg">🔥</div>
          <h1 className="font-black italic text-xl tracking-tighter text-orange-500">WAR ZONE</h1>
        </div>
        <div className="text-[10px] bg-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">LIVE Sync</div>
      </header>

      <main className="w-full max-w-md flex-1 px-4 py-6 pb-24">
        {!userTeam ? (
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl">
            <h2 className="text-xl font-black mb-4">Select Your Army! 🏏</h2>
            <div className="grid grid-cols-2 gap-3">
              {TEAMS.map(t => (
                <button key={t.id} onClick={() => selectTeam(t.id)} className={`p-4 rounded-2xl ${t.color} ${t.text} font-black text-lg flex flex-col items-center gap-2 active:scale-95 transition-all`}>
                  <span className="text-2xl">{t.emoji}</span> {t.id}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
              <button onClick={() => setActiveTab('war')} className={`flex-1 py-2 rounded-xl font-black text-[10px] ${activeTab === 'war' ? 'bg-orange-600' : 'text-slate-500'}`}>WAR ROOM</button>
              <button onClick={() => setActiveTab('stats')} className={`flex-1 py-2 rounded-xl font-black text-[10px] ${activeTab === 'stats' ? 'bg-yellow-600' : 'text-slate-500'}`}>RANKING</button>
            </div>

            {activeTab === 'war' ? (
              <div className="space-y-3">
                {messages.length === 0 && <p className="text-center text-slate-600 text-sm italic py-10">BATTLE GROUND KHALI HAI... KUCH DALO!</p>}
                {messages.map(m => (
                  <div key={m.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${TEAMS.find(t=>t.id===m.team)?.color}`}></div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">@{m.uid} from {m.team}</span>
                    </div>
                    <p className="text-slate-200 text-sm italic font-medium">"{m.text}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
                {TEAMS.sort((a,b) => (votes[b.id]||0) - (votes[a.id]||0)).map((t, i) => (
                  <div key={t.id} className="p-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-700 text-xl">#{i+1}</span>
                      <span>{t.emoji}</span>
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
          <form onSubmit={sendMsg} className="bg-slate-900 border border-slate-700 rounded-full p-1.5 flex items-center pl-5 shadow-2xl">
            <input type="text" placeholder="Drop a sledge..." className="bg-transparent flex-1 outline-none text-sm font-bold" value={inputMsg} onChange={e => setInputMsg(e.target.value)} />
            <button type="submit" className={`${TEAMS.find(t=>t.id===userTeam).color} ${TEAMS.find(t=>t.id===userTeam).text} px-4 py-2 rounded-full font-black text-xs`}>GO</button>
          </form>
        </div>
      )}
    </div>
  );
}

            
