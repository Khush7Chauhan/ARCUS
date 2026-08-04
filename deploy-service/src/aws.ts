import {S3} from "aws-sdk";
import fs form "fs";
import path from "path";

const s3 = new S3({
    accessKeyId: "",
    secretAccessKey: "",
    endpoint: ""
})

export async function downloadS3Folder(prefix : string) {
    
}