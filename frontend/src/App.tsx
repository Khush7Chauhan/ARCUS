import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase"; // Make sure this path points to your firebase.ts
import { DeployWorkspace, Landing } from "./component/landing";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase authentication status
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // 1. Show a loading state while checking Firebase
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <p>Loading...</p>
      </div>
    );
  }

  // 2. Public users see the hero and authenticate from its primary action.
  if (!user) return <Landing />;

  // 3. Authenticated users continue to the deployment workspace.
  return <DeployWorkspace />;
}

export default App;