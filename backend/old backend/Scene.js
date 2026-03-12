// Scene.js — Seed file for ShineDB.communityBanners

import mongoose from "mongoose";

const uri = "mongodb+srv://nezarismail:Nezar_2008@shine.uokjscw.mongodb.net/shineDB?retryWrites=true&w=majority"; // <- replace this

// 1. Connect to ShineDB
await mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

console.log("Connected to MongoDB");

// 2. Define schema
const CommunityBannerSchema = new mongoose.Schema({
  communityIcon: String,
  communityName: String,
  bannerTitle: String,
  descriptionText: String,
  keywords: [String],
  imageUrl: String,
  membersCountText: String,
  imageAvatars: [String],
  memberReferenceText: String,
});

const CommunityBanner = mongoose.model("CommunityBanner", CommunityBannerSchema, "communityBanners");

// 3. Prepare data
const banners = [
  {
    communityIcon: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91",
    communityName: "Future Leaders",
    bannerTitle: "For a better future for ourselves",
    descriptionText:
      "Our mission is to empower the next generation of leaders with the knowledge, confidence, and support they need. We believe that collaboration, innovation, and learning can transform communities and societies.",
    keywords: ["leadership", "youth", "future", "innovation"],
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
    membersCountText: "23.4k members",
    imageAvatars: [
      "https://randomuser.me/api/portraits/men/12.jpg",
      "https://randomuser.me/api/portraits/women/44.jpg",
      "https://randomuser.me/api/portraits/men/76.jpg",
    ],
    memberReferenceText: "Nizar Ismail and three others",
  },
  {
    communityIcon: "https://images.unsplash.com/photo-1523978591478-c753949ff840",
    communityName: "Climate Action Group",
    bannerTitle: "Protecting our planet starts with us",
    descriptionText:
      "Join thousands who are taking direct action to protect the environment. From recycling initiatives to global climate policies, we discuss, educate, and act to secure a sustainable tomorrow.",
    keywords: ["environment", "climate", "sustainability", "activism"],
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    membersCountText: "41.8k members",
    imageAvatars: [
      "https://randomuser.me/api/portraits/women/10.jpg",
      "https://randomuser.me/api/portraits/men/92.jpg",
      "https://randomuser.me/api/portraits/women/65.jpg",
    ],
    memberReferenceText: "Adel Samir and two others",
  },
  {
    communityIcon: "https://images.unsplash.com/photo-1518779578993-ec3579fee39f",
    communityName: "Tech Innovators",
    bannerTitle: "Build technology that changes the world",
    descriptionText:
      "A global community of engineers, developers, and designers shaping the future with creativity and innovation. Learn, share, and collaborate on groundbreaking projects.",
    keywords: ["technology", "AI", "coding", "development"],
    imageUrl: "https://images.unsplash.com/photo-1590642914617-3f7b1e66a6a3",
    membersCountText: "12.9k members",
    imageAvatars: [
      "https://randomuser.me/api/portraits/men/4.jpg",
      "https://randomuser.me/api/portraits/men/58.jpg",
      "https://randomuser.me/api/portraits/women/18.jpg",
    ],
    memberReferenceText: "Mariam Khaled and five others",
  },
];

// 4. Insert data
await CommunityBanner.deleteMany({});
await CommunityBanner.insertMany(banners);

console.log("Community banners seeded successfully!");

// 5. Close connection
await mongoose.connection.close();
console.log("Connection closed.");