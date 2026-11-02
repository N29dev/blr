import { patchVideo } from 'https://compressbase.com/method-api/client.mjs';

    const patchInput = document.getElementById('patch-video');
    const patchPostingDevice = document.getElementById('posting-device');
    const patchButton = document.getElementById('patch-button');
    const patchDownload = document.getElementById('patch-download');
    const patchStatus = document.getElementById('patch-status');
    const patchFileInfo = document.getElementById('patch-file-info');

    let patchedObjectUrl = null;

    function patchFormatBytes(bytes) {
      const units = ['B', 'KiB', 'MiB', 'GiB'];
      let value = bytes;
      let unit = 0;
      while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
      }
      return (unit === 0 ? value : value.toFixed(value >= 10 ? 1 : 2)) + ' ' + units[unit];
    }

    function clearPatchedDownload() {
      patchDownload.hidden = true;
      patchDownload.removeAttribute('href');
      if (patchedObjectUrl) {
        URL.revokeObjectURL(patchedObjectUrl);
        patchedObjectUrl = null;
      }
    }

    patchInput.addEventListener('change', () => {
      clearPatchedDownload();
      patchStatus.textContent = '';
      patchStatus.classList.remove('error');

      const file = patchInput.files[0];
      patchFileInfo.textContent = file
        ? file.name + ' · ' + patchFormatBytes(file.size)
        : 'MP4 only · up to 8 GiB';
    });

    patchPostingDevice.addEventListener('change', () => {
      clearPatchedDownload();
      patchStatus.textContent = '';
      patchStatus.classList.remove('error');
    });

    patchButton.addEventListener('click', async () => {
      const file = patchInput.files[0];
      if (!file) {
        patchStatus.textContent = 'Choose an MP4 first.';
        patchStatus.classList.add('error');
        return;
      }

      const postingDevice = patchPostingDevice.value;
      if (!postingDevice) {
        patchStatus.textContent = 'Choose a variant first.';
        patchStatus.classList.add('error');
        return;
      }

      patchButton.disabled = true;
      patchPostingDevice.disabled = true;
      patchInput.disabled = true;
      clearPatchedDownload();
      patchStatus.classList.remove('error');
      patchStatus.textContent = 'Patching metadata…';

      try {
        const output = await patchVideo(file, {
          postingDevice,
          signal: AbortSignal.timeout(180000),
          onStatus: message => {
            patchStatus.textContent = message;
          }
        });

        patchedObjectUrl = URL.createObjectURL(output);
        patchDownload.href = patchedObjectUrl;
        patchDownload.download = file.name.replace(/\.mp4$/i, '') + '_patched.mp4';
        patchDownload.hidden = false;
        patchStatus.textContent = 'Ready. Your video stayed on this device.';
      } catch (error) {
        patchStatus.classList.add('error');
        patchStatus.textContent = error instanceof Error ? error.message : 'Patch failed.';
      } finally {
        patchButton.disabled = false;
        patchPostingDevice.disabled = false;
        patchInput.disabled = false;
      }
    });

    window.addEventListener('pagehide', () => {
      if (patchedObjectUrl) URL.revokeObjectURL(patchedObjectUrl);
    });
