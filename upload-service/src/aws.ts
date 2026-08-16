import AWS from "aws-sdk";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  region: "ap-south-1"
  
});

export const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    const response = await s3.upload({
        Body: fileContent,
        Bucket: "arcus-project",
        Key: fileName,
    }).promise();
    console.log(response);
}