const tiktokUrlInput = document.getElementById('tiktok-url');
    const tiktokCheckButton = document.getElementById('tiktok-check');
    const tiktokOpen = document.getElementById('tiktok-open');
    const tiktokStatus = document.getElementById('tiktok-status');
    const tiktokResults = document.getElementById('tiktok-results');
    const tiktokAuthorName = document.getElementById('tiktok-author-name');
    const tiktokAuthorHandle = document.getElementById('tiktok-author-handle');
    const tiktokTitle = document.getElementById('tiktok-title');
    const tiktokDate = document.getElementById('tiktok-date');
    const tiktokDuration = document.getElementById('tiktok-duration');
    const tiktokViews = document.getElementById('tiktok-views');
    const tiktokLikes = document.getElementById('tiktok-likes');
    const tiktokComments = document.getElementById('tiktok-comments');
    const tiktokShares = document.getElementById('tiktok-shares');
    const tiktokResolution = document.getElementById('tiktok-resolution');
    const tiktokQualityMain = document.getElementById('tiktok-quality-main');
    const tiktokQualityTech = document.getElementById('tiktok-quality-tech');
    const tiktokVideoId = document.getElementById('tiktok-video-id');

    function isTikTokUrl(value) {
      try {
        const url = new URL(value);
        const host = url.hostname.toLowerCase();
        return host === 'tiktok.com' || host.endsWith('.tiktok.com');
      } catch {
        return false;
      }
    }

    function formatTikTokCount(value) {
      const number = Number(value || 0);
      return Number.isFinite(number) ? number.toLocaleString('en-US') : '-';
    }

    function formatTikTokDuration(seconds) {
      const value = Math.max(0, Math.round(Number(seconds || 0)));
      if (!value) return 'Duration unavailable';
      const minutes = Math.floor(value / 60);
      const rest = String(value % 60).padStart(2, '0');
      return minutes + ':' + rest;
    }

    function formatTikTokDate(timestamp) {
      const value = Number(timestamp || 0);
      if (!value) return 'Date unavailable';
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date(value * 1000));
    }

    function formatMediaBytes(bytes) {
      const value = Number(bytes || 0);
      if (!Number.isFinite(value) || value <= 0) return null;
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = value;
      let unit = 0;
      while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit++;
      }
      const digits = unit >= 2 ? (size >= 10 ? 1 : 2) : 0;
      return size.toFixed(digits) + ' ' + units[unit];
    }

    function wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function fetchTikTokInfo(url) {
      const endpoint = 'https://www.tikwm.com/api/?hd=1&url=' + encodeURIComponent(url);

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(endpoint, { cache: 'no-store' });

          if (response.status === 429) {
            await wait(1100);
            continue;
          }

          if (!response.ok) continue;

          const payload = await response.json();
          const message = String(payload.msg || '').toLowerCase();

          if (message.includes('limit')) {
            await wait(1100);
            continue;
          }

          if (payload.data) return payload.data;
        } catch {
          if (attempt < 2) await wait(700);
        }
      }

      return null;
    }

    function chooseTikTokStream(data) {
      const candidates = [
        {
          url: data.hdplay || data.hdPlay || '',
          size: Number(data.hd_size || data.hdSize || 0)
        },
        {
          url: data.play || '',
          size: Number(data.size || data.play_size || data.playSize || 0)
        },
        {
          url: data.wmplay || data.wmPlay || '',
          size: Number(data.wm_size || data.wmSize || 0)
        }
      ];
      return candidates.find(item => item.url) || { url: '', size: 0 };
    }

    function normalizeCodec(value) {
      const codec = String(value || '').trim().toLowerCase();
      if (!codec) return null;
      if (codec.includes('avc1') || codec.includes('h264') || codec.includes('h.264')) return 'H.264';
      if (codec.includes('hvc1') || codec.includes('hev1') || codec.includes('hevc') || codec.includes('h265') || codec.includes('h.265')) return 'H.265';
      if (codec.includes('av01') || codec.includes('av1')) return 'AV1';
      if (codec.includes('vp09') || codec.includes('vp9')) return 'VP9';
      return String(value);
    }

    function findCodecInBytes(bytes) {
      if (!bytes || !bytes.length) return null;
      const patterns = [
        ['avc1', 'H.264'],
        ['avc3', 'H.264'],
        ['hvc1', 'H.265'],
        ['hev1', 'H.265'],
        ['av01', 'AV1'],
        ['vp09', 'VP9']
      ];

      for (const [pattern, label] of patterns) {
        const needle = Array.from(pattern, char => char.charCodeAt(0));
        outer:
        for (let i = 0; i <= bytes.length - needle.length; i++) {
          for (let j = 0; j < needle.length; j++) {
            if (bytes[i + j] !== needle[j]) continue outer;
          }
          return label;
        }
      }
      return null;
    }

    function readMp4Type(bytes, offset) {
      if (offset < 0 || offset + 4 > bytes.length) return '';
      return String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    }

    function readMp4Box(bytes, offset, limit) {
      if (offset < 0 || offset + 8 > limit) return null;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let size = view.getUint32(offset);
      const type = readMp4Type(bytes, offset + 4);
      let header = 8;

      if (size === 1) {
        if (offset + 16 > limit) return null;
        const high = view.getUint32(offset + 8);
        const low = view.getUint32(offset + 12);
        size = high * 4294967296 + low;
        header = 16;
      } else if (size === 0) {
        size = limit - offset;
      }

      if (!Number.isFinite(size) || size < header || offset + size > limit) return null;
      return {
        type,
        start: offset,
        payload: offset + header,
        end: offset + size,
        size,
        header
      };
    }

    function mp4Children(bytes, start, end) {
      const boxes = [];
      let offset = start;

      while (offset + 8 <= end) {
        const box = readMp4Box(bytes, offset, end);
        if (!box) break;
        boxes.push(box);
        offset = box.end;
      }

      return boxes;
    }

    function mp4Child(bytes, start, end, type) {
      return mp4Children(bytes, start, end).find(box => box.type === type) || null;
    }

    function findMp4Moov(bytes) {
      for (let i = 4; i + 4 <= bytes.length; i++) {
        if (
          bytes[i] === 0x6d &&
          bytes[i + 1] === 0x6f &&
          bytes[i + 2] === 0x6f &&
          bytes[i + 3] === 0x76
        ) {
          const box = readMp4Box(bytes, i - 4, bytes.length);
          if (box && box.type === 'moov') return box;
        }
      }
      return null;
    }

    function parseTkhd(bytes, box) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const p = box.payload;
      if (p + 4 > box.end) return { width: 0, height: 0 };
      const version = bytes[p];
      const widthOffset = p + (version === 1 ? 88 : 76);
      if (widthOffset + 8 > box.end) return { width: 0, height: 0 };
      return {
        width: Math.round(view.getUint32(widthOffset) / 65536),
        height: Math.round(view.getUint32(widthOffset + 4) / 65536)
      };
    }

    function parseMdhdTimescale(bytes, box) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const p = box.payload;
      if (p + 4 > box.end) return 0;
      const version = bytes[p];
      const offset = p + (version === 1 ? 20 : 12);
      return offset + 4 <= box.end ? view.getUint32(offset) : 0;
    }

    function parseHdlrType(bytes, box) {
      const offset = box.payload + 8;
      return offset + 4 <= box.end ? readMp4Type(bytes, offset) : '';
    }

    function parseSttsFps(bytes, box, timescale) {
      if (!timescale) return 0;
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const p = box.payload;
      if (p + 8 > box.end) return 0;

      const entries = view.getUint32(p + 4);
      let offset = p + 8;
      let totalSamples = 0;
      let totalTicks = 0;

      for (let i = 0; i < entries && offset + 8 <= box.end; i++, offset += 8) {
        const count = view.getUint32(offset);
        const delta = view.getUint32(offset + 4);
        totalSamples += count;
        totalTicks += count * delta;
      }

      if (!totalSamples || !totalTicks) return 0;
      return totalSamples * timescale / totalTicks;
    }

    function parseMp4Track(bytes, trak) {
      const tkhd = mp4Child(bytes, trak.payload, trak.end, 'tkhd');
      const mdia = mp4Child(bytes, trak.payload, trak.end, 'mdia');
      if (!mdia) return null;

      const hdlr = mp4Child(bytes, mdia.payload, mdia.end, 'hdlr');
      if (!hdlr || parseHdlrType(bytes, hdlr) !== 'vide') return null;

      const mdhd = mp4Child(bytes, mdia.payload, mdia.end, 'mdhd');
      const timescale = mdhd ? parseMdhdTimescale(bytes, mdhd) : 0;

      const minf = mp4Child(bytes, mdia.payload, mdia.end, 'minf');
      const stbl = minf ? mp4Child(bytes, minf.payload, minf.end, 'stbl') : null;
      const stts = stbl ? mp4Child(bytes, stbl.payload, stbl.end, 'stts') : null;

      const dimensions = tkhd ? parseTkhd(bytes, tkhd) : { width: 0, height: 0 };
      return {
        width: dimensions.width,
        height: dimensions.height,
        fps: stts ? parseSttsFps(bytes, stts, timescale) : 0
      };
    }

    function parseMp4Metadata(bytes) {
      const result = {
        width: 0,
        height: 0,
        fps: 0,
        codec: findCodecInBytes(bytes)
      };

      const moov = findMp4Moov(bytes);
      if (!moov) return result;

      const tracks = mp4Children(bytes, moov.payload, moov.end)
        .filter(box => box.type === 'trak');

      for (const trak of tracks) {
        const video = parseMp4Track(bytes, trak);
        if (!video) continue;
        result.width = video.width;
        result.height = video.height;
        result.fps = video.fps;
        break;
      }

      return result;
    }

    async function fetchVideoRange(url, start, endInclusive) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      try {
        const response = await fetch(url, {
          headers: { Range: 'bytes=' + start + '-' + endInclusive },
          cache: 'no-store',
          signal: controller.signal
        });

        if (!response.ok) return null;

        const contentLength = Number(response.headers.get('content-length') || 0);

        // Do not accidentally download an entire large video if the server ignores Range.
        if (response.status === 200 && contentLength > 5 * 1024 * 1024) return null;

        return new Uint8Array(await response.arrayBuffer());
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    }

    async function inspectStreamBytes(url, knownSize) {
      const empty = { codec: null, size: 0, width: 0, height: 0, fps: 0 };
      if (!url) return empty;

      const firstBytes = await fetchVideoRange(url, 0, 2 * 1024 * 1024 - 1);
      let firstMeta = firstBytes ? parseMp4Metadata(firstBytes) : empty;

      if (firstMeta.width && firstMeta.height && firstMeta.fps) {
        return {
          ...firstMeta,
          size: Number(knownSize || 0)
        };
      }

      const size = Number(knownSize || 0);
      if (size > 2 * 1024 * 1024) {
        const tailStart = Math.max(0, size - 4 * 1024 * 1024);
        const tailBytes = await fetchVideoRange(url, tailStart, size - 1);
        if (tailBytes) {
          const tailMeta = parseMp4Metadata(tailBytes);
          firstMeta = {
            codec: firstMeta.codec || tailMeta.codec,
            width: firstMeta.width || tailMeta.width,
            height: firstMeta.height || tailMeta.height,
            fps: firstMeta.fps || tailMeta.fps
          };
        }
      }

      return {
        ...empty,
        ...firstMeta,
        size
      };
    }

    function inspectVideoStream(url) {
      return new Promise(resolve => {
        if (!url) {
          resolve({ width: 0, height: 0, duration: 0, fps: 0 });
          return;
        }

        const video = document.createElement('video');
        const result = { width: 0, height: 0, duration: 0, fps: 0 };
        let finished = false;
        let frameHandle = null;

        const finish = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          if (frameHandle && typeof video.cancelVideoFrameCallback === 'function') {
            video.cancelVideoFrameCallback(frameHandle);
          }
          video.pause();
          video.removeAttribute('src');
          video.load();
          resolve(result);
        };

        const estimateFps = async () => {
          if (typeof video.requestVideoFrameCallback !== 'function') {
            finish();
            return;
          }

          try {
            await video.play();
          } catch {
            finish();
            return;
          }

          const deltas = [];
          let lastMediaTime = null;
          let frames = 0;

          const onFrame = (now, metadata) => {
            const current = Number(metadata.mediaTime);
            if (lastMediaTime !== null) {
              const delta = current - lastMediaTime;
              if (delta > 0.005 && delta < 0.1) deltas.push(delta);
            }
            lastMediaTime = current;
            frames++;

            if (deltas.length >= 12 || frames >= 24) {
              if (deltas.length) {
                const sorted = deltas.slice().sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                const measured = 1 / median;
                const common = [24, 25, 30, 50, 60, 120];
                const closest = common.reduce((best, value) =>
                  Math.abs(value - measured) < Math.abs(best - measured) ? value : best
                );
                result.fps = Math.abs(closest - measured) <= 3 ? closest : Math.round(measured);
              }
              finish();
              return;
            }

            frameHandle = video.requestVideoFrameCallback(onFrame);
          };

          frameHandle = video.requestVideoFrameCallback(onFrame);
        };

        const timer = setTimeout(finish, 9000);

        video.preload = 'auto';
        video.muted = true;
        video.playsInline = true;
        video.addEventListener('loadedmetadata', () => {
          result.width = Number(video.videoWidth || 0);
          result.height = Number(video.videoHeight || 0);
          result.duration = Number.isFinite(video.duration) ? Number(video.duration) : 0;
          estimateFps();
        }, { once: true });
        video.addEventListener('error', finish, { once: true });
        video.src = url;
      });
    }

    async function checkTikTokVideo() {
      const rawUrl = tiktokUrlInput.value.trim();

      tiktokStatus.classList.remove('error');
      tiktokResults.hidden = true;
      tiktokOpen.hidden = true;

      if (!rawUrl) {
        tiktokStatus.textContent = 'Paste a TikTok video link first.';
        tiktokStatus.classList.add('error');
        return;
      }

      if (!isTikTokUrl(rawUrl)) {
        tiktokStatus.textContent = 'That does not look like a TikTok link.';
        tiktokStatus.classList.add('error');
        return;
      }

      tiktokCheckButton.disabled = true;
      tiktokStatus.textContent = 'Reading TikTok video info…';

      try {
        const data = await fetchTikTokInfo(rawUrl);
        if (!data) throw new Error('Could not read this TikTok video. It may be private, unavailable, or rate-limited.');

        const rawAuthor = data.author;
        const username = rawAuthor && typeof rawAuthor === 'object'
          ? (rawAuthor.unique_id || rawAuthor.uniqueId || '')
          : String(rawAuthor || '').replace(/^@/, '');
        const nickname = rawAuthor && typeof rawAuthor === 'object'
          ? (rawAuthor.nickname || '')
          : '';

        const stream = chooseTikTokStream(data);
        const apiWidth = Number(data.width || data.video_width || data.videoWidth || 0);
        const apiHeight = Number(data.height || data.video_height || data.videoHeight || 0);
        const apiDuration = Number(data.duration || data.video_duration || data.videoDuration || 0);
        const apiFps = Number(data.fps || data.video_fps || data.videoFps || 0);
        const apiCodec = normalizeCodec(data.codec || data.video_codec || data.videoCodec);

        tiktokStatus.textContent = 'Stats loaded. Inspecting video quality…';

        const [media, byteInfo] = await Promise.all([
          inspectVideoStream(stream.url),
          inspectStreamBytes(stream.url, stream.size)
        ]);

        const width = apiWidth || byteInfo.width || media.width;
        const height = apiHeight || byteInfo.height || media.height;
        const duration = apiDuration || media.duration;
        const fps = apiFps || byteInfo.fps || media.fps;
        const codec = apiCodec || byteInfo.codec;
        const fileSize = stream.size || byteInfo.size;
        const bitrateMbps = fileSize && duration ? (fileSize * 8 / duration / 1000000) : 0;

        tiktokAuthorName.textContent = nickname || username || 'Unknown';
        tiktokAuthorHandle.textContent = username ? '@' + username : '';
        tiktokTitle.textContent = data.title || 'Untitled TikTok';
        tiktokDate.textContent = formatTikTokDate(data.create_time || data.createTime);
        tiktokDuration.textContent = formatTikTokDuration(duration);
        tiktokViews.textContent = formatTikTokCount(data.play_count || data.playCount);
        tiktokLikes.textContent = formatTikTokCount(data.digg_count || data.diggCount);
        tiktokComments.textContent = formatTikTokCount(data.comment_count || data.commentCount);
        tiktokShares.textContent = formatTikTokCount(data.share_count || data.shareCount);

        tiktokResolution.textContent = width && height
          ? width + ' × ' + height
          : 'Unavailable';

        const qualityLabel = width && height ? Math.min(width, height) + 'p' : 'Resolution unavailable';
        const fpsLabel = fps ? Math.round(fps) + ' FPS' : 'FPS unavailable';
        tiktokQualityMain.textContent = qualityLabel + ' · ' + fpsLabel;

        const codecLabel = codec || 'Codec unavailable';
        const bitrateLabel = bitrateMbps ? bitrateMbps.toFixed(bitrateMbps >= 10 ? 1 : 2) + ' Mbps' : 'Bitrate unavailable';
        const sizeLabel = formatMediaBytes(fileSize) || 'Size unavailable';
        tiktokQualityTech.textContent = codecLabel + ' · ' + bitrateLabel + ' · ' + sizeLabel;

        const videoId = data.id || data.video_id || '';
        tiktokVideoId.textContent = videoId || 'Unavailable';

        const canonicalUrl = username && videoId
          ? 'https://www.tiktok.com/@' + username + '/video/' + videoId
          : rawUrl;

        tiktokOpen.href = canonicalUrl;
        tiktokOpen.hidden = false;
        tiktokResults.hidden = false;
        tiktokStatus.textContent = 'Video analytics loaded.';
      } catch (error) {
        tiktokStatus.classList.add('error');
        tiktokStatus.textContent = error instanceof Error ? error.message : 'TikTok check failed.';
      } finally {
        tiktokCheckButton.disabled = false;
      }
    }

    const tiktokDownloadLink = document.getElementById('tiktok-download-link');
    tiktokDownloadLink.addEventListener('click', () => {
      const input = tiktokUrlInput.value.trim();
      tiktokDownloadLink.href = isTikTokUrl(input)
        ? '/tiktok-downloader.html?url=' + encodeURIComponent(input)
        : '/tiktok-downloader.html';
    });
    tiktokCheckButton.addEventListener('click', checkTikTokVideo);
    tiktokUrlInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') checkTikTokVideo();
    });
