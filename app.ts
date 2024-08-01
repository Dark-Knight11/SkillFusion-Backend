import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { SimpleDirectoryReader } from "llamaindex";
import { GoogleGenerativeAI } from "@google/generative-ai";
import multer from "multer";

dotenv.config();

const app: Express = express();
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.API_KEY ?? "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const generateText = async (prompt: string) => {
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log(text);
  return text;
};

const generatePrompt = async (role: string, description: string) => {
  const resume = await new SimpleDirectoryReader().loadData({
    directoryPath: "./resume",
  });

  const jd = await new SimpleDirectoryReader().loadData({
    directoryPath: "./jd",
  });

  const prompt = `
  You are an AI assistant designed to generate personalized learning pathways. Using the provided resume and job description, identify the skills required for the job and compare them with the skills listed in the resume. Identify a skill that is required for the job but is not well-covered or missing in the resume. Focus on this skill and create a learning pathway consisting of bite-sized chapters. Each chapter should have a title and a short explanation that is simplified but includes necessary technical terms. Each chapter should be at least five lines long and cover important aspects of the topic. The response should be formatted as JSON.

  **Resume Details:**
  ${resume[0].text}

  **Job requirement:**
  Job Role: ${role}
  Job Description: ${description}

  **Output Format:**
  {
    "skill": "[Skill Name]",
    "learning_pathway": [
      {
        "chapter_title": "[Chapter 1 Title]",
        "short_explanation": "[Short explanation for Chapter 1, simplified but including technical terms. At least five lines long.]"
      },
      {
        "chapter_title": "[Chapter 2 Title]",
        "short_explanation": "[Short explanation for Chapter 2, simplified but including technical terms. At least five lines long.]"
      },
      ...
    ]
  }
  `;
  return prompt;
};

const storage = multer.diskStorage({
  destination: (req: any, _file: any, cb: any) => {
      cb(null, "resume/");
  },
  filename: (req: any, file: any, cb: any) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const uploadFile = multer({ storage });

app.post("/resume", uploadFile.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({
    message: "File uploaded successfully",
    filename: req.file.filename,
  });
});

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.post("/course", async (req, res) => {
  const {role, description} = req.body
  const prompt = await generatePrompt(role, description);
  const result = await generateText(prompt);
  res.json({
    result: JSON.parse(
      result
        .trim()
        .replace(/```json/g, "")
        .replace(/{ "/g, "")
        .replace(/```/g, "")
    ),
  });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
