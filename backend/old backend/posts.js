// backend/posts.js

const posts = [
  {
    _id: "1",
    type: "opinion",
    text: "Youth political participation is one of the strongest forces for change...",
    images: [
      "https://picsum.photos/600/400?random=1",
      "https://picsum.photos/600/400?random=2"
    ],
    keywords: ["Politics", "Youth", "Future"],
    likes: 34,
    views: 210,
    profile: {
      userId: "u1",
      name: "Nezar Ismail",
      image: "https://i.pravatar.cc/150?img=12"
    },
    communityId: "shine",
    sources: [
      { name: "UN Youth Report", link: "https://www.un.org/youth" }
    ],
    createdAt: "2025-12-15T18:30:00Z"
  },

  {
    _id: "2",
    type: "opinion",
    text: "Political awareness among youth is critical for a healthy democracy...",
    images: [],
    keywords: ["Civic Engagement", "Youth"],
    likes: 22,
    views: 150,
    profile: {
      userId: "u2",
      name: "Sara Ahmed",
      image: "https://i.pravatar.cc/150?img=32"
    },
    communityId: "shine",
    sources: [
      { name: "Global Civic Report", link: "https://www.civicreport.org" }
    ],
    createdAt: "2025-12-14T21:10:00Z"
  },

  {
    _id: "5",
    type: "critique",
    text: "Current policies have overlooked rural populations, leaving farmers and small communities underrepresented in decision-making processes. Immediate action is required to ensure fair resource distribution and social support mechanisms.",
    keywords: ["Policy", "Inequality"],
    likes: 18,
    views: 98,
    profile: {
      userId: "u3",
      name: "Omar Khaled",
      image: "https://i.pravatar.cc/150?img=45"
    },
    communityId: "civic-lab",
    critiquedPostId: "1",
    sources: [
      { name: "Rural Development Study", link: "https://www.ruralstudy.org" }
    ],
    createdAt: "2025-12-13T15:00:00Z"
  },

  {
    _id: "9",
    type: "analysis",
    text: "Analyzing voter turnout trends over the past decade...",
    images: ["https://picsum.photos/600/400?random=5"],
    keywords: ["Voter Turnout", "Data"],
    likes: 25,
    views: 140,
    profile: {
      userId: "u3",
      name: "Omar Khaled",
      image: "https://i.pravatar.cc/150?img=45"
    },
    communityId: "civic-lab",
    sources: [
      { name: "Election Data Report", link: "https://www.electiondata.org" }
    ],
    createdAt: "2025-12-11T14:10:00Z"
  },

  {
    _id: "7",
    type: "poll",
    text: "Which social media platform is most effective for youth engagement?",
    keywords: ["Poll", "Youth"],
    pollOptions: [
      { id: "1", text: "Twitter", votes: 24 },
      { id: "2", text: "Instagram", votes: 16 }
    ],
    views: 100,
    profile: {
      userId: "u1",
      name: "Nezar Ismail",
      image: "https://i.pravatar.cc/150?img=12"
    },
    communityId: "shine",
    createdAt: "2025-12-16T10:00:00Z"
  }
];

export default posts;
