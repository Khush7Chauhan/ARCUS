import { useState } from "react";
import { signInWithPopup, GithubAuthProvider } from "firebase/auth";
import { auth, githubProvider } from "../firebase";

export default function Login() {
  const [error, setError] = useState("");

  const handleGithubLogin = async () => {
    try {
      setError("");
      const result = await signInWithPopup(auth, githubProvider);
      const credential = GithubAuthProvider.credentialFromResult(result);
      const githubToken = credential?.accessToken;
      const user = result.user;

      console.log("Welcome:", user.displayName);
      console.log("Use this token to fetch repos from GitHub API:", githubToken);
      
    } catch (err: any) {
      console.error("Login Failed:", err);
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200">
      <div className="p-8 border border-slate-800 rounded-lg shadow-xl bg-slate-900 w-96 text-center">
        <h2 className="text-2xl font-bold mb-6 text-white">Arcus Deploy</h2>
        
        {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}
        
        <button 
          onClick={handleGithubLogin}
          className="w-full bg-slate-100 text-slate-900 font-semibold py-3 px-4 rounded hover:bg-white transition-colors"
        >
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}