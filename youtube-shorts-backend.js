const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const uuid = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const TEMP_DIR = path.join(os.tmpdir(), 'chargebee-shorts');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// HTML Dashboard embedded directly
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YouTube Shorts Generator - Chargebee</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #f5f5f5; color: #1a1a1a; }
        .container { max-width: 900px; margin: 0 auto; padding: 2rem; }
        header { text-align: center; margin-bottom: 3rem; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h1 { font-size: 28px; margin-bottom: 0.5rem; }
        .subtitle { color: #666; font-size: 14px; }
        .form-section { background: white; padding: 2rem; border-radius: 8px; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 1.5rem; }
        label { display: block; font-weight: 500; margin-bottom: 0.5rem; }
        input[type="text"] { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        input[type="text"]:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1); }
        .clips-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .btn { padding: 8px 16px; border: 1px solid #ddd; background: white; color: #1a1a1a; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500; }
        .btn:hover { background: #f5f5f5; }
        .btn-primary { background: #007bff; color: white; border-color: #007bff; }
        .btn-primary:hover { background: #0056b3; }
        .btn-danger { color: #dc3545; border-color: #dc3545; padding: 6px 10px; }
        .btn-danger:hover { background: #fae6ea; }
        .clip-input { background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 1rem; margin-bottom: 1rem; }
        .clip-input input { margin-bottom: 0.75rem; }
        .time-inputs { display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: flex-end; }
        .time-input-group { flex: 1; }
        .time-input-group label { font-size: 12px; color: #666; margin-bottom: 4px; }
        .actions { display: flex; gap: 12px; align-items: center; margin-bottom: 1.5rem; }
        .status-text { font-size: 13px; color: #666; }
        .results { background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: none; }
        .results.show { display: block; }
        .results-header { display: flex; align-items: center; gap: 12px; margin-bottom: 1.5rem; font-size: 18px; font-weight: 500; color: #28a745; }
        .clip-item { background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; padding: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; }
        .clip-info h4 { font-size: 14px; margin-bottom: 0.25rem; }
        .clip-info p { font-size: 12px; color: #666; margin: 0; }
        .btn-download { background: #007bff; color: white; padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; font-size: 13px; font-weight: 500; text-decoration: none; display: inline-block; }
        .btn-download:hover { background: #0056b3; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 4px; padding: 1rem; margin-bottom: 1.5rem; display: none; }
        .error.show { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎬 YouTube Shorts Generator</h1>
            <p class="subtitle">Convert Chargebee YouTube videos into viral shorts for social media</p>
        </header>
        
        <div class="form-section">
            <div class="form-group">
                <label>YouTube URL</label>
                <input type="text" id="videoUrl" placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
            </div>
            
            <div class="clips-header">
                <h3>Clips to Generate</h3>
                <button class="btn" onclick="addClipInput()">+ Add clip</button>
            </div>
            
            <div id="clipsContainer">
                <div class="clip-input">
                    <input type="text" class="clip-title" placeholder="e.g., Pricing Feature Demo">
                    <div class="time-inputs">
                        <div class="time-input-group">
                            <label>Start time</label>
                            <input type="text" class="clip-start" placeholder="0:15">
                        </div>
                        <div class="time-input-group">
                            <label>End time</label>
                            <input type="text" class="clip-end" placeholder="0:45">
                        </div>
                        <button class="btn btn-danger" onclick="this.parentElement.parentElement.remove()">Delete</button>
                    </div>
                </div>
            </div>
            
            <div class="actions">
                <button class="btn btn-primary" onclick="processVideo()">Generate shorts</button>
                <span class="status-text" id="status"></span>
            </div>
        </div>
        
        <div class="error" id="error">
            <strong>Error:</strong> <span id="errorMessage"></span>
        </div>
        
        <div class="results" id="results">
            <div class="results-header">✓ Shorts ready!</div>
            <div id="downloadsList"></div>
        </div>
    </div>
    
    <script>
        const API_URL = '/api';
        let jobId = null;
        let pollInterval = null;
        
        function addClipInput() {
            const container = document.getElementById('clipsContainer');
            const clipDiv = document.createElement('div');
            clipDiv.className = 'clip-input';
            clipDiv.innerHTML = \`
                <input type="text" class="clip-title" placeholder="e.g., Pricing Feature Demo">
                <div class="time-inputs">
                    <div class="time-input-group">
                        <label>Start time</label>
                        <input type="text" class="clip-start" placeholder="0:15">
                    </div>
                    <div class="time-input-group">
                        <label>End time</label>
                        <input type="text" class="clip-end" placeholder="0:45">
                    </div>
                    <button class="btn btn-danger" onclick="this.parentElement.parentElement.remove()">Delete</button>
                </div>
            \`;
            container.appendChild(clipDiv);
        }
        
        function getClips() {
            const clips = [];
            document.querySelectorAll('.clip-input').forEach((clipEl) => {
                const title = clipEl.querySelector('.clip-title').value || 'Untitled';
                const start = clipEl.querySelector('.clip-start').value;
                const end = clipEl.querySelector('.clip-end').value;
                if (start && end) clips.push({ title, start, end });
            });
            return clips;
        }
        
        async function processVideo() {
            const videoUrl = document.getElementById('videoUrl').value.trim();
            const clips = getClips();
            const statusEl = document.getElementById('status');
            const errorEl = document.getElementById('error');
            const resultsEl = document.getElementById('results');
            
            errorEl.classList.remove('show');
            resultsEl.classList.remove('show');
            
            if (!videoUrl) {
                showError('Please enter a YouTube URL.');
                return;
            }
            if (clips.length === 0) {
                showError('Please add at least one clip with start and end times.');
                return;
            }
            
            try {
                statusEl.textContent = 'Processing video...';
                const response = await fetch(\`\${API_URL}/process-video\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ videoUrl, clips })
                });
                if (!response.ok) throw new Error('Failed to start processing');
                const data = await response.json();
                jobId = data.jobId;
                pollStatus();
            } catch (err) {
                showError(err.message);
                statusEl.textContent = '';
            }
        }
        
        function pollStatus() {
            const statusEl = document.getElementById('status');
            pollInterval = setInterval(async () => {
                try {
                    const response = await fetch(\`\${API_URL}/status/\${jobId}\`);
                    const data = await response.json();
                    if (data.status === 'completed') {
                        clearInterval(pollInterval);
                        displayResults(data.clips);
                        statusEl.textContent = 'Done!';
                    } else if (data.status === 'error') {
                        clearInterval(pollInterval);
                        showError(data.error);
                        statusEl.textContent = '';
                    } else {
                        statusEl.textContent = 'Processing... (this may take a few minutes)';
                    }
                } catch (err) {
                    clearInterval(pollInterval);
                    showError('Failed to check status');
                    statusEl.textContent = '';
                }
            }, 2000);
        }
        
        function displayResults(clips) {
            const resultsEl = document.getElementById('results');
            const downloadsList = document.getElementById('downloadsList');
            downloadsList.innerHTML = '';
            clips.forEach((clip) => {
                const item = document.createElement('div');
                item.className = 'clip-item';
                item.innerHTML = \`
                    <div class="clip-info">
                        <h4>\${clip.title}</h4>
                        <p>\${clip.duration}s • \${clip.filename}</p>
                    </div>
                    <a href="\${API_URL}/download/\${jobId}/\${clip.filename}" download class="btn-download">Download</a>
                \`;
                downloadsList.appendChild(item);
            });
            resultsEl.classList.add('show');
        }
        
        function showError(message) {
            const errorEl = document.getElementById('error');
            const errorMsg = document.getElementById('errorMessage');
            errorMsg.textContent = message;
            errorEl.classList.add('show');
        }
    </script>
</body>
</html>`;

function timeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  return 0;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    let stdout = '', stderr = '';
    process.stdout.on('data', (data) => stdout += data.toString());
    process.stderr.on('data', (data) => stderr += data.toString());
    process.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(`${command} failed: ${stderr}`)));
    process.on('error', (err) => reject(err));
  });
}

// Serve dashboard at root
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(DASHBOARD_HTML);
});

app.post('/api/process-video', async (req, res) => {
  try {
    const { videoUrl, clips } = req.body;
    const jobId = uuid.v4();
    const jobDir = path.join(TEMP_DIR, jobId);
    if (!videoUrl || !clips || clips.length === 0) {
      return res.status(400).json({ error: 'Missing videoUrl or clips' });
    }
    fs.mkdirSync(jobDir, { recursive: true });
    res.json({ jobId, status: 'processing', message: 'Video processing started' });

    processVideoAsync(videoUrl, clips, jobId, jobDir).catch(err => {
      console.error(`Job ${jobId} failed:`, err);
      fs.writeFileSync(path.join(jobDir, 'error.json'), JSON.stringify({ error: err.message }));
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function processVideoAsync(videoUrl, clips, jobId, jobDir) {
  const videoPath = path.join(jobDir, 'original.mp4');
  const outputClips = [];
  try {
    console.log(`[${jobId}] Downloading video...`);
    await runCommand('yt-dlp', [videoUrl, '-f', 'best', '-o', videoPath]);

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipName = `${clip.title || `clip-${i}`}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const outputPath = path.join(jobDir, `${clipName}.mp4`);
      const startSec = timeToSeconds(clip.start);
      const endSec = timeToSeconds(clip.end);
      const duration = endSec - startSec;

      await runCommand('ffmpeg', ['-i', videoPath, '-ss', String(startSec), '-to', String(endSec),
        '-vf', `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black`,
        '-c:v', 'libx264', '-preset', 'fast', '-c:a', 'aac', outputPath, '-y']);

      outputClips.push({ title: clip.title || `Clip ${i + 1}`, filename: path.basename(outputPath), duration });
    }

    fs.writeFileSync(path.join(jobDir, 'status.json'), JSON.stringify({ status: 'completed', clips: outputClips, completedAt: new Date().toISOString() }));
    console.log(`[${jobId}] Completed successfully`);
  } catch (error) {
    throw error;
  }
}

app.get('/api/status/:jobId', (req, res) => {
  try {
    const jobDir = path.join(TEMP_DIR, req.params.jobId);
    if (!fs.existsSync(jobDir)) return res.status(404).json({ error: 'Job not found' });
    
    const errorPath = path.join(jobDir, 'error.json');
    if (fs.existsSync(errorPath)) {
      const error = JSON.parse(fs.readFileSync(errorPath, 'utf-8'));
      return res.json({ status: 'error', error: error.error });
    }
    
    const statusPath = path.join(jobDir, 'status.json');
    if (fs.existsSync(statusPath)) {
      return res.json(JSON.parse(fs.readFileSync(statusPath, 'utf-8')));
    }
    res.json({ status: 'processing' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/download/:jobId/:filename', (req, res) => {
  try {
    const jobDir = path.join(TEMP_DIR, req.params.jobId);
    const filePath = path.join(jobDir, req.params.filename);
    if (!filePath.startsWith(jobDir)) return res.status(403).json({ error: 'Access denied' });
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    res.download(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n>>> YouTube Shorts Backend running on port ${PORT}\n`);
  console.log(`>>> Available at: http://localhost:${PORT}\n`);
});
