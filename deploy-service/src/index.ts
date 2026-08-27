import { createClient } from "redis";
import { copyFinalDist, downloadS3Folder } from "./aws.js";
import { buildProject } from "./utils.js";

const subscriber = createClient();
subscriber.connect();

const publisher = createClient();
publisher.connect();

async function main() {
    while (1) {
        try {
            const res = await subscriber.brPop("build-queue", 0);
            if (!res) continue;

            const id = res.element;
            console.log(`\n=== Starting build for ID: ${id} ===`);
            await downloadS3Folder(`output/${id}`);
            await buildProject(id);
            await copyFinalDist(id); 
            await publisher.hSet("status", id, "deployed");
            console.log(`=== Build successful for ID: ${id} ===\n`);

            const projectId = await publisher.hGet("deployment:project", id);
            if (projectId) {
                const customDomain = await publisher.hGet("project:domain", projectId);
                if (customDomain) {
                    await publisher.hSet("domain-mappings", customDomain, id);
                    console.log(`[DEPLOY] Updated ${customDomain} -> ${id}`);
                }
            }
            
            const directDomain = await publisher.get(`build:domain:${id}`);
            if (directDomain) {
                await publisher.hSet("domain-mappings", directDomain, id);
                await publisher.del(`build:domain:${id}`);
            }

        } catch (error: any) {
            console.error(`[FATAL] Build loop error:`, error.message);
        }
    }
}
main();