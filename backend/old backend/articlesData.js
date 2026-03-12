// backend/articlesData.js
const articlesData = [
  {
    _id: "art_001",
    userId: "u1",
    title: "Exploring the Future of AI",
    description: "Artificial intelligence is transforming the world in unexpected ways.",
    content: "Full essay content goes here... Artificial intelligence is transforming the world in unexpected ways. From healthcare to finance, AI technologies are reshaping industries...",
    bigImage: "https://picsum.photos/462/462?random=1",
    images: ["https://picsum.photos/462/462?random=10", "https://picsum.photos/462/462?random=11"],
    views: 1024,
    likes: ["u2", "u3"], // Array of user IDs who liked it
    date: "06/27/2025",
  },
  {
    _id: "art_002",
    userId: "u2",
    title: "The Rise of Digital Democracy",
    description: "Technology enables new forms of civic engagement.",
    content: "Full essay content goes here... Technology enables new forms of civic engagement, giving citizens unprecedented access to information...",
    bigImage: "https://picsum.photos/462/462?random=2",
    images: [],
    views: 850,
    likes: ["u1"],
    date: "07/05/2025",
  },
  {
    _id: "art_003",
    userId: "u3",
    title: "Sustainable Development in 2025",
    description: "Sustainability is no longer optional—it's a necessity.",
    content: "Full essay content goes here... Sustainability is no longer optional—it's a necessity for the survival of our planet...",
    bigImage: "https://picsum.photos/462/462?random=3",
    images: ["https://picsum.photos/462/462?random=15"],
    views: 1200,
    likes: ["u1", "u2"],
    date: "05/22/2025",
  }
];

export default articlesData;