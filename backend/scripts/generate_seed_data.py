import json
import random
from datetime import datetime, timedelta, timezone

random.seed(42)

now = datetime.now(timezone.utc)

first_names = [
    "Amina", "Lucas", "Sofia", "Omar", "Hannah", "Daniel", "Maya", "Ethan", "Layla", "Noah",
    "Iris", "Samir", "Priya", "Jonas", "Elena", "Yousef", "Camila", "Mateo", "Nadia", "Leo",
    "Anika", "Tariq", "Zara", "Ivan", "Fatima", "Rafael", "Mila", "Karim", "Nora", "Julian",
    "Aisha", "Marco", "Ines", "Rami", "Clara", "Victor", "Salma", "Adam", "Reem", "Felix",
    "Jana", "Diego", "Leila", "Arman", "Sana", "Hugo", "Nawal", "David", "Farah", "Oscar",
]

last_names = [
    "Haddad", "Silva", "Khan", "Meyer", "Rahman", "Garcia", "Novak", "Ali", "Santos", "Kovacs",
    "Ibrahim", "Costa", "Nasser", "Romero", "Bennett", "Yilmaz", "Dawson", "Mansour", "Pereira", "Hassan",
    "Lopez", "Schmidt", "Ahmed", "Rossi", "Said", "Morales", "Klein", "Farouk", "Nordin", "Petrov",
]

countries = [
    "United States", "Canada", "United Kingdom", "Germany", "France", "Spain", "Brazil", "Mexico", "Egypt", "Jordan",
    "Lebanon", "Türkiye", "India", "Pakistan", "Nigeria", "Kenya", "South Africa", "Indonesia", "Philippines", "Japan",
]

views = [
    "progressive", "conservative", "centrist", "libertarian", "social democrat", "green politics", "non-aligned", "moderate",
]

roles = ["student", "journalist", "policy analyst", "activist", "teacher", "engineer", "small business owner", "researcher", "nurse", "lawyer"]

interests = [
    "elections", "diplomacy", "urban policy", "digital rights", "climate policy", "labor rights", "budget policy",
    "education reform", "healthcare systems", "media ethics", "energy security", "civil liberties"
]

hashtags_pool = ["#Elections", "#Policy", "#Democracy", "#Diplomacy", "#Governance", "#PublicPolicy", "#Media", "#TechPolicy", "#GlobalAffairs", "#Economy"]

source_pool = [
    {"name": "Reuters", "url": "https://www.reuters.com/world/"},
    {"name": "AP News", "url": "https://apnews.com/politics"},
    {"name": "BBC News", "url": "https://www.bbc.com/news/world"},
    {"name": "Financial Times", "url": "https://www.ft.com/world"},
    {"name": "The Economist", "url": "https://www.economist.com/"},
    {"name": "World Bank Data", "url": "https://data.worldbank.org/"},
    {"name": "OECD", "url": "https://www.oecd.org/"},
    {"name": "IMF", "url": "https://www.imf.org/en/Publications"},
]

news_images = [
    "https://www.reuters.com/resizer/example-politics-1.jpg",
    "https://www.reuters.com/resizer/example-politics-2.jpg",
    "https://apnews.com/resizer/example-politics-3.jpg",
    "https://static01.nyt.com/images/example-politics-4.jpg",
    "https://ichef.bbci.co.uk/news/example-politics-5.jpg",
    "https://www.aljazeera.com/wp-content/uploads/example-politics-6.jpg",
]

def ts_within_week():
    minutes_back = random.randint(5, 7 * 24 * 60)
    return (now - timedelta(minutes=minutes_back)).isoformat()

users = []

preserved = [
    {
        "fullName": "Nezar Ismail",
        "username": "nezarismail",
        "bio": "Founder voice focused on institution-building and civic trust. Writes long-form political analysis and community notes.",
        "country": "Jordan",
        "politicalView": "moderate",
        "role": "policy analyst",
        "characterProfile": {
            "temperament": "measured",
            "likes": ["constitution design", "regional diplomacy", "data-driven debate"],
            "dislikes": ["rage bait", "unverified claims"],
            "followsNews": ["elections", "peace talks", "economic reform"],
        },
        "starterPost": "Building better discussion spaces means rewarding evidence, not volume."
    },
    {
        "fullName": "Guest Support",
        "username": "guest_support",
        "bio": "Support account for onboarding, moderation questions, and community safety reminders.",
        "country": "United States",
        "politicalView": "non-aligned",
        "role": "community support",
        "characterProfile": {
            "temperament": "helpful",
            "likes": ["clear rules", "civil discussion", "user feedback"],
            "dislikes": ["harassment", "spam"],
            "followsNews": ["platform policy", "online safety"],
        },
        "starterPost": "If you see harmful content, report it; we review reports quickly and transparently."
    }
]

