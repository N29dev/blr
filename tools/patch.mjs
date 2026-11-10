// The CompressBase Quality + FPS Method is temporarily unavailable (2026-11-10).
// Keep this module inert until the provider confirms that patching works again.
// The site no longer loads it; this also disables the action on older cached pages
// that still reference the module and fetch the updated source.
const patchButton = document.getElementById('patch-button');
if (patchButton) {
  patchButton.disabled = true;
  patchButton.textContent = 'Method unavailable';
}
const patchStatus = document.getElementById('patch-status');
if (patchStatus) patchStatus.textContent = 'Quality + FPS Method is temporarily unavailable.';
