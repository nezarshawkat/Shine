const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "data", "seed_profiles.csv");

const ANON_PERSONAS = [
  "civic_observer",
  "policy_reader",
  "atlas_voice",
  "public_square",
  "quiet_voter",
  "source_checker",
  "city_listener",
  "global_notes",
  "open_forum",
  "daily_context",
];

const FEMALE_FIRST_NAMES = new Set([
  "abigail", "addison", "agnieszka", "alessa", "alexa", "allison", "amelia", "amelie", "amelie", "amina", "anna", "anouk",
  "ariana", "aurora", "autumn", "avery", "barbara", "bella", "brooklyn", "camila", "caroline", "charlotte", "chloe",
  "claire", "clara", "celine", "dalal", "dana", "dina", "elena", "eleanor", "eliana", "elin", "elisa", "elizabeth",
  "ella", "emilia", "emilie", "emily", "emma", "eva", "evelyn", "everly", "faith", "farah", "freja", "genesis",
  "ghada", "grace", "greta", "hailey", "hanna", "hannah", "harper", "hazel", "heba", "helene", "huda", "ines",
  "isabella", "isabelle", "juliana", "katarina", "kaylee", "kennedy", "layla", "leah", "lillian", "lina", "lucia",
  "lucy", "lulwa", "lydia", "mackenzie", "madeline", "madelyn", "maja", "mari", "mariam", "maya", "mia", "mona",
  "morgan", "nadine", "nevaeh", "noha", "nora", "nour", "olivia", "paisley", "penelope", "piper", "rania", "reagan",
  "reem", "riley", "ruby", "ruba", "sadie", "salma", "samantha", "sara", "savannah", "scarlett", "serenity",
  "shaikha", "simona", "skylar", "sofia", "sophia", "sophie", "stella", "taylor", "valeria", "victoria", "violet",
  "yasmin", "zainab", "zoey", "zsofia",
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cleanUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_.]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => String(value || "").trim()));
}

function oldAnonymousUsername(index) {
  const number = String(index + 1).padStart(3, "0");
  const persona = ANON_PERSONAS[index % ANON_PERSONAS.length];
  return `${persona}_${number}`;
}

function regionForIndex(index) {
  const number = index + 1;
  if (number <= 80) return "us";
  if (number <= 115) return "eu";
  if (number <= 150) return "me";
  if (number <= 210) return "us";
  if (number <= 230) return "eu";
  return "me";
}

function genderForName(name) {
  const first = normalize(name).split(/\s+/)[0].replace(/^dr\.?$/, "");
  return FEMALE_FIRST_NAMES.has(first) ? "female" : "male";
}

function portrait(gender, index, region) {
  const folder = gender === "female" ? "women" : "men";
  const offset = region === "me" ? 41 : region === "eu" ? 23 : 3;
  const number = (index * 7 + offset) % 100;
  return `https://randomuser.me/api/portraits/${folder}/${number}.jpg`;
}

function loadProfiles() {
  const csv = fs.readFileSync(CSV_PATH, "utf8");
  const [, ...rows] = parseCsv(csv);
  return rows.slice(0, 250).map((row, index) => {
    const name = String(row[1] || "").trim();
    const username = cleanUsername(row[2]);
    const description = String(row[3] || "").trim();
    const gender = genderForName(name);
    const region = regionForIndex(index);
    return {
      name,
      username,
      previousUsername: oldAnonymousUsername(index),
      description,
      image: portrait(gender, index, region),
      gender,
      region,
    };
  });
}

const SEEDED_PROFILES = loadProfiles();
const SEEDED_PROFILE_IMAGES = Object.fromEntries(SEEDED_PROFILES.map((profile) => [profile.username, profile.image]));
const SEEDED_PROFILE_BY_USERNAME = Object.fromEntries(SEEDED_PROFILES.map((profile) => [profile.username, profile]));
const GUEST_PROFILE_IMAGE = "/uploads/profileDefault.svg";

module.exports = { SEEDED_PROFILES, SEEDED_PROFILE_IMAGES, SEEDED_PROFILE_BY_USERNAME, GUEST_PROFILE_IMAGE };
