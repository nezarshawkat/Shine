const crypto = require("crypto");
const multer = require("multer");
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

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for media uploads.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

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

async function uploadBufferToSupabase(file, type) {
  if (!file) {
    const error = new Error("A file is required.");
    error.statusCode = 400;
    throw error;
  }

  const storagePath = buildStoragePath(type, file.originalname);
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
  SUPABASE_BUCKET,
  uploadFolderByType,
  memoryUpload,
  uploadBufferToSupabase,
  uploadFilesToSupabase,
};
