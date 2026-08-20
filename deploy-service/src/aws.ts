import AWS from "aws-sdk";
import * as fs from "fs";
import path from "path";
import dotenv from "dotenv"; 
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: "../.env" });

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  region: "ap-south-1" 
});

const BUCKET_NAME = "arcus-project"; 

export async function downloadS3Folder(prefix: string) {
  const allFiles = await s3
    .listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    })
    .promise();

  const allPromises =
    allFiles.Contents?.map(async ({ Key }) => {
      if (!Key) return "";

      const finalOutputPath = path.join(__dirname, Key);
      const outputFile = fs.createWriteStream(finalOutputPath);
      const dirname = path.dirname(finalOutputPath);

      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }

      await new Promise<void>((resolve, reject) => {
        s3
          .getObject({
            Bucket: BUCKET_NAME,
            Key,
          })
          .createReadStream()
          .on("error", reject)
          .pipe(outputFile)
          .on("finish", () => resolve());
      });

      return "";
    }) ?? [];

  await Promise.all(allPromises);
}

export function copyFinalDist(id: string) {
  const folderPath = path.join(__dirname, `output/${id}/dist`);
  const allFiles = getAllFiles(folderPath);
  allFiles.forEach((file) => {
    uploadFile(`dist/${id}/` + file.slice(folderPath.length + 1), file);
  });
}

const getAllFiles = (folderPath: string): string[] => {
  let response: string[] = [];
  const allFilesAndFolders = fs.readdirSync(folderPath);

  allFilesAndFolders.forEach((file) => {
    const fullFilePath = path.join(folderPath, file);
    if (fs.statSync(fullFilePath).isDirectory()) {
      response = response.concat(getAllFiles(fullFilePath));
    } else {
      response.push(fullFilePath);
    }
  });

  return response;
};

const uploadFile = async (fileName: string, localFilePath: string) => {
  const fileContent = fs.readFileSync(localFilePath);
  const response = await s3
    .upload({
      Body: fileContent,
      Bucket:BUCKET_NAME ,
      Key: fileName,
    })
    .promise();

  console.log("Uploaded successfully:", response.Key);
};