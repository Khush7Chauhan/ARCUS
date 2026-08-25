import express from "express";
import cors from "cors";
import { simpleGit } from "simple-git";
import path from "path";
import { createClient } from "redis";
import { WebSocketServer } from "ws"; 
import { generate } from "./utils.js";
import { getAllFiles } from "./file.js"; 
import { uploadFile } from "./aws.js";

const publisher = createClient();
publisher.connect();
const subscriber = createClient();
subscriber.connect();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/deploy", async (req, res) => {
    const repoUrl = req.body.repoUrl;
    const id = generate(); 
    const outputDir = path.join(process.cwd(), `output/${id}`);
    const git = simpleGit();
    await git.clone(repoUrl, outputDir);

    const files = getAllFiles(outputDir);
    const uploadPromises = files.map(async (file) => {
        const s3Key = file.slice(process.cwd().length + 1).replace(/\\/g, "/");
        return uploadFile(s3Key, file);
    });
    await Promise.all(uploadPromises);
    await publisher.lPush("build-queue", id);
    await publisher.hSet("status", id, "uploaded");
    res.json({
        id: id
    });
});


app.get("/status", async (req, res) => {
    const id = req.query.id;
    const response = await subscriber.hGet("status", id as string);
    res.json({
        status: response
    });
});

app.post("/custom-domain", async (req, res) => {
    const { id, customDomain } = req.body;

    if (!id || !customDomain) {
        return res.status(400).json({ error: "Missing id or custom domain" });
    }

    try {
        await publisher.hSet("domain-mappings", customDomain, id);
        res.json({ success: true, message: "Domain mapped successfully!" });
    } catch (error) {
        console.error("Error mapping domain:", error);
        res.status(500).json({ error: "Failed to map domain" });
    }
});

const PORT = 3000;
const server = app.listen(PORT, () => {
    console.log(` Upload service listening on port ${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", async (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const id = url.searchParams.get("id");

    if (!id) {
        ws.close();
        return;
    }

    const wsSubscriber = createClient();
    await wsSubscriber.connect();
    await wsSubscriber.subscribe(`logs:${id}`, (message) => {
        ws.send(message);
    });
    ws.on("close", () => {
        wsSubscriber.unsubscribe(`logs:${id}`);
        wsSubscriber.quit();
    });
});