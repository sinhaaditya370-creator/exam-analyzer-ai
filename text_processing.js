function splitQuestions(text) {
  if (!text) return [];
  const byNumber = text.split(/\n\s*(?:Q\.?\s*\d+|Question\s+\d+|\d+\.\s+)/i).map(s => s.trim()).filter(Boolean);
  const final = [];
  byNumber.forEach(b => {
    const parts = b.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    parts.forEach(p => { if (p.length > 25) final.push(p); });
  });
  return final.slice(0, 2000);
}

function normalize(text) {
  return (text||'').replace(/\s+/g,' ').replace(/[^\w\s]/g,' ').toLowerCase().trim();
}

function jaccardSimilarity(a, b) {
  const A = new Set(a.split(' '));
  const B = new Set(b.split(' '));
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

module.exports = { splitQuestions, normalize, jaccardSimilarity };
