import { CardTitle, CardDescription, CardHeader, CardContent, Card } from "./ui/card"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

import { useState, useRef, useEffect } from "react"
import axios from "axios"
import { auth } from "../firebase" 

const BACKEND_UPLOAD_URL = "http://localhost:3000";

export function Landing() {
  const [repoUrl, setRepoUrl] = useState("");
  const [uploadId, setUploadId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deployed, setDeployed] = useState(false);
  
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [customDomain, setCustomDomain] = useState("");
  const [mappingStatus, setMappingStatus] = useState("");

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Deploy your GitHub Repository</CardTitle>
          <CardDescription>Enter the URL of your GitHub repository to deploy it</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github-url">GitHub Repository URL</Label>
              <Input 
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                }} 
                placeholder="https://github.com/username/repo" 
              />
            </div>
            <Button onClick={async () => {
              if (!repoUrl) {
                alert("Please enter a GitHub URL!");
                return;
              }
              setUploading(true);
              setLogs([]); 

              try {
                const token = await auth.currentUser?.getIdToken();
                const res = await axios.post(`${BACKEND_UPLOAD_URL}/deploy`, {
                  repoUrl: repoUrl
                }, {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });

                const newUploadId = res.data.id;
                setUploadId(newUploadId);
                const ws = new WebSocket(`ws://localhost:3000?id=${newUploadId}`);
                ws.onmessage = (event) => {
                  setLogs((prev) => [...prev, event.data]);
                };

                const interval = setInterval(async () => {
                  const response = await axios.get(`${BACKEND_UPLOAD_URL}/status?id=${newUploadId}`);

                  if (response.data.status === "deployed") {
                    clearInterval(interval);
                    setDeployed(true);
                    setUploading(false);
                    ws.close(); 
                  }
                }, 3000);
              } catch (error) {
                console.error("Deployment failed:", error);
                setUploading(false);
                alert("An error occurred while connecting to the deployment server.");
              }

            }} disabled={uploadId !== "" || uploading} className="w-full" type="submit">
              {uploadId ? `Deploying (${uploadId})` : uploading ? "Uploading..." : "Deploy"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {uploadId && !deployed && (
        <Card className="w-full max-w-md mt-8 bg-black text-green-400 font-mono text-xs h-64 overflow-y-auto p-4 rounded-md shadow-inner">
          {logs.map((log, index) => (
            <span key={index} className="whitespace-pre-wrap block leading-relaxed">{log}</span>
          ))}
          <div ref={logsEndRef} />
        </Card>
      )}

      {deployed && (
        <Card className="w-full max-w-md mt-8">
          <CardHeader>
            <CardTitle className="text-xl">Deployment Status</CardTitle>
            <CardDescription>Your website is successfully deployed!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="deployed-url">Deployed URL</Label>
              <Input id="deployed-url" readOnly type="url" value={`http://${uploadId}.dev.100xdevs.com:3001/index.html`} />
            </div>
            <br />
            <Button className="w-full" variant="outline" asChild>
              <a href={`http://${uploadId}.dev.100xdevs.com:3001/index.html`} target="_blank" rel="noopener noreferrer">
                Visit Website
              </a>
            </Button>
            
            <hr className="my-6 border-gray-200 dark:border-gray-700" />
            
            <div className="space-y-2">
              <Label htmlFor="custom-domain">Add Custom Domain</Label>
              <div className="flex space-x-2">
                <Input 
                  id="custom-domain" 
                  placeholder="e.g. app.mywebsite.com" 
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                />
                <Button 
                  onClick={async () => {
                    if (!customDomain) return;
                    try {
                      setMappingStatus("Mapping...");
                      await axios.post(`${BACKEND_UPLOAD_URL}/custom-domain`, {
                        id: uploadId,
                        customDomain: customDomain
                      });
                      setMappingStatus("Mapped Successfully!");
                    } catch (error) {
                      setMappingStatus("Failed to map");
                    }
                  }}
                >
                  Link
                </Button>
              </div>
              {mappingStatus && (
                <p className={`text-sm ${mappingStatus.includes("Success") ? "text-green-500" : "text-red-500"}`}>
                  {mappingStatus}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  )
}