users.extend(preserved)

used_usernames = {u["username"] for u in users}

while len(users) < 100:
    fn = random.choice(first_names)
    ln = random.choice(last_names)
    full = f"{fn} {ln}"
    base = (fn[0] + ln).lower().replace(" ", "")
    uname = base
    suffix = 1
    while uname in used_usernames:
        suffix += 1
        uname = f"{base}{suffix}"
    used_usernames.add(uname)

    role = random.choice(roles)
    view = random.choice(views)
    country = random.choice(countries)
    like_set = random.sample(interests, 3)
    users.append({
        "fullName": full,
        "username": uname,
        "bio": f"{role.capitalize()} from {country} interested in {like_set[0]} and {like_set[1]}. Tries to keep debate factual even when opinions clash.",
        "country": country,
        "politicalView": view,
        "role": role,
        "characterProfile": {
            "temperament": random.choice(["direct", "reflective", "skeptical", "optimistic", "fiery", "calm"]),
            "likes": like_set,
            "dislikes": random.sample(["corruption", "propaganda", "empty slogans", "elite capture", "polarization", "misinformation"], 2),
            "followsNews": random.sample([
                "parliament votes", "foreign policy summits", "inflation data", "campaign finance", "court decisions", "ceasefire talks", "trade disputes"
            ], 3),
        },
        "starterPost": random.choice([
            "I read across outlets before I decide what I think.",
            "Policy details matter more than campaign slogans.",
            "I care about practical reforms people can actually feel.",
            "Respectful disagreement is the only way this works.",
        ])
    })

community_specs = [
    ("shine", "Debate with purpose", "Flagship civic forum for cross-ideological political debate.", ["civic", "debate", "policy"], "general politics", "nezarismail"),
    ("GeoPulse", "Maps, power, and people", "Tracks geopolitical shifts and regional alignments.", ["geopolitics", "security", "regions"], "geopolitics", users[3]["username"]),
    ("BallotBrief", "Elections decoded", "Election systems, polling literacy, and turnout strategy.", ["elections", "voting", "polling"], "elections", users[4]["username"]),
    ("FiscalForum", "Follow the budget", "Discussion on taxation, deficits, and public investment.", ["budget", "tax", "debt"], "economic policy", users[5]["username"]),
    ("CivicTechDesk", "Code meets law", "Where technology regulation and democracy intersect.", ["ai", "platforms", "regulation"], "technology and politics", users[6]["username"]),
    ("LevantDialogues", "Region first", "Middle East diplomacy, conflict, and reconstruction policy.", ["middle east", "diplomacy", "security"], "Middle East politics", users[7]["username"]),
    ("DiplomacyRoom", "Talk before conflict", "Negotiation frameworks, sanctions, and international law.", ["diplomacy", "UN", "treaties"], "global diplomacy", users[8]["username"]),
    ("YouthCivicLab", "Young voices, real impact", "Student-led policy debate and civic campaigns.", ["youth", "campus", "activism"], "youth political debate", users[9]["username"]),
    ("PolicyWorkbench", "Ideas to implementation", "Practical policy analysis with costs and trade-offs.", ["analysis", "implementation", "reform"], "policy analysis", users[10]["username"]),
    ("MediaLens", "Read the framing", "How narratives and newsroom choices shape politics.", ["media", "framing", "fact-check"], "media influence", users[11]["username"]),
    ("PeaceSecurityTrack", "Security beyond slogans", "War, ceasefires, peacebuilding, and defense policy.", ["war", "peace", "security"], "war and peace", users[12]["username"]),
    ("SocialCompact", "People-centered policy", "Healthcare, education, welfare, and social mobility.", ["social policy", "health", "education"], "social policy", users[13]["username"]),
    ("RightsAndRule", "Freedom with institutions", "Civil liberties, courts, and constitutional accountability.", ["rights", "law", "constitution"], "democracy and law", users[14]["username"]),
    ("TradeAndTransit", "Economies in motion", "Trade agreements, supply chains, and industrial strategy.", ["trade", "industry", "supply chains"], "international political economy", users[15]["username"]),
    ("CityStatePolicy", "Local policy, national stakes", "Urban governance, housing, and municipal finance.", ["cities", "housing", "local government"], "urban policy", users[16]["username"]),
]

communities = [
    {
        "communityName": n,
        "slogan": s,
        "description": d,
        "keywords": k,
        "topicFocus": t,
        "creatorUsername": c,
    }
    for (n, s, d, k, t, c) in community_specs
]

