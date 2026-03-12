// backend/auth.js
import users from "/workspaces/Shine/backend/users.js";

// Login function
export const loginUser = ({ username, password }) => {
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    throw new Error("Invalid username or password");
  }

  return { ...user }; // in real DB -> return JWT token too
};

// Signup function (optional, if you want to test SignUp page later)
export const signupUser = ({ name, username, password }) => {
  const exists = users.find((u) => u.username === username);

  if (exists) {
    throw new Error("Username already exists");
  }

  const newUser = {
    _id: "u" + (users.length + 1),
    name,
    username,
    password,
    image: "",
    description: "",
    followers: 0,
    following: 0,
    communityIds: [],
    likedPosts: []
  };

  users.push(newUser);
  return { ...newUser };
};
