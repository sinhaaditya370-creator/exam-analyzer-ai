const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { splitQuestions, normalize, jaccardSimilarity } = require('./text_processing');
const { createEmbedding } = require('./embeddings');
const { spawn } = require('child_process');

async function analyzeTextSnippetsFromText(text) {
  const snippetsRaw = splitQuestions(text);
  const snippets = snippetsRaw.map(s => ({ text: s, norm: normalize(s) }));
  return clusterAndSummarize(snippets);
}

async function runOCR(filePath) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [path.join(__dirname, 'ocr_runner.py'), filePath]);
    let out = '', err = '';
    py.stdout.on('data', d => out += d.toString());
    py.stderr.on('data', d => err += d.toString());
    py.on('close', code => {
      if (code !== 0) return reject(new Error(err || 'ocr failed'));
      try { resolve(JSON.parse(out)); } catch(e){ reject(e); }
    });
  });
}

async function analyzeFiles(files) {
  const allSnippets = [];
  for (const f of files) {
    const ext = path.extname(f.originalname || f.filename).toLowerCase();
    try {
      if (ext === '.pdf') {
        const data = fs.readFileSync(f.path);
        const parsed = await pdfParse(data);
        const text = (parsed.text || '').trim();
        if (text.length > 100) {
          const s = splitQuestions(text);
          s.forEach(ss => allSnippets.push({ text: ss, norm: normalize(ss), file: f.originalname }));
        } else {
          const pages = await runOCR(f.path).catch(e=>[]);
          pages.forEach(p => {
            const s = splitQuestions(p.text || '');
            s.forEach(ss => allSnippets.push({ text: ss, norm: normalize(ss), file: f.originalname, page: p.page }));
          });
        }
      } else if (['.jpg','.jpeg','.png','.tiff'].includes(ext)) {
        const pages = await runOCR(f.path).catch(e=>[]);
        pages.forEach(p => {
          const s = splitQuestions(p.text || '');
          s.forEach(ss => allSnippets.push({ text: ss, norm: normalize(ss), file: f.originalname, page: p.page }));
        });
      } else {
        const data = fs.readFileSync(f.path, 'utf8');
        const s = splitQuestions(data);
        s.forEach(ss => allSnippets.push({ text: ss, norm: normalize(ss), file: f.originalname }));
      }
    } catch (e) {
      console.error('File parse error', f.originalname, e.message || e);
    } finally {
      try { fs.unlinkSync(f.path); } catch(e){}
    }
  }

  if (allSnippets.length === 0) return { snippetsCount: 0, clusters: [], mostProbable: [], studyPlan: [], message: 'No text extracted' };
  return clusterAndSummarize(allSnippets);
}

async function clusterAndSummarize(snippets) {
  const useEmb = !!process.env.OPENAI_API_KEY;
  if (useEmb) {
    for (let s of snippets) {
      s.embedding = await createEmbedding(s.norm);
    }
  }

  const clusters = [];
  for (let s of snippets) {
    let placed = false;
    for (const c of clusters) {
      const rep = c.representative;
      let sim = 0;
      if (useEmb && s.embedding && rep.embedding) {
        const dot = s.embedding.reduce((acc,v,idx)=>acc+v*rep.embedding[idx],0);
        const magA = Math.sqrt(s.embedding.reduce((acc,v)=>acc+v*v,0));
        const magB = Math.sqrt(rep.embedding.reduce((acc,v)=>acc+v*v,0));
        sim = magA && magB ? dot/(magA*magB) : 0;
      } else {
        sim = jaccardSimilarity(s.norm, rep.norm);
      }
      if (sim > 0.76) { c.items.push(s); placed = true; break; }
    }
    if (!placed) clusters.push({ representative: s, items: [s] });
  }

  const clusterSummaries = clusters.map(c => ({
    count: c.items.length,
    example: c.representative.text,
    files: Array.from(new Set(c.items.map(i=>i.file))).filter(Boolean).slice(0,5),
  })).sort((a,b)=>b.count - a.count);

  const mostProbable = clusterSummaries.slice(0,15).map((c,idx)=>({ rank: idx+1, example: c.example, frequency: c.count }));
  const studyPlan = generateStudyPlan(clusterSummaries);

  const summary = await generatePolishedSummary(clusterSummaries).catch(e=>({ note: 'GPT not available' }));

  return { snippetsCount: snippets.length, clusters: clusterSummaries, mostProbable, studyPlan, summary };
}

async function generatePolishedSummary(clusterSummaries) {
  if (!process.env.OPENAI_API_KEY) return Promise.resolve({ note: 'No OpenAI key set' });
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `You are an expert exam analyst. Given the following repeating question clusters and frequencies, output:
1) Top 10 most-probable exam questions (well-phrased).
2) A concise 4-week study plan with daily targets.
3) A short 6-point exam strategy.
Clusters:\n${clusterSummaries.slice(0,50).map((c,i)=>`${i+1}) ${c.example} -- freq ${c.count}`).join('\n')}`;
  const resp = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 800
  });
  const text = resp.choices?.[0]?.message?.content || '';
  return { gpt: text };
}

function generateStudyPlan(clusterSummaries) {
  const days = 28;
  const topics = clusterSummaries.length ? clusterSummaries : [{ example: 'General revision', count: 1 }];
  const plan = [];
  for (let d=0; d<days; d++) {
    const t = topics[d % topics.length];
    plan.push({ day: d+1, task: `Revise: ${t.example.slice(0,120)}... (focus on repeated topics)` });
  }
  return plan;
}

module.exports = { analyzeTextSnippetsFromText, analyzeFiles };