memberships = []
comm_names = [c["communityName"] for c in communities]
for u in users:
    if u["username"] in {"nezarismail", "guest_support"}:
        joined = ["shine", "PolicyWorkbench", "DiplomacyRoom"] if u["username"] == "nezarismail" else ["shine"]
    else:
        n = random.choices([0, 1, 2, 3, 4], weights=[15, 25, 25, 20, 15])[0]
        joined = random.sample(comm_names, n)
    for c in joined:
        memberships.append({
            "username": u["username"],
            "communityName": c,
            "role": "creator" if any(cm["communityName"] == c and cm["creatorUsername"] == u["username"] for cm in communities) else "member",
            "joinedAt": ts_within_week(),
        })

post_topics = [
    "elections", "international relations", "diplomacy", "economic policy", "technology regulation",
    "war and peace", "democracy", "social policy", "media influence"
]

openers = [
    "I keep seeing this framed as a simple left-versus-right issue, but it isn't.",
    "After reading the latest reporting, my takeaway is more cautious than most headlines suggest.",
    "People are reacting fast, but the institutional details are where outcomes are decided.",
    "This debate got emotional, yet the data points still matter.",
]

analysis_lines = [
    "The short-term political win may create long-term administrative costs.",
    "Coalition math in parliament is driving more of this than ideology alone.",
    "Public trust is the missing variable in almost every policy model here.",
    "External pressure changed the timeline, but not the structural constraints.",
    "If implementation capacity stays weak, promises will not survive budget season.",
]

poll_sets = [
    ["Prioritize inflation control", "Increase welfare spending", "Cut taxes for small firms", "Hold current course"],
    ["Back coalition talks", "Call for snap elections", "Form technocratic cabinet", "Undecided"],
    ["Regulate AI platforms now", "Delay for global standards", "Industry self-regulation", "No new rules"],
    ["Expand ceasefire diplomacy", "Increase deterrence posture", "Tie aid to reforms", "Need more information"],
]

posts = []
for i in range(1, 201):
    author = random.choice(users)
    ptype = random.choice(["opinion", "critique", "analysis", "poll"])
    topic = random.choice(post_topics)
    title = f"{topic.title()}: {random.choice(['what we are missing', 'a practical path forward', 'hard trade-offs ahead', 'questions worth asking'])}"

    body_sentences = [random.choice(openers)]
    body_sentences.append(f"On {topic}, the current argument in my feed ignores at least one important constraint.")
    body_sentences.append(random.choice(analysis_lines))
    if ptype in {"analysis", "critique"}:
        body_sentences.append("I would rather see transparent benchmarks than another round of symbolic announcements.")
    if ptype == "critique":
        body_sentences.append("Leaders cannot claim urgency while postponing the accountability part.")
    if ptype == "opinion":
        body_sentences.append("My position is not ideological purity; it is about outcomes people can verify.")
    if ptype == "poll":
        body_sentences.append("Vote and explain your choice in replies, especially if you think all options are flawed.")

    hashtags = random.sample(hashtags_pool, random.randint(2, 4))
    keywords = [topic, random.choice(["governance", "reform", "institutions", "public trust", "state capacity"])]
    community = random.choice(comm_names) if random.random() < 0.72 else None
    source = random.choice(source_pool) if random.random() < 0.55 else None

    post = {
        "id": f"post_{i}",
        "authorUsername": author["username"],
        "postType": ptype,
        "title": title,
        "body": " ".join(body_sentences),
        "keywords": keywords,
        "hashtags": hashtags,
        "community": community,
        "source": source,
        "timestamp": ts_within_week(),
    }

    if ptype == "poll":
        post["pollOptions"] = random.choice(poll_sets)

    if random.random() < 0.14:
        post["image"] = random.choice(news_images)

    posts.append(post)

comments = []
comment_openers = [
    "I agree with your main point, but the timeline seems optimistic.",
    "Not convinced. This assumes institutions are functioning normally.",
    "Good thread. Do you have data for the last election cycle?",
    "I voted differently in the poll because local impacts are ignored here.",
    "Interesting take; what would you cut to fund that proposal?",
    "The media angle matters more than people admit.",
    "Respectfully, this sounds strong in theory but weak in implementation.",
]

for i in range(1, 301):
    post = random.choice(posts)
    author = random.choice(users)
    text = random.choice(comment_openers)
    if random.random() < 0.35:
        text += " Can you share a source?"
    if random.random() < 0.2:
        text += " #Policy"

    comments.append({
        "id": f"comment_{i}",
        "authorUsername": author["username"],
        "postId": post["id"],
        "commentText": text,
        "timestamp": ts_within_week(),
    })

payload = {
    "users": users,
    "communities": communities,
    "memberships": memberships,
    "posts": posts,
    "comments": comments,
}

with open("backend/prisma/seed_data.json", "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)

print("Generated backend/prisma/seed_data.json")
print({k: len(v) for k, v in payload.items()})
