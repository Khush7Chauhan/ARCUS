import express from "express";
import cors from "cors";
import { simpleGit } from "simple-git";
import path from "path";
import { createClient } from "redis";
import { generate } from "./utils.js";
import { getAllFiles } from "./file.js"; 
import { uploadFile } from "./aws.js";

// Initialize Redis publisher (to push jobs)
const publisher = createClient();
publisher.connect();

// Initialize Redis subscriber (to read status)
const subscriber = createClient();
subscriber.connect();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/deploy", async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const id = generate(); // Generate random 5-character ID
    
    // 1. Clone repository locally
    const outputDir = path.join(process.cwd(), `output/${id}`);
    const git = simpleGit();
    await git.clone(repoUrl, outputDir);

    // 2. Fetch all files inside the cloned project
    const files = getAllFiles(outputDir);

    // 3. Upload all files to AWS S3 (Waits for ALL uploads to finish)
    const uploadPromises = files.map(async (file) => {
        const s3Key = file.slice(process.cwd().length + 1).replace(/\\/g, "/");
        return uploadFile(s3Key, file);
    });
    await Promise.all(uploadPromises);

    // 4. Push job to Redis queue for deploy-service
    await publisher.lPush("build-queue", id);
    
    // Set initial deployment status
    await publisher.hSet("status", id, "uploaded");

    // 5. Return deployment ID to client
    res.json({
        id: id
    });
});

// GET route so the React frontend can check if the build is done!
app.get("/status", async (req, res) => {
    const id = req.query.id;
    const response = await subscriber.hGet("status", id as string);
    res.json({
        status: response
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(` Upload service listening on port ${PORT}`);
});