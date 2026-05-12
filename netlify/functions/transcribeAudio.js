import Busboy from "busboy";
import OpenAI, { toFile } from "openai";
import { Readable } from "node:stream";

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
];

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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

function parseMultipartForm(event) {
  return new Promise((resolve, reject) => {
    const contentType = getHeader(event, "content-type");

    if (!contentType) {
      reject(new Error("Content-Type mancante"));
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
          filename: info.filename,
          mimeType: info.mimeType,
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

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: "Metodo non consentito",
      }),
    };
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "OPENAI_API_KEY mancante nelle variabili ambiente",
        }),
      };
    }

    const file = await parseMultipartForm(event);

    if (!file) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Nessun file audio ricevuto",
        }),
      };
    }

    if (!hasSupportedExtension(file.filename)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "Formato audio non supportato. Usa mp3, mp4, mpeg, mpga, m4a, wav o webm.",
        }),
      };
    }

    if (file.buffer.length > MAX_FILE_SIZE_BYTES) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `File troppo grande. Per questa MVP usa audio massimo di ${MAX_FILE_SIZE_MB} MB.`,
        }),
      };
    }

    const openaiFile = await toFile(file.buffer, file.filename, {
      type: file.mimeType,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: openaiFile,
      model: "whisper-1",
      language: "it",
      response_format: "json",
    });

    const text = transcription.text?.trim();

    if (!text) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Trascrizione vuota",
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        text,
        filename: file.filename,
      }),
    };
  } catch (error) {
    console.error("Errore transcribeAudio:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore durante la trascrizione audio",
      }),
    };
  }
}
