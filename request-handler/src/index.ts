import express from "express";
import AWS from "aws-sdk";
import dotenv from "dotenv";
import { createClient } from "redis"; 

dotenv.config({ path: "../.env" });
const redis = createClient();
redis.connect();

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    region: "ap-south-1"
});

const app = express();

app.get(/.*/, async (req, res) => {
    const host = req.hostname;
    let id = "";

    try {
        if (host.includes(".dev.100xdevs.com") || host.includes("localhost")) {
            id = host.split(".")[0] || "";
        } else {
            const mappedId = await redis.hGet("domain-mappings", host);
            if (!mappedId) {
                return res.status(404).send("Domain not configured on this platform.");
            }
            id = mappedId;
        }
        const filePath = req.path === "/" ? "/index.html" : req.path;
        
        const s3Key = `dist/${id}${filePath}`;
        console.log(`[DEBUG] Attempting to fetch S3 Key: ${s3Key}`);

        const contents = await s3.getObject({
            Bucket: "arcus-project", 
            Key: s3Key
        }).promise();
        
        const type = filePath.endsWith("html") ? "text/html" : 
                     filePath.endsWith("css") ? "text/css" : 
                     filePath.endsWith("svg") ? "image/svg+xml" : "application/javascript";
        
        res.set("Content-Type", type);
        res.send(contents.Body);
    } catch (error) {
        console.error(`[ERROR] Failed to fetch from S3 for ID ${id}. Attempted path: dist/${id}${req.path}`);
        res.status(404).send("File not found");
    }
});

app.listen(3001, () => {
    console.log("Request handler running on port 3001");
});