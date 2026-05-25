const prisma = require('./prisma');

const accounts = [
  ['Ava Brooks','avabrooksy','iced coffee + overthinking ☕'],
  ['Daniel Kim','danielk_codes','Frontend dev. Shipping pixels daily.'],
  ['MIA','mia_midnight','awake when everyone sleeps 🌙'],
  ['Jordan Lee','jordanonfilm','street photography + rainy cities'],
  ['Priya Nair','priyanair_design','Product designer obsessed with tiny details.'],
  ['noah','noah_no_filter','i say what i said.'],
  ['Eliza Hart','elizahartwrites','Novelist in progress. Chapter 7 forever.'],
  ['Max Ortega','maxliftsdaily','Gym. Meal prep. Repeat.'],
  ['Sophia Chen','sophsci','med student surviving on flashcards 🧠'],
  ['Theo','theo_wav','making beats in my bedroom'],
  ['Carla Mendes','carlacooks','sourdough victories + kitchen chaos'],
  ['BEN','benjaminbold','Entrepreneur. Builder. Coffee-powered.'],
  ['Lily Park','lilyinbloom','plants, poems, and peaceful mornings 🌿'],
  ['Zach Rivera','zachattacks','memes curator / part-time menace'],
  ['Hannah Cole','hannahtravels','one-way ticket energy ✈️'],
  ['R. Patel','rpatel_finance','Value investing, long horizon, no hype.'],
  ['Chloe','chlo3bear','cat mom x3 🐾'],
  ['Ethan Miles','ethanmilesfit','online coach | DM for plans'],
  ['Amara','amara_afterdark','soft thoughts, loud playlists'],
  ['Derek White','dwhite_realty','helping families find home.'],
  ['Jess Moore','jessjournals','romanticizing ordinary days'],
  ['Omar Haddad','omrbyte','cybersecurity + espresso'],
  ['nina','ninadoesnails','nail art addict 💅'],
  ['Professor Grant','historywithgrant','History teacher. Stories over dates.'],
  ['Kayla Sun','kaylasunruns','marathon training log #RoadTo26.2'],
  ['Alex Voss','alexvfx','3D motion + VFX experiments'],
  ['Tori Lane','torilanereads','fantasy books and tea stains'],
  ['Mike D.','mikedrivesthru','car guy. bad jokes. good vibes.'],
  ['Serena Yu','serenasketch','digital illustrator • commissions open'],
  ['Leo','leooffline','currently touching grass'],
  ['Fatima Ali','fatima_builds','startup ops + community builder'],
  ['greg','greggoesfishing','gone fishin’ 🎣'],
  ['Bianca Rossi','biancarossiart','oil painter chasing light'],
  ['Ryan Cole','ryan_markets','SaaS growth, funnels, experiments.'],
  ['Ivy','ivywithintent','slow living in a fast world'],
  ['Marcus Hale','marcushale_esq','Attorney. Reader. Runner.'],
  ['Skye','skyewas_here','maybe this is the bio'],
  ['Nikhil S.','nikhilsystems','cloud infra & late-night deployments'],
  ['Bella James','bellabakesdaily','cakes, crumbs, and happy accidents 🍰'],
  ['Ahmed Noor','ahmednoor_media','filmmaker | visual storytelling'],
  ['luna','luna_lately','moon moods only 🌘'],
  ['Trevor Pike','trevortrades','charts, discipline, no FOMO.'],
  ['Emily Rose','emilyrosehome','cozy spaces + DIY decor'],
  ['Cami','cami_core','pilates, posture, protein'],
  ['Victor Reyes','victorreyesmusic','indie pop artist 🎙️'],
  ['Sana Malik','sanamlk','public health, policy, purpose'],
  ['Brad','bradbeingbrad','i pressed the button. again.'],
  ['Naomi Clarke','naomiclarkeux','UX researcher asking “why?”'],
  ['ash','ashinorbit','gaming, ramen, and night mode'],
  ['Adrian Fox','adrianfoxphoto','portraits that feel like cinema'],
];

async function main() {
  let created = 0;
  for (const [name, username, description] of accounts) {
    const email = `${username}@mock.shine.local`;
    await prisma.user.upsert({
      where: { username },
      update: {
        name,
        description,
        email,
        isAuthorized: true,
      },
      create: {
        name,
        username,
        description,
        email,
        provider: 'seed',
        isAuthorized: true,
      },
    });
    created++;
  }
  console.log(`Seeded/updated ${created} AI mock accounts.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
