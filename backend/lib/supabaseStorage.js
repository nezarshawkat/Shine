const crypto = require("crypto");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_BUCKET = "shine-media";
const uploadFolderByType = Object.freeze({
  profile: "profiles",
  post: "posts",
  community: "communities",
  event: "events",
  article: "articles",
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LOCAL_UPLOAD_ROOT =
  process.env.LOCAL_UPLOAD_DIR || path.join(__dirname, "..", "public", "uploads");

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

function getExtension(originalName = "") {
  const index = originalName.lastIndexOf(".");
  return index >= 0 ? originalName.slice(index) : "";
}

function sanitizeFileName(name = "file") {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file"
  );
}

function resolveUploadFolder(type) {
  const folder = uploadFolderByType[type];

  if (!folder) {
    const error = new Error(`Invalid upload type: ${type}`);
    error.statusCode = 400;
    throw error;
  }

  return folder;
}

function buildStoragePath(type, originalName) {
  const folder = resolveUploadFolder(type);
  const extension = getExtension(originalName);
  const baseName = sanitizeFileName(originalName);
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${baseName}${extension}`;

  return `${folder}/${uniqueName}`;
}

function getBackendBaseUrl() {
  return (
    process.env.PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    ""
  ).replace(/\/$/, "");
}

function buildLocalUploadUrl(storagePath) {
  const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
  const backendBaseUrl = getBackendBaseUrl();
  return `${backendBaseUrl}/uploads/${encodedPath}`;
}

async function uploadBufferToLocalDisk(file, storagePath) {
  const destination = path.join(LOCAL_UPLOAD_ROOT, storagePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  await fs.promises.writeFile(destination, file.buffer);
  return {
    path: storagePath,
    url: buildLocalUploadUrl(storagePath),
  };
}

async function uploadBufferToSupabase(file, type) {
  if (!file) {
    const error = new Error("A file is required.");
    error.statusCode = 400;
    throw error;
  }

  const storagePath = buildStoragePath(type, file.originalname);

  if (!supabase) {
    return uploadBufferToLocalDisk(file, storagePath);
  }

  const { error: uploadError } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Supabase upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);

  if (!data?.publicUrl) {
    throw new Error("Failed to generate a public URL for the uploaded media.");
  }

  return {
    path: storagePath,
    url: data.publicUrl,
  };
}

async function uploadFilesToSupabase(files = [], type) {
  return Promise.all(files.map((file) => uploadBufferToSupabase(file, type)));
}

module.exports = {
  LOCAL_UPLOAD_ROOT,
  SUPABASE_BUCKET,
  uploadFolderByType,
  memoryUpload,
  uploadBufferToSupabase,
  uploadFilesToSupabase,
};
