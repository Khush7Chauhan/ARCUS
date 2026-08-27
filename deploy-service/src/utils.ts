import { exec } from "child_process";
import path from "path";
import { createClient } from "redis";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publisher = createClient();
publisher.connect();

export function buildProject(id: string) {
    return new Promise((resolve, reject) => {
        const outputPath = path.join(__dirname, "output", id);
        
        // CRITICAL FIX: Verify the download actually worked before running npm
        if (!fs.existsSync(outputPath)) {
            return reject(new Error(
              `Project directory missing: ${outputPath}. ` +
              `downloadS3Folder likely failed or used the wrong path.`
            ));
        }

        let projectPath = outputPath;
        const rootPackageJson = path.join(outputPath, "package.json");

        if (!fs.existsSync(rootPackageJson)) {
            const subfolders = fs.readdirSync(outputPath, { withFileTypes: true })
                .filter((entry) => entry.isDirectory());

            const [subfolder] = subfolders;
            if (subfolders.length === 1 && subfolder) {
                const nestedProjectPath = path.join(outputPath, subfolder.name);
                const nestedPackageJson = path.join(nestedProjectPath, "package.json");

                if (fs.existsSync(nestedPackageJson)) {
                    projectPath = nestedProjectPath;
                }
            }
        }

        if (!fs.existsSync(path.join(projectPath, "package.json"))) {
            return reject(new Error(
              `No package.json found in ${outputPath} or its single subfolder. ` +
              `S3 download was empty or wrote files to the wrong location.`
            ));
        }

        console.log(`[BUILD] Starting npm install && npm run build in: ${projectPath}`);

        const child = exec(`npm install && npm run build`, {
            cwd: projectPath
        });

        child.stdout?.on("data", (data) => {
            const logText = data.toString();
            console.log("stdout: " + logText); 
            publisher.publish(`logs:${id}`, logText);
        });

        child.stderr?.on("data", (data) => {
            const logText = data.toString();
            console.log("stderr: " + logText);
            publisher.publish(`logs:${id}`, logText);
        });

        child.on("close", (code) => {
            publisher.publish(`logs:${id}`, `\nBuild completed with exit code ${code}\n`);
            if (code !== 0) {
                reject(new Error(`Build failed with exit code ${code}`));
            } else {
                resolve("");
            }
        });

        child.on("error", (err) => reject(err));
    });
}