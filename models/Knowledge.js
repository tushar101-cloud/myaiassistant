// models/Knowledge.js
import mongoose from "mongoose";

const knowledgeSchema = new mongoose.Schema({
  query: { type: String, index: true },
  answer: String,
});

export default mongoose.model("Knowledge", knowledgeSchema);
