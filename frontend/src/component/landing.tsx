import { CardTitle, CardDescription, CardHeader, CardContent, Card } from "./ui/card"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { Button } from "./ui/button"

import { useState, useRef, useEffect } from "react"
import axios from "axios"
import { GithubAuthProvider, signInWithPopup } from "firebase/auth"
import { auth, githubProvider } from "../firebase"
import PixelBlast from "./PixelBlast"

const BACKEND_UPLOAD_URL = "http://localhost:3000";

export function DeployWorkspace() {
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 p-4 text-zinc-100 sm:p-8">
      <Card className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <CardHeader className="p-0">
          <CardTitle className="text-xl font-semibold tracking-tight text-zinc-100">Deploy your GitHub Repository</CardTitle>
          <CardDescription className="mt-2 text-sm text-zinc-400">Enter the URL of your GitHub repository to deploy it</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-6">
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-300" htmlFor="github-url">GitHub Repository URL</Label>
              <Input 
                id="github-url"
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                }} 
                placeholder="https://github.com/username/repo" 
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 transition-all focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
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

            }} disabled={uploadId !== "" || uploading} className="mt-4 h-auto w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-200" type="submit">
              {uploadId ? <>Deploying (<span className="font-mono text-blue-400">{uploadId}</span>)</> : uploading ? "Uploading..." : "Deploy"}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {uploadId && !deployed && (
        <Card className="h-64 w-full max-w-xl overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-green-400 shadow-2xl sm:p-6">
          {logs.map((log, index) => (
            <span key={index} className="whitespace-pre-wrap block leading-relaxed">{log}</span>
          ))}
          <div ref={logsEndRef} />
        </Card>
      )}

      {deployed && (
        <Card className="w-full max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <CardHeader className="p-0">
            <CardTitle className="text-xl font-semibold tracking-tight text-zinc-100">Deployment Status</CardTitle>
            <CardDescription className="mt-2 text-sm text-zinc-400">Your website is successfully deployed!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-0 pt-6">
            <div>
              <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-300" htmlFor="deployed-url">Deployed URL</Label>
              <Input className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 transition-all focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" id="deployed-url" readOnly type="url" value={`http://${uploadId}.dev.100xdevs.com:3001/index.html`} />
            </div>
            <hr className="border-zinc-800" />
            
            <div>
              <Label className="mb-2 block text-xs font-medium uppercase tracking-wider text-zinc-300" htmlFor="custom-domain">Add Custom Domain</Label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input 
                  id="custom-domain" 
                  placeholder="e.g. app.mywebsite.com" 
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder:text-zinc-600 transition-all focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
                <div className="flex shrink-0 gap-3">
                  <Button className="h-auto rounded-lg border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800" 
                  onClick={async () => {
                    if (!customDomain) return;
                    try {
                      setMappingStatus("Mapping...");
                      await axios.post(`${BACKEND_UPLOAD_URL}/custom-domain`, {
                        id: uploadId,
                        customDomain: customDomain
                      });
                      setMappingStatus("Mapped Successfully!");
                    } catch {
                      setMappingStatus("Failed to map");
                    }
                  }}
                >
                  Link
                  </Button>
                  <Button
                    className="h-auto rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!customDomain.trim()}
                    onClick={() => {
                      const enteredDomain = customDomain.trim();
                      const customDomainUrl = /^https?:\/\//i.test(enteredDomain)
                        ? enteredDomain
                        : `http://${enteredDomain}`;
                      window.open(customDomainUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Visit Site
                  </Button>
                </div>
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

export function Landing() {
  const [error, setError] = useState("");
  const [authorizing, setAuthorizing] = useState(false);

  const handleGithubLogin = async () => {
    try {
      setError("");
      setAuthorizing(true);
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);

      if (!credential?.accessToken) {
        throw new Error("GitHub authorization did not return an access token.");
      }
    } catch (loginError) {
      console.error("GitHub authorization failed:", loginError);
      setError(loginError instanceof Error ? loginError.message : "Authorization failed. Please try again.");
      setAuthorizing(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#060b14] px-5 py-10 text-white sm:px-8">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-90" aria-hidden="true">
        <PixelBlast
          className="h-full w-full"
          color="#3B82F6"
          pixelSize={3}
          patternScale={2}
          patternDensity={1.2}
          enableRipples
          transparent
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,11,20,0.12)_0%,rgba(6,11,20,0.55)_52%,rgba(6,11,20,0.96)_100%)]" />
      <section className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center">
        <div className="mb-9 flex items-center gap-3 font-mono text-[10px] font-medium uppercase tracking-[0.32em] text-blue-200/75 sm:text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
          Cloud deployment, simplified
        </div>
        <h1 className="font-sans text-[4.5rem] font-extrabold leading-none tracking-[0.16em] text-slate-50 drop-shadow-[0_0_30px_rgba(147,197,253,0.2)] sm:text-8xl lg:text-[10rem]">ARCUS</h1>
        <div className="mt-8 h-px w-16 bg-blue-300/60 shadow-[0_0_16px_rgba(96,165,250,0.7)]" />
        <p className="mt-7 max-w-lg text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
          Deploy your code to the cloud in seconds. No configuration required.
        </p>
        <button
          type="button"
          onClick={handleGithubLogin}
          disabled={authorizing}
          className="group mt-10 inline-flex h-14 min-w-64 items-center justify-center gap-3 rounded-md border border-slate-600/80 bg-slate-950/85 px-7 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm transition duration-300 hover:border-blue-300 hover:bg-slate-900 hover:shadow-[0_0_28px_rgba(59,130,246,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060b14] disabled:cursor-wait disabled:opacity-70"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current transition-transform duration-300 group-hover:scale-110">
            <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.84 1.23 1.84 1.23 1.07 1.83 2.8 1.3 3.48.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.17 0 0 1-.32 3.3 1.23a11.45 11.45 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.76.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
          </svg>
          {authorizing ? "Authorizing..." : "Authorize using GitHub"}
        </button>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">Ready when your repository is</p>
        {error && <p className="mt-5 max-w-md text-sm text-rose-300">{error}</p>}
      </section>
    </main>
  );
}