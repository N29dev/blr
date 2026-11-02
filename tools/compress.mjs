import { FFmpeg } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js';
    import { fetchFile, toBlobURL } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js';

    const compressInput = document.getElementById('compress-video');
    const compressDrop = document.getElementById('compress-drop');
    const compressQuality = document.getElementById('compress-quality');
    const compressButton = document.getElementById('compress-button');
    const compressCancel = document.getElementById('compress-cancel');
    const compressDownload = document.getElementById('compress-download');
    const compressProgress = document.getElementById('compress-progress');
    const compressStatus = document.getElementById('compress-status');
    const compressFileInfo = document.getElementById('compress-file-info');
    const compressResults = document.getElementById('compress-results');
    const compressSummary = document.getElementById('compress-summary');
    const originalPreview = document.getElementById('compress-original-preview');
    const outputPreview = document.getElementById('compress-output-preview');
    const originalSize = document.getElementById('compress-original-size');
    const outputSize = document.getElementById('compress-output-size');

    let selectedFile = null;
    let originalUrl = null;
    let outputUrl = null;
    let ffmpeg = null;
    let ffmpegLoaded = false;
    let compressing = false;

    function formatBytes(bytes) {
      const units = ['B', 'KB', 'MB', 'GB'];
      let value = Number(bytes || 0);
      let unit = 0;
      while (value >= 1000 && unit < units.length - 1) {
        value /= 1000;
        unit++;
      }
      const digits = unit === 0 ? 0 : value >= 10 ? 1 : 2;
      return value.toFixed(digits) + ' ' + units[unit];
    }

    function formatDuration(seconds) {
      if (!Number.isFinite(seconds) || seconds <= 0) return '';
      const total = Math.round(seconds);
      const minutes = Math.floor(total / 60);
      const rest = String(total % 60).padStart(2, '0');
      return minutes + ':' + rest;
    }

    function clearOutput() {
      compressDownload.hidden = true;
      compressDownload.removeAttribute('href');
      compressResults.hidden = true;
      compressSummary.hidden = true;
      outputPreview.removeAttribute('src');
      outputPreview.load();

      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
        outputUrl = null;
      }
    }

    function setBusy(busy) {
      compressing = busy;
      compressButton.disabled = busy || !selectedFile;
      compressCancel.disabled = !busy;
      compressInput.disabled = busy;
      compressQuality.disabled = busy;
    }

    function setupFFmpeg() {
      const instance = new FFmpeg();
      instance.on('progress', ({ progress }) => {
        if (!compressing) return;
        const pct = Math.max(0, Math.min(100, Math.round(Number(progress || 0) * 100)));
        compressProgress.value = pct;
        if (pct > 0) compressStatus.textContent = 'Compressing… ' + pct + '%';
      });
      return instance;
    }

    async function ensureFFmpeg() {
      if (ffmpegLoaded && ffmpeg) return;

      compressStatus.textContent = 'Loading compression engine (~31 MB)…';
      ffmpeg = setupFFmpeg();

      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
      const [coreURL, wasmURL] = await Promise.all([
        toBlobURL(baseURL + '/ffmpeg-core.js', 'text/javascript'),
        toBlobURL(baseURL + '/ffmpeg-core.wasm', 'application/wasm')
      ]);

      await ffmpeg.load({
        classWorkerURL: new URL('./ffmpeg-worker.js', window.location.href).href,
        coreURL,
        wasmURL
      });

      ffmpegLoaded = true;
    }

    function readVideoMetadata(file) {
      return new Promise(resolve => {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        let done = false;

        const finish = result => {
          if (done) return;
          done = true;
          URL.revokeObjectURL(url);
          video.removeAttribute('src');
          video.load();
          resolve(result);
        };

        const timer = setTimeout(() => finish({ width: 0, height: 0, duration: 0 }), 6000);

        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.onloadedmetadata = () => {
          clearTimeout(timer);
          finish({
            width: Number(video.videoWidth || 0),
            height: Number(video.videoHeight || 0),
            duration: Number.isFinite(video.duration) ? Number(video.duration) : 0
          });
        };
        video.onerror = () => {
          clearTimeout(timer);
          finish({ width: 0, height: 0, duration: 0 });
        };
        video.src = url;
      });
    }

    async function useFile(file) {
      if (!file || (!file.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm|mkv|avi|flv)$/i.test(file.name))) {
        compressStatus.textContent = 'Choose a video file.';
        compressStatus.classList.add('error');
        return;
      }

      selectedFile = file;
      clearOutput();
      compressStatus.textContent = '';
      compressStatus.classList.remove('error');
      compressProgress.hidden = true;
      compressProgress.value = 0;

      if (originalUrl) URL.revokeObjectURL(originalUrl);
      originalUrl = URL.createObjectURL(file);
      originalPreview.src = originalUrl;
      originalSize.textContent = formatBytes(file.size);

      const meta = await readVideoMetadata(file);
      const details = [
        formatBytes(file.size),
        meta.width && meta.height ? meta.width + '×' + meta.height : '',
        formatDuration(meta.duration)
      ].filter(Boolean);

      compressFileInfo.textContent = file.name + ' · ' + details.join(' · ');
      compressButton.disabled = false;

      if (file.size > 1.5 * 1024 ** 3) {
        compressStatus.textContent = 'Large file: browser memory may not be enough. Native FFmpeg is safer above ~1.5 GiB.';
      }
    }

    compressInput.addEventListener('change', () => {
      useFile(compressInput.files[0]);
    });

    for (const type of ['dragenter', 'dragover']) {
      compressDrop.addEventListener(type, event => {
        event.preventDefault();
        if (!compressing) compressDrop.classList.add('dragover');
      });
    }

    for (const type of ['dragleave', 'drop']) {
      compressDrop.addEventListener(type, event => {
        event.preventDefault();
        compressDrop.classList.remove('dragover');
      });
    }

    compressDrop.addEventListener('drop', event => {
      if (compressing) return;
      const file = event.dataTransfer?.files?.[0];
      if (file) useFile(file);
    });

    compressCancel.addEventListener('click', () => {
      if (!compressing || !ffmpeg) return;
      ffmpeg.terminate();
      ffmpeg = null;
      ffmpegLoaded = false;
      compressing = false;
      setBusy(false);
      compressProgress.hidden = true;
      compressStatus.classList.remove('error');
      compressStatus.textContent = 'Compression canceled.';
    });

    compressButton.addEventListener('click', async () => {
      if (!selectedFile) return;

      clearOutput();
      compressStatus.classList.remove('error');
      compressProgress.hidden = false;
      compressProgress.value = 0;
      setBusy(true);

      const settings = {
        high: { crf: '23', audio: '160k' },
        balanced: { crf: '28', audio: '128k' },
        small: { crf: '32', audio: '96k' }
      }[compressQuality.value] || { crf: '28', audio: '128k' };

      const extMatch = selectedFile.name.match(/\.[a-z0-9]+$/i);
      const inputName = 'input' + (extMatch ? extMatch[0].toLowerCase() : '.mp4');
      const outputName = 'output.mp4';

      try {
        await ensureFFmpeg();
        compressStatus.textContent = 'Preparing video…';

        await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));

        compressStatus.textContent = 'Compressing…';
        const code = await ffmpeg.exec([
          '-i', inputName,
          '-map', '0:v:0',
          '-map', '0:a?',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', settings.crf,
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', settings.audio,
          '-movflags', '+faststart',
          '-map_metadata', '0',
          outputName
        ]);

        if (code !== 0) throw new Error('FFmpeg could not compress this video.');

        const data = await ffmpeg.readFile(outputName);
        const blob = new Blob([data], { type: 'video/mp4' });

        outputUrl = URL.createObjectURL(blob);
        outputPreview.src = outputUrl;
        outputSize.textContent = formatBytes(blob.size);
        compressResults.hidden = false;

        compressDownload.href = outputUrl;
        compressDownload.download = selectedFile.name.replace(/\.[^.]+$/, '') + '_compressed.mp4';
        compressDownload.hidden = false;

        const change = selectedFile.size
          ? (1 - blob.size / selectedFile.size) * 100
          : 0;

        if (change >= 0) {
          compressSummary.innerHTML =
            '<strong>' + change.toFixed(1) + '% smaller</strong> · ' +
            formatBytes(selectedFile.size) + ' → ' + formatBytes(blob.size);
        } else {
          compressSummary.innerHTML =
            '<strong>' + Math.abs(change).toFixed(1) + '% larger</strong> · this source was already highly compressed. ' +
            formatBytes(selectedFile.size) + ' → ' + formatBytes(blob.size);
        }

        compressSummary.hidden = false;
        compressProgress.value = 100;
        compressStatus.textContent = 'Done. Your video never left this device.';

        await Promise.allSettled([
          ffmpeg.deleteFile(inputName),
          ffmpeg.deleteFile(outputName)
        ]);
      } catch (error) {
        if (!compressing) return;
        compressStatus.classList.add('error');
        compressStatus.textContent = error instanceof Error
          ? error.message
          : 'Compression failed.';
      } finally {
        if (compressing) {
          compressing = false;
          setBusy(false);
        }
      }
    });

    window.addEventListener('pagehide', () => {
      if (ffmpeg && compressing) ffmpeg.terminate();
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    });
