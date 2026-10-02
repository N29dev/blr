const FFMessageType = {
  LOAD: "LOAD",
  EXEC: "EXEC",
  FFPROBE: "FFPROBE",
  WRITE_FILE: "WRITE_FILE",
  READ_FILE: "READ_FILE",
  DELETE_FILE: "DELETE_FILE",
  RENAME: "RENAME",
  CREATE_DIR: "CREATE_DIR",
  LIST_DIR: "LIST_DIR",
  DELETE_DIR: "DELETE_DIR",
  ERROR: "ERROR",
  DOWNLOAD: "DOWNLOAD",
  PROGRESS: "PROGRESS",
  LOG: "LOG",
  MOUNT: "MOUNT",
  UNMOUNT: "UNMOUNT"
};

let ffmpeg;

async function load({ coreURL, wasmURL, workerURL }) {
  const first = !ffmpeg;
  if (!coreURL) {
    coreURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js";
  }

  const imported = await import(coreURL);
  self.createFFmpegCore = imported.default;
  if (!self.createFFmpegCore) throw new Error("failed to import ffmpeg-core.js");

  wasmURL = wasmURL || coreURL.replace(/\.js$/g, ".wasm");
  workerURL = workerURL || coreURL.replace(/\.js$/g, ".worker.js");

  ffmpeg = await self.createFFmpegCore({
    mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL }))}`
  });

  ffmpeg.setLogger(data => self.postMessage({ type: FFMessageType.LOG, data }));
  ffmpeg.setProgress(data => self.postMessage({ type: FFMessageType.PROGRESS, data }));
  return first;
}

function exec({ args, timeout = -1 }) {
  ffmpeg.setTimeout(timeout);
  ffmpeg.exec(...args);
  const ret = ffmpeg.ret;
  ffmpeg.reset();
  return ret;
}

function ffprobe({ args, timeout = -1 }) {
  ffmpeg.setTimeout(timeout);
  ffmpeg.ffprobe(...args);
  const ret = ffmpeg.ret;
  ffmpeg.reset();
  return ret;
}

function writeFile({ path, data }) {
  ffmpeg.FS.writeFile(path, data);
  return true;
}

function readFile({ path, encoding }) {
  return ffmpeg.FS.readFile(path, { encoding });
}

function deleteFile({ path }) {
  try { ffmpeg.FS.unlink(path); } catch {}
  return true;
}

function rename({ oldPath, newPath }) {
  ffmpeg.FS.rename(oldPath, newPath);
  return true;
}

function createDir({ path }) {
  ffmpeg.FS.mkdir(path);
  return true;
}

function listDir({ path }) {
  return ffmpeg.FS.readdir(path).map(name => {
    const stat = ffmpeg.FS.stat(`${path}/${name}`);
    return { name, isDir: ffmpeg.FS.isDir(stat.mode) };
  });
}

function deleteDir({ path }) {
  ffmpeg.FS.rmdir(path);
  return true;
}

self.onmessage = async ({ data: { id, type, data } }) => {
  const transfers = [];
  try {
    if (type !== FFMessageType.LOAD && !ffmpeg) throw new Error("ffmpeg is not loaded");

    let result;
    switch (type) {
      case FFMessageType.LOAD:
        result = await load(data);
        break;
      case FFMessageType.EXEC:
        result = exec(data);
        break;
      case FFMessageType.FFPROBE:
        result = ffprobe(data);
        break;
      case FFMessageType.WRITE_FILE:
        result = writeFile(data);
        break;
      case FFMessageType.READ_FILE:
        result = readFile(data);
        break;
      case FFMessageType.DELETE_FILE:
        result = deleteFile(data);
        break;
      case FFMessageType.RENAME:
        result = rename(data);
        break;
      case FFMessageType.CREATE_DIR:
        result = createDir(data);
        break;
      case FFMessageType.LIST_DIR:
        result = listDir(data);
        break;
      case FFMessageType.DELETE_DIR:
        result = deleteDir(data);
        break;
      default:
        throw new Error("unknown message type");
    }

    if (result instanceof Uint8Array) transfers.push(result.buffer);
    self.postMessage({ id, type, data: result }, transfers);
  } catch (error) {
    self.postMessage({
      id,
      type: FFMessageType.ERROR,
      data: error instanceof Error ? error.toString() : String(error)
    });
  }
};
