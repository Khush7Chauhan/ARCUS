import { createClient } from "redis";

async function forceUpdate() {
    const redis = createClient();
    await redis.connect();
    await redis.hSet("domain-mappings", "mytestapp.local", "cuh2n");
    
    console.log("Successfully updated Redis! Domain now points to zkszl.");
    process.exit(0);
}

forceUpdate();