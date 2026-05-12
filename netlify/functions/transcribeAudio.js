import Busboy from "busboy";
import OpenAI, { toFile } from "openai";
import ffmpegStaticPath from "ffmpeg-static";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SUPPORTED_EXTENSIONS = [
  ".mp3",
  ".mp4",
  ".mpeg",
  ".mpga",
  ".m4a",
  ".wav",
  ".webm",
  ".ogg",
  ".opus",
];

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}

function getHeader(event, name) {
  const target = name.toLowerCase();

  const foundKey = Object.keys(event.headers || {}).find(
    (key) => key.toLowerCase() === target,
  );

  return foundKey ? event.headers[foundKey] : "";
}

function hasSupportedExtension(filename = "") {
  const lowerFilename = filename.toLowerCase();

  return SUPPORTED_EXTENSIONS.some((extension) =>
    lowerFilename.endsWith(extension),
  );
}

function sanitizeFilename(filename = "audio") {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFfmpegPath() {
  const candidates = [
    ffmpegStaticPath,

    // Windows local dev
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),

    // Mac/Linux local dev
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),

    // Fallback Netlify local serve possible path
    path.join(
      process.cwd(),
      ".netlify",
      "functions-serve",
      "transcribeAudio",
      "node_modules",
      "ffmpeg-static",
      "ffmpeg.exe",
    ),
    path.join(
      process.cwd(),
      ".netlify",
      "functions-serve",
      "transcribeAudio",
      "node_modules",
      "ffmpeg-static",
      "ffmpeg",
    ),
  ];

  const validPath = candidates.find((candidate) => {
    return candidate && existsSync(candidate);
  });

  return validPath || "";
}

function parseMultipartForm(event) {
  return new Promise((resolve, reject) => {
    const contentType = getHeader(event, "content-type");

    if (!contentType) {
      reject(new Error("Content-Type mancante nella richiesta audio."));
      return;
    }

    const busboy = Busboy({
      headers: {
        "content-type": contentType,
      },
    });

    let uploadedFile = null;

    busboy.on("file", (fieldname, file, info) => {
      const chunks = [];

      file.on("data", (data) => {
        chunks.push(data);
      });

      file.on("end", () => {
        uploadedFile = {
          fieldname,
          filename: info.filename || "audio",
          mimeType: info.mimeType || "application/octet-stream",
          buffer: Buffer.concat(chunks),
        };
      });
    });

    busboy.on("error", reject);

    busboy.on("finish", () => {
      resolve(uploadedFile);
    });

    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "");

    Readable.from(bodyBuffer).pipe(busboy);
  });
}

function convertAudioToMp3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const resolvedFfmpegPath = getFfmpegPath();

    if (!resolvedFfmpegPath || !existsSync(resolvedFfmpegPath)) {
      reject(
        new Error(
          `ffmpeg-static non disponibile. Path trovato: ${
            resolvedFfmpegPath || "nessuno"
          }. Prova a eseguire npm install ffmpeg-static e riavvia netlify dev.`,
        ),
      );
      return;
    }

    const ffmpeg = spawn(resolvedFfmpegPath, [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-ar",
      "16000",
      "-ac",
      "1",
      "-b:a",
      "96k",
      outputPath,
    ]);

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("error", (error) => {
      reject(new Error(`ffmpeg non è partito: ${error.message}`));
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `ffmpeg ha fallito con codice ${code}. Dettaglio: ${stderr.slice(
            -1200,
          )}`,
        ),
      );
    });
  });
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, {
      error: "Metodo non consentito",
    });
  }

  let inputPath = "";
  let outputPath = "";

  try {
    if (!process.env.OPENAI_API_KEY) {
      return jsonResponse(500, {
        error:
          "OPENAI_API_KEY mancante. Aggiungila nel file .env e riavvia netlify dev.",
      });
    }

    const resolvedFfmpegPath = getFfmpegPath();

    if (!resolvedFfmpegPath || !existsSync(resolvedFfmpegPath)) {
      return jsonResponse(500, {
        error: `ffmpeg-static non trovato. Path tentato: ${
          resolvedFfmpegPath || "nessuno"
        }. Esegui npm install ffmpeg-static e riavvia netlify dev.`,
      });
    }

    const file = await parseMultipartForm(event);

    if (!file) {
      return jsonResponse(400, {
        error: "Nessun file audio ricevuto dalla function.",
      });
    }

    console.log("AUDIO RICEVUTO:", {
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.buffer.length,
      ffmpegPath: resolvedFfmpegPath,
      hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    });

    if (!hasSupportedExtension(file.filename)) {
      return jsonResponse(400, {
        error:
          "Formato audio non supportato. Usa mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg o opus.",
      });
    }

    if (file.buffer.length > MAX_FILE_SIZE_BYTES) {
      return jsonResponse(400, {
        error: `File troppo grande. Per questa MVP usa audio massimo di ${MAX_FILE_SIZE_MB} MB.`,
      });
    }

    const safeFilename = sanitizeFilename(file.filename);
    const timestamp = Date.now();

    inputPath = path.join(os.tmpdir(), `${timestamp}-${safeFilename}`);
    outputPath = path.join(os.tmpdir(), `${timestamp}-converted.mp3`);

    await fs.writeFile(inputPath, file.buffer);

    console.log("CONVERSIONE AUDIO START:", {
      inputPath,
      outputPath,
    });

    await convertAudioToMp3(inputPath, outputPath);

    const convertedBuffer = await fs.readFile(outputPath);

    console.log("CONVERSIONE AUDIO OK:", {
      convertedSize: convertedBuffer.length,
    });

    const openaiFile = await toFile(convertedBuffer, "converted-audio.mp3", {
      type: "audio/mpeg",
    });

    console.log("OPENAI TRANSCRIPTION START");

    const transcription = await openai.audio.transcriptions.create({
      file: openaiFile,
      model: "whisper-1",
      language: "it",
      response_format: "json",
    });

    const text = transcription.text?.trim();

    if (!text) {
      return jsonResponse(500, {
        error: "Trascrizione vuota ricevuta da OpenAI.",
      });
    }

    console.log("OPENAI TRANSCRIPTION OK");

    return jsonResponse(200, {
      text,
      filename: file.filename,
    });
  } catch (error) {
    console.error("ERRORE TRANSCRIBE AUDIO:", error);

    return jsonResponse(500, {
      error: error.message || "Errore durante la trascrizione audio.",
    });
  } finally {
    try {
      if (inputPath) {
        await fs.unlink(inputPath);
      }

      if (outputPath) {
        await fs.unlink(outputPath);
      }
    } catch {
      // cleanup silenzioso
    }
  }
}
