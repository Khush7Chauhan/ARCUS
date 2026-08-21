import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase"; // Make sure this path points to your firebase.ts
import { Landing } from "./component/landing";
import Login from "./component/Login"; // Make sure this path points to your new Login component

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

  // 2. If no user is found, render the Login screen
  if (!user) {
    return <Login />;
  }

  // 3. If a user is logged in, show your original Landing deploy screen
  return <Landing />;
}

export default App;