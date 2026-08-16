import express from "express";
import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    region: "ap-south-1"
    
});

const app = express();

app.get(/.*/, async (req, res) => {
    const host = req.hostname;
    const id = host.split(".")[0];
    const filePath = req.path;

    try {
        const contents = await s3.getObject({
            Bucket: "arcus-project", 
            Key: `dist/${id}${filePath}`
        }).promise();
        
        const type = filePath.endsWith("html") ? "text/html" : 
                     filePath.endsWith("css") ? "text/css" : "application/javascript";
        
        res.set("Content-Type", type);
        res.send(contents.Body);
    } catch (error) {
        console.error("Error fetching from S3:", error);
        res.status(404).send("File not found");
    }
});

app.listen(3001, () => {
    console.log("Request handler running on port 3001");
});