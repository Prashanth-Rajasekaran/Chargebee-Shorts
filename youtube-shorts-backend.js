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
app.use(express.static('.')); // Serve static files (index.html, etc.)

const TEMP_DIR = path.join(os.tmpdir(), 'chargebee-shorts');
const OUTPUT_DIR = path.join(TEMP_DIR, 'outputs');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function timeToSeconds(timeStr) {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return 0;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} failed: ${stderr}`));
      }
    });

    process.on('error', (err) => {
      reject(err);
    });
  });
}

app.post('/api/process-video', async (req, res) => {
  try {
    const { videoUrl, clips } = req.body;
    const jobId = uuid.v4();
    const jobDir = path.join(TEMP_DIR, jobId);

    if (!videoUrl || !clips || clips.length === 0) {
      return res.status(400).json({ error: 'Missing videoUrl or clips' });
    }

    fs.mkdirSync(jobDir, { recursive: true });

    res.json({
      jobId,
      status: 'processing',
      message: 'Video processing started'
    });

    processVideoAsync(videoUrl, clips, jobId, jobDir).catch(err => {
      console.error(`Job ${jobId} failed:`, err);
      fs.writeFileSync(
        path.join(jobDir, 'error.json'),
        JSON.stringify({ error: err.message })
      );
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
    await runCommand('yt-dlp', [
      videoUrl,
      '-f', 'best',
      '-o', videoPath
    ]);

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipName = `${clip.title || `clip-${i}`}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const outputPath = path.join(jobDir, `${clipName}.mp4`);

      console.log(`[${jobId}] Processing clip ${i + 1}/${clips.length}: ${clip.title}`);

      const startSec = timeToSeconds(clip.start);
      const endSec = timeToSeconds(clip.end);
      const duration = endSec - startSec;

      await runCommand('ffmpeg', [
        '-i', videoPath,
        '-ss', String(startSec),
        '-to', String(endSec),
        '-vf', `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black`,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-c:a', 'aac',
        outputPath,
        '-y'
      ]);

      outputClips.push({
        title: clip.title || `Clip ${i + 1}`,
        filename: path.basename(outputPath),
        duration: duration
      });
    }

    fs.writeFileSync(
      path.join(jobDir, 'status.json'),
      JSON.stringify({
        status: 'completed',
        clips: outputClips,
        completedAt: new Date().toISOString()
      })
    );

    console.log(`[${jobId}] Completed successfully`);

  } catch (error) {
    throw error;
  }
}

app.get('/api/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const jobDir = path.join(TEMP_DIR, jobId);

    if (!fs.existsSync(jobDir)) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const statusPath = path.join(jobDir, 'status.json');
    const errorPath = path.join(jobDir, 'error.json');

    if (fs.existsSync(errorPath)) {
      const error = JSON.parse(fs.readFileSync(errorPath, 'utf-8'));
      return res.json({ status: 'error', error: error.error });
    }

    if (fs.existsSync(statusPath)) {
      const status = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
      return res.json(status);
    }

    res.json({ status: 'processing' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/download/:jobId/:filename', (req, res) => {
  try {
    const { jobId, filename } = req.params;
    const jobDir = path.join(TEMP_DIR, jobId);
    const filePath = path.join(jobDir, filename);

    if (!filePath.startsWith(jobDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`YouTube Shorts Backend running on port ${PORT}`);
  console.log(`Temp directory: ${TEMP_DIR}`);
});
