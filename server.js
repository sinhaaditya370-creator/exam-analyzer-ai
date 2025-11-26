/**
 * ExamAnalyzerAI - Backend (Full System)
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { analyzeTextSnippetsFromText, analyzeFiles } = require('./services/analysis');

const upload = multer({ dest: path.join(__dirname, 'uploads/') });
const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.post('/api/analyze-text', async (req, res) => {
  try {
    const text = req.body.text || '';
    if (!text.trim()) return res.status(400).json({ error: 'Empty text' });
    const result = await analyzeTextSnippetsFromText(text);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.post('/api/analyze-upload', upload.array('files', 8), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    const result = await analyzeFiles(files);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Exam analyzer backend (full) listening on ${PORT}`));
