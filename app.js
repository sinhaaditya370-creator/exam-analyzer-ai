const textInput = document.getElementById('textInput');
const analyzeTextBtn = document.getElementById('analyzeTextBtn');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const uploadProgress = document.getElementById('uploadProgress');
const resultsCard = document.getElementById('resultsCard');
const summaryEl = document.getElementById('summary');
const mostProbableEl = document.getElementById('mostProbable');
const clustersEl = document.getElementById('clusters');
const studyPlanEl = document.getElementById('studyPlan');
const gptSummaryEl = document.getElementById('gptSummary');
const downloadJson = document.getElementById('downloadJson');

function showResultData(data) {
  resultsCard.style.display = 'block';
  summaryEl.innerHTML = `<p><b>Snippets found:</b> ${data.snippetsCount || 0}</p>`;
  mostProbableEl.innerHTML = '<h3>Top probable questions</h3>';
  if (data.mostProbable && data.mostProbable.length) {
    const ol = document.createElement('ol');
    data.mostProbable.forEach(q => {
      const li = document.createElement('li');
      li.innerHTML = `<b>(${q.frequency})</b> ${escapeHtml(q.example)}`;
      ol.appendChild(li);
    });
    mostProbableEl.appendChild(ol);
  } else mostProbableEl.innerHTML += '<p>No probable questions.</p>';

  clustersEl.innerHTML = '<h3>Clusters (top)</h3>';
  if (data.clusters && data.clusters.length) {
    const ul = document.createElement('ul');
    data.clusters.slice(0, 20).forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `<b>Count:</b> ${c.count} — <i>${escapeHtml(c.example.slice(0,140))}</i>`;
      ul.appendChild(li);
    });
    clustersEl.appendChild(ul);
  } else clustersEl.innerHTML += '<p>No clusters found.</p>';

  studyPlanEl.innerHTML = '<h3>Study Plan (sample)</h3>';
  if (data.studyPlan && data.studyPlan.length) {
    const ol = document.createElement('ol');
    data.studyPlan.forEach(p => {
      const li = document.createElement('li');
      li.innerHTML = `<b>Day ${p.day}:</b> ${escapeHtml(p.task)}`;
      ol.appendChild(li);
    });
    studyPlanEl.appendChild(ol);
  }

  gptSummaryEl.innerHTML = '<h3>AI Summary</h3>';
  if (data.summary && data.summary.gpt) {
    const pre = document.createElement('pre');
    pre.textContent = data.summary.gpt;
    gptSummaryEl.appendChild(pre);
  } else if (data.summary && data.summary.note) {
    gptSummaryEl.innerHTML += `<p>${escapeHtml(data.summary.note)}</p>`;
  }

  downloadJson.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
}

function escapeHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

analyzeTextBtn.onclick = async () => {
  const text = textInput.value.trim();
  if (!text) return alert('Paste some text first');
  analyzeTextBtn.disabled = true;
  analyzeTextBtn.innerText = 'Analyzing...';
  try {
    const res = await fetch(`${API_BASE}/api/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (res.ok) showResultData(data);
    else alert(data.error || 'Analysis failed');
  } catch (e) {
    console.error(e);
    alert('Request failed - check backend URL in config.js');
  } finally {
    analyzeTextBtn.disabled = false;
    analyzeTextBtn.innerText = 'Analyze Text';
  }
};

uploadBtn.onclick = async () => {
  const files = fileInput.files;
  if (!files || files.length === 0) return alert('Choose files to upload');
  uploadBtn.disabled = true;
  uploadBtn.innerText = 'Uploading...';
  uploadProgress.innerText = '';
  const fd = new FormData();
  for (let f of files) fd.append('files', f);
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/analyze-upload`, true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        uploadProgress.innerText = `Uploaded ${Math.round((e.loaded*100)/e.total)}%`;
      }
    };
    xhr.onload = function() {
      uploadBtn.disabled = false;
      uploadBtn.innerText = 'Upload & Analyze';
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        showResultData(data);
      } else {
        alert('Upload failed: ' + xhr.responseText);
      }
    };
    xhr.onerror = function() {
      uploadBtn.disabled = false;
      uploadBtn.innerText = 'Upload & Analyze';
      alert('Upload error - check console');
    };
    xhr.send(fd);
  } catch (e) {
    console.error(e);
    alert('Upload failed');
    uploadBtn.disabled = false;
    uploadBtn.innerText = 'Upload & Analyze';
  }
};
