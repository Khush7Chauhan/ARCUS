import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function buildProject(id: string) {
    return new Promise((resolve) => {
        const projectPath = path.join(__dirname, `output/${id}`);
        const child = exec(`cd ${projectPath} && npm install && npm run build`);

        child.stdout?.on("data", (data) => {
            console.log("stdout: " + data);
        });

        child.stderr?.on("data", (data) => {
            console.log("stderr: " + data);
        });

        child.on("close", (code) => {
            resolve("");
        });
    });
}