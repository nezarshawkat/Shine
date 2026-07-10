// Static one-time seed profiles plus deterministic regional profiles.
// These accounts are visible seeded users; engagement should use this pool only.

const BASE_PROFILES = [
  { name: 'Marcus Vance', username: 'marcus_v', description: 'Cloud architect.', image: 'https://randomuser.me/api/portraits/men/11.jpg', gender: 'male', region: 'us' },
  { name: 'Chloe Bird', username: 'chloebirdie', description: 'Weekends, coffee, and city walks.', image: 'https://randomuser.me/api/portraits/women/11.jpg', gender: 'female', region: 'us' },
  { name: 'Linda Miller', username: 'lindamiller1962', description: 'Proud grandma and local volunteer.', image: 'https://randomuser.me/api/portraits/women/62.jpg', gender: 'female', region: 'us' },
  { name: 'Jaxon Reed', username: 'xx_jaxon_xx', description: 'Streaming, lifting, and late-night politics.', image: 'https://randomuser.me/api/portraits/men/12.jpg', gender: 'male', region: 'us' },
  { name: 'Sarah Taylor', username: 'sarah_explores', description: 'NYC to Tokyo, always reading the room.', image: 'https://randomuser.me/api/portraits/women/12.jpg', gender: 'female', region: 'us' },
  { name: 'Dave Parker', username: 'dave', description: 'Just here.', image: 'https://randomuser.me/api/portraits/men/13.jpg', gender: 'male', region: 'us' },
  { name: 'Dr. Alan Grant', username: 'agrant_phd', description: 'Researcher, lecturer, history obsessive.', image: 'https://randomuser.me/api/portraits/men/63.jpg', gender: 'male', region: 'us' },
  { name: 'Mia Torres', username: 'mia_wants_sleep', description: 'Tired nursing student.', image: 'https://randomuser.me/api/portraits/women/13.jpg', gender: 'female', region: 'us' },
  { name: 'Bryan Cole', username: 'BRYANGYMBRO', description: 'Gym, meal prep, and blunt opinions.', image: 'https://randomuser.me/api/portraits/men/14.jpg', gender: 'male', region: 'us' },
  { name: 'Ellie Brooks', username: 'ellie_reads', description: 'Books, cafes, and foreign affairs podcasts.', image: 'https://randomuser.me/api/portraits/women/14.jpg', gender: 'female', region: 'us' },
  { name: 'Tyler Smith', username: 'tsmith_invest', description: 'Value investing and markets.', image: 'https://randomuser.me/api/portraits/men/15.jpg', gender: 'male', region: 'us' },
  { name: 'Alice Ward', username: 'alice_in_w', description: 'Soft vibes, hard questions.', image: 'https://randomuser.me/api/portraits/women/15.jpg', gender: 'female', region: 'us' },
  { name: 'Robert Jenkins', username: 'robert_j_55', description: 'Retired teacher. Go Packers.', image: 'https://randomuser.me/api/portraits/men/64.jpg', gender: 'male', region: 'us' },
  { name: 'Nico Vale', username: 'vamp_kid', description: 'Music, night shifts, and bad headlines.', image: 'https://randomuser.me/api/portraits/men/16.jpg', gender: 'male', region: 'us' },
  { name: 'Chef Mateo', username: 'mateocooks', description: 'Head chef. Food is politics too.', image: 'https://randomuser.me/api/portraits/men/17.jpg', gender: 'male', region: 'us' },
  { name: 'Samantha Ray', username: 'sammy_sunshine', description: 'Trying to stay optimistic.', image: 'https://randomuser.me/api/portraits/women/16.jpg', gender: 'female', region: 'us' },
  { name: 'Eli Harper', username: 'user489102', description: 'Mostly reading, sometimes posting.', image: 'https://randomuser.me/api/portraits/men/18.jpg', gender: 'male', region: 'us' },
  { name: 'Priya Patel', username: 'priyadesigns', description: 'UX designer and policy watcher.', image: 'https://randomuser.me/api/portraits/women/17.jpg', gender: 'female', region: 'us' },
  { name: 'Jay Carter', username: 'jay_no_cap', description: 'Everything is expensive.', image: 'https://randomuser.me/api/portraits/men/19.jpg', gender: 'male', region: 'us' },
  { name: 'Evelyn Rose', username: 'evelyn_gardens', description: 'Garden, climate, local councils.', image: 'https://randomuser.me/api/portraits/women/18.jpg', gender: 'female', region: 'us' },
  { name: 'The Daily Tech', username: 'dailytechnews', description: 'Tech, AI, chips, and regulation.', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=300&q=80', gender: 'neutral', region: 'us' },
  { name: 'Mike Donovan', username: 'mike_drops', description: 'Aspiring comic. Serious when needed.', image: 'https://randomuser.me/api/portraits/men/21.jpg', gender: 'male', region: 'us' },
  { name: 'Sophia Lee', username: 'sophia_study', description: 'Med school journey and public health.', image: 'https://randomuser.me/api/portraits/women/19.jpg', gender: 'female', region: 'us' },
  { name: 'Tony Russo', username: 'tony_pizza', description: 'Best Jersey pizza. Worst taxes.', image: 'https://randomuser.me/api/portraits/men/22.jpg', gender: 'male', region: 'us' },
  { name: 'Natalie Quinn', username: 'nat_nat_nat', description: 'Corporate life, subway notes, policy takes.', image: 'https://randomuser.me/api/portraits/women/20.jpg', gender: 'female', region: 'us' },
  { name: 'Kevin Hughes', username: 'kevinh_writer', description: 'Freelance journalist.', image: 'https://randomuser.me/api/portraits/men/23.jpg', gender: 'male', region: 'us' },
  { name: 'Zack Riley', username: 'zack_attack', description: 'Meme collector, local news addict.', image: 'https://randomuser.me/api/portraits/men/24.jpg', gender: 'male', region: 'us' },
  { name: 'Amanda Brooks', username: 'amanda_runs', description: 'Runner. City planning nerd.', image: 'https://randomuser.me/api/portraits/women/21.jpg', gender: 'female', region: 'us' },
  { name: 'Noah Black', username: 'void_gazer', description: 'Nothing matters, except good sources.', image: 'https://randomuser.me/api/portraits/men/25.jpg', gender: 'male', region: 'us' },
  { name: 'Emily Hart', username: 'em_bakes_cakes', description: 'Baking messes and election maps.', image: 'https://randomuser.me/api/portraits/women/22.jpg', gender: 'female', region: 'us' },
  { name: 'Greg Turner', username: 'greg_t_garage', description: 'Old cars, local radio, defense news.', image: 'https://randomuser.me/api/portraits/men/26.jpg', gender: 'male', region: 'us' },
  { name: 'Lola James', username: 'lolalolalola', description: 'Retail worker with too many tabs open.', image: 'https://randomuser.me/api/portraits/women/23.jpg', gender: 'female', region: 'us' },
  { name: 'Prof. Wright', username: 'profwright_history', description: 'History professor.', image: 'https://randomuser.me/api/portraits/men/65.jpg', gender: 'male', region: 'us' },
  { name: 'Ash Morgan', username: 'ash_ketchum_ir', description: 'IR student. Too online.', image: 'https://randomuser.me/api/portraits/men/27.jpg', gender: 'male', region: 'us' },
  { name: 'Brenda Walsh', username: 'brendas_boutique', description: 'Small business owner.', image: 'https://randomuser.me/api/portraits/women/64.jpg', gender: 'female', region: 'us' },
  { name: 'Noah Voss', username: 'noah_vfx', description: '3D motion graphics and security threads.', image: 'https://randomuser.me/api/portraits/men/28.jpg', gender: 'male', region: 'us' },
  { name: 'Lily Park', username: 'lily_cosplay', description: 'Prop maker, organizer, peace activist.', image: 'https://randomuser.me/api/portraits/women/24.jpg', gender: 'female', region: 'us' },
  { name: 'Frank Ellis', username: 'frankie_fishing', description: 'Gone fishing, still reading the news.', image: 'https://randomuser.me/api/portraits/men/66.jpg', gender: 'male', region: 'us' },
  { name: 'Tasha Monroe', username: 'tasha_manifests', description: 'Spiritual but practical about policy.', image: 'https://randomuser.me/api/portraits/women/25.jpg', gender: 'female', region: 'us' },
  { name: 'Chris Nolan', username: 'chris_chilling', description: 'Just vibing through history.', image: 'https://randomuser.me/api/portraits/men/29.jpg', gender: 'male', region: 'us' },
  { name: 'Dr. Patel', username: 'dr_patel_vet', description: 'Veterinarian and public health voter.', image: 'https://randomuser.me/api/portraits/men/67.jpg', gender: 'male', region: 'us' },
  { name: 'Jess Vale', username: 'gossip_grl', description: 'Culture, media, and soft power.', image: 'https://randomuser.me/api/portraits/women/26.jpg', gender: 'female', region: 'us' },
  { name: 'William Cole', username: 'william_creates', description: 'Custom woodworking. Local politics.', image: 'https://randomuser.me/api/portraits/men/30.jpg', gender: 'male', region: 'us' },
  { name: 'Jess Tanaka', username: 'jess_in_japan', description: 'Expat in Tokyo.', image: 'https://randomuser.me/api/portraits/women/27.jpg', gender: 'female', region: 'us' },
  { name: 'Mark Evans', username: 'mark_marketing', description: 'SaaS growth marketer.', image: 'https://randomuser.me/api/portraits/men/31.jpg', gender: 'male', region: 'us' },
  { name: 'Ray Morgan', username: 'ray_of_sunshine', description: 'Optimistic nihilist.', image: 'https://randomuser.me/api/portraits/men/32.jpg', gender: 'male', region: 'us' },
  { name: 'Susan Blake', username: 'susan_wine_time', description: 'Wine time and municipal budgets.', image: 'https://randomuser.me/api/portraits/women/65.jpg', gender: 'female', region: 'us' },
  { name: 'Alex Archer', username: 'alex_the_archer', description: 'Traditional archery and maps.', image: 'https://randomuser.me/api/portraits/men/33.jpg', gender: 'male', region: 'us' },
  { name: 'Ben Random', username: 'b_random', description: 'Pressing buttons.', image: 'https://randomuser.me/api/portraits/men/34.jpg', gender: 'male', region: 'us' },
  { name: 'Victor Miles', username: 'victor_music', description: 'Indie artist. Defense budget skeptic.', image: 'https://randomuser.me/api/portraits/men/35.jpg', gender: 'male', region: 'us' },
];

const GROUPS = {
  us: {
    count: 100,
    men: ['Ethan Carter','Logan Brooks','Caleb Hayes','Mason Reed','Owen Parker','Connor Price','Luke Bennett','Ryan Cooper','Austin Hayes','Dylan Walsh','Jack Mercer','Henry Ford','Cameron Scott','Nolan Fisher','Wyatt Reed','Brandon King','Trevor Pike','Miles Hunter','Grant Miller','Leo Stone','Adam Pierce','Julian West','Cole Hudson','Blake Turner','Nathan Shaw','Derek White','Max Ortega','Jordan Lee','Evan Brooks','Garrett Lane','Brad King','Cody Ellis','Shane Walker','Tyson Bell','Peter Walsh','Sam Rivera','Daniel Stein','Victor Reyes','Alex Rivera','John Mercer','Dave Miller','Mike Dawson','Marcus Hale','Theo Carter','Leo Fischer','Ben Turner','Adrian Fox','Noah Grant','Ryan Cole','John Walker'],
    women: ['Rachel Brooks','Grace Miller','Kayla Sun','Sophie Turner','Claire Adams','Hannah Brooks','Olivia Green','Avery Collins','Megan Price','Lauren Bell','Samantha Miles','Emma Carter','Julia Stone','Nora Bennett','Paige Ellis','Brooke Fisher','Katie Young','Leah Morgan','Abby Walsh','Hailey Reed','Morgan Lane','Naomi Clarke','Chloe James','Luna Hart','Ivy Green','Sarah Miles','Mary Clark','Erin White','Dana Cole','Maya Ortiz','Lily Park','Mia Brooks','Priya Lin','Sana Malik','Maryam Azadi','Samantha Ray','Kayla Ford','Tara Collins','Jenna Hale','Alyssa Grant','Monica Price','Kara West','Riley Parker','Casey Blake','Anna Turner','Sierra King','Molly Hunter','Tina Bell','Jade Fisher','Hope Lane'],
  },
  eu: {
    count: 50,
    men: ['Karl Weber','Oliver Grant','Jean Moreau','Alex Voss','Viktor Sokolov','Dmitri Orlov','Nikolai Weiss','Pavel Volkov','Harry Wilson','Lukas Fischer','Matteo Romano','Jan Novak','Emil Larsen','Tomasz Kowalski','Henrik Klein','Felix Bauer','Arthur Dubois','Marco Conti','Matej Novak','Anton Weiss','Jonas Keller','Milan Horvat','Ruben Costa','Oscar Lind','Victor Laurent'],
    women: ['Elena Novak','Clara Fischer','Olena Shevchenko','Sarah Clarke','Irina Volkova','Camille Dupont','Hannah Klein','Amelie Laurent','Sofia Rossi','Marta Nowak','Ingrid Larsen','Eva Muller','Leonie Bauer','Lucia Romano','Nina Horvat','Klara Weiss','Freya Wilson','Anika Klein','Marie Dubois','Isla Grant','Petra Novak','Lena Fischer','Maja Lind','Nadia Costa','Anna Keller'],
  },
  me: {
    count: 50,
    men: ['Omar Al-Karim','Fahad Al Saud','Ahmed Noor','Hassan Al-Fayed','Avi Ben-David','David Cohen','Karim Mansour','Youssef Haddad','Samir Nouri','Rami Khalil','Tariq Saleh','Nabil Farah','Elias Haddad','Ziad Mansour','Amir Azadi','Khaled Barakat','Yasin Darwish','Nizar Ismail','Mazen Halabi','Adel Rahman','Ibrahim Salem','Fadi Khoury','Hani Qassem','Rayan Saad','Tamer Aziz'],
    women: ['Dr. Leila Sadeghi','Sara Nouri','Nadia Haddad','Rana Haddad','Maryam Azadi','Layla Mansour','Dina Khalil','Mira Haddad','Noor Saleh','Yasmin Farah','Salma Barakat','Lina Khoury','Mariam Darwish','Reem Qassem','Huda Salem','Amina Rahman','Dalia Aziz','Farah Saad','Leen Halabi','Nour Cohen','Tala Nouri','Samar Mansour','Rima Haddad','Maya Farah','Yara Khalil'],
  },
};

const MOODS = [
  'Foreign policy watcher.',
  'Following elections and energy markets.',
  'Local organizer with global questions.',
  'Reading too much news after work.',
  'Policy notes, maps, and strong coffee.',
  'Trying to understand where the world is going.',
  'Mostly geopolitics, sometimes daily life.',
  'Public affairs, city walks, late replies.',
  'Student of history and current events.',
  'Working days, reading headlines at night.',
];

const NON_FACE_IMAGES = [
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=300&q=80',
];

function slug(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function portrait(gender, index, region) {
  if (index % 9 === 0) return NON_FACE_IMAGES[(index + region.length) % NON_FACE_IMAGES.length];
  const folder = gender === 'female' ? 'women' : 'men';
  const number = (index * 7 + (region === 'me' ? 41 : region === 'eu' ? 23 : 3)) % 100;
  return `https://randomuser.me/api/portraits/${folder}/${number}.jpg`;
}

function generatedGroup(region, offset) {
  const group = GROUPS[region];
  const profiles = [];
  const names = [];
  for (let index = 0; index < group.count / 2; index += 1) {
    names.push({ name: group.men[index], gender: 'male' });
    names.push({ name: group.women[index], gender: 'female' });
  }

  names.forEach((entry, index) => {
    const absoluteIndex = offset + index;
    const baseUsername = slug(entry.name);
    profiles.push({
      name: entry.name,
      username: `${baseUsername}_${region}${String(index + 1).padStart(2, '0')}`,
      description: MOODS[(absoluteIndex + index) % MOODS.length],
      image: portrait(entry.gender, absoluteIndex, region),
      gender: entry.gender,
      region,
    });
  });

  return profiles;
}

const GENERATED_PROFILES = [
  ...generatedGroup('us', 0),
  ...generatedGroup('eu', 100),
  ...generatedGroup('me', 150),
];

const RAW_SEEDED_PROFILES = [...BASE_PROFILES, ...GENERATED_PROFILES].slice(0, 250);
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

function anonymousProfile(profile, index) {
  const number = String(index + 1).padStart(3, "0");
  const persona = ANON_PERSONAS[index % ANON_PERSONAS.length];
  return {
    ...profile,
    previousUsername: profile.username,
    name: `${persona.replace(/_/g, " ")} ${number}`,
    username: `${persona}_${number}`,
    description: [
      "Following the conversation and adding context when useful.",
      "Here for sourced discussion, civic questions, and calmer debate.",
      "Reading, learning, and occasionally posting a careful take.",
      "Interested in public affairs, policy, and how people see the same issue differently.",
      "Mostly listening, sometimes joining when the topic matters.",
    ][index % 5],
  };
}

const SEEDED_PROFILES = RAW_SEEDED_PROFILES.map(anonymousProfile);
const SEEDED_PROFILE_IMAGES = Object.fromEntries(SEEDED_PROFILES.map((profile) => [profile.username, profile.image]));
const SEEDED_PROFILE_BY_USERNAME = Object.fromEntries(SEEDED_PROFILES.map((profile) => [profile.username, profile]));
const GUEST_PROFILE_IMAGE = '/uploads/profileDefault.svg';

module.exports = { SEEDED_PROFILES, SEEDED_PROFILE_IMAGES, SEEDED_PROFILE_BY_USERNAME, GUEST_PROFILE_IMAGE };
