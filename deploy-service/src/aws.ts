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
  console.log(`[DOWNLOAD] Listing S3 objects with prefix: ${prefix}`);

  const allFiles = await s3
    .listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    })
    .promise();

  // CRITICAL FIX: Throw immediately if S3 returns nothing.
  // This prevents the silent "empty directory" bug.
  if (!allFiles.Contents || allFiles.Contents.length === 0) {
    throw new Error(
      `S3 listing returned 0 files for prefix "${prefix}". ` +
      `Verify the upload-service pushed files and that the ID matches.`
    );
  }

  console.log(`[DOWNLOAD] Found ${allFiles.Contents.length} objects. Downloading...`);

  const allPromises = allFiles.Contents.map(async ({ Key }) => {
    if (!Key) return;

    // Local path mirrors the S3 key exactly: __dirname/output/id/...
    const finalOutputPath = path.join(__dirname, Key);
    const dirname = path.dirname(finalOutputPath);

    // CRITICAL FIX: Create the directory BEFORE opening the write stream.
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }

    console.log(`[DOWNLOAD] ${Key} -> ${finalOutputPath}`);

    await new Promise<void>((resolve, reject) => {
      const outputFile = fs.createWriteStream(finalOutputPath);

      s3
        .getObject({ Bucket: BUCKET_NAME, Key })
        .createReadStream()
        .on("error", (err) => {
          console.error(`[DOWNLOAD ERROR] S3 read failed for ${Key}:`, err.message);
          reject(err);
        })
        .pipe(outputFile)
        .on("error", (err) => {
          // CRITICAL FIX: Catch disk-write errors (permissions, disk full, etc.)
          console.error(`[DOWNLOAD ERROR] Disk write failed for ${Key}:`, err.message);
          reject(err);
        })
        .on("finish", () => {
          console.log(`[DOWNLOAD] Finished ${Key}`);
          resolve();
        });
    });
  });

  await Promise.all(allPromises);

  // Verification step: confirm the folder actually has files now
  const localFolder = path.join(__dirname, prefix);
  if (!fs.existsSync(localFolder)) {
    throw new Error(`Download verification failed: ${localFolder} does not exist.`);
  }
  const items = fs.readdirSync(localFolder);
  console.log(`[DOWNLOAD] Verified local folder. Top-level items: ${items.join(", ") || "(empty)"}`);
}

export async function copyFinalDist(id: string) {
  const folderPath = path.join(__dirname, "output", id, "dist");

  if (!fs.existsSync(folderPath)) {
    console.error(`[BUILD ERROR] dist folder not found at ${folderPath}`);
    throw new Error("Build output missing. Vite build likely failed.");
  }

  const allFiles = getAllFiles(folderPath);
  
  const uploadPromises = allFiles.map(async (file) => {
    const relativePath = file.slice(folderPath.length + 1).replace(/\\/g, "/");
    const s3Key = `dist/${id}/${relativePath}`;
    await uploadFile(s3Key, file);
  });
  
  await Promise.all(uploadPromises);
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

// NOTE: Exported so the upload-service can use it too
export const uploadFile = async (fileName: string, localFilePath: string) => {
  const fileContent = fs.readFileSync(localFilePath);
  const response = await s3
    .upload({
      Body: fileContent,
      Bucket: BUCKET_NAME,
      Key: fileName,
    })
    .promise();

  console.log("Uploaded successfully:", response.Key);
};