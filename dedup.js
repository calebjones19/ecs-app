// Dedup clients and employees in Firestore
// Usage: node dedup.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyB_QvTPS5u5RxGEvzOaKwE_yDnaH67i26w",
  authDomain: "essence-cleaning-a2ad5.firebaseapp.com",
  projectId: "essence-cleaning-a2ad5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function dedup(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const byName = {};
  docs.forEach(d => {
    const key = (d.name || '').trim().toLowerCase();
    if (!key) return;
    if (!byName[key]) byName[key] = [];
    byName[key].push(d);
  });
  let deleted = 0;
  for (const [, group] of Object.entries(byName)) {
    if (group.length < 2) continue;
    group.sort((a, b) => {
      const aT = a.createdAt?.seconds ?? Infinity;
      const bT = b.createdAt?.seconds ?? Infinity;
      return aT !== bT ? aT - bT : (a.id < b.id ? -1 : 1);
    });
    for (const d of group.slice(1)) {
      await deleteDoc(doc(db, collectionName, d.id));
      console.log(`  Deleted ${collectionName}/${d.id} ("${d.name}")`);
      deleted++;
    }
  }
  console.log(`${collectionName}: removed ${deleted} duplicates (${Object.keys(byName).length} unique remain)`);
}

(async () => {
  try {
    console.log('Deduplicating clients...'); await dedup('clients');
    console.log('Deduplicating employees...'); await dedup('employees');
    console.log('Done.'); process.exit(0);
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
})();
