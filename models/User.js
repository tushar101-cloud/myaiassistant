// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: "" }, // new avatar field (Cloudinary URL)
  habits: [
    {
      name: String,
      frequency: Number,
      lastUsed: Date,
    },
  ],
  memory: [
    {
      input: String,
      response: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

export default mongoose.model("User", userSchema);
