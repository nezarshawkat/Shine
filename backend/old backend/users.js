// backend/users.js
const users = [
  {
    _id: "u1",
    username: "nezar123",
    password: "12345678", // temporary password
    name: "Nezar Ismail",
    image: "https://i.pravatar.cc/150?img=12",
    description: "Political science student. Passionate about youth engagement.",
    followers: 120,
    following: 75,
    communityIds: ["shine", "civic-lab"],
    likedPosts: ["1", "7"],
    savedPosts: [ "5", "7"],
  },
  {
    _id: "u2",
    username: "sara_ahmed",
    password: "password123",
    name: "Sara Ahmed",
    image: "https://i.pravatar.cc/150?img=32",
    description: "Civic activist and community organizer.",
    followers: 95,
    following: 60,
    communityIds: ["shine"],
    likedPosts: ["2", "7"],
    savedPosts: ["1", "5", "7"],
  },
  {
    _id: "u3",
    username: "omar_khaled",
    password: "qwerty123",
    name: "Omar Khaled",
    image: "https://i.pravatar.cc/150?img=45",
    description: "Data analyst and policy researcher.",
    followers: 80,
    following: 50,
    communityIds: ["civic-lab"],
    likedPosts: ["5", "9"],
    savedPosts: ["1", "5", "7"],
  }
];

export default users;
