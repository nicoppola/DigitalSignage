import "./App.css";

import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import TwoSidesUploader from "./components/TwoSidesUploader";

const App = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(""); // status text
  const [checking, setChecking] = useState(false); // spinner
  const [timeoutId, setTimeoutId] = useState(null); // store timeout to clear if needed

  // Check if user is logged in by hitting a protected route
  useEffect(() => {
    fetch("/config?side=left", { credentials: "include" })
      .then((res) => {
        if (res.ok) setLoggedIn(true);
      })
      .catch(() => setLoggedIn(false));
  }, []);

  const checkForUpdates = async () => {
    setChecking(true);
    setUpdateStatus("Checking for updates...");

    try {
      const res = await fetch("/api/check-updates", { credentials: "include" });
      const data = await res.json();

      if (!data.updatesAvailable) {
        setUpdateStatus("✅ You are up to date.");
        // Clear after 3.5 seconds
        clearTimeout(timeoutId);
        const id = setTimeout(() => setUpdateStatus(""), 3500);
        setTimeoutId(id);
      } else {
        const confirmUpdate = window.confirm(
          "Updates are available. Would you like to update now?"
        );
        if (confirmUpdate) {
          setUpdateStatus("Updating...");
          const updateRes = await fetch("/api/self-update", {
            method: "POST",
            credentials: "include",
          });
          const updateData = await updateRes.json();
          if (!updateRes.ok || updateData.success === false) {
            setUpdateStatus(updateData.message || "❌ Update failed.");
          } else {
            setUpdateStatus(updateData.message);
          }
        } else {
          setUpdateStatus("⚠️ Update skipped.");
          clearTimeout(timeoutId);
          const id = setTimeout(() => setUpdateStatus(""), 5000);
          setTimeoutId(id);
        }
      }
    } catch (err) {
      console.error(err);
      setUpdateStatus("❌ Failed to check for updates.");
      clearTimeout(timeoutId);
      const id = setTimeout(() => setUpdateStatus(""), 5000);
      setTimeoutId(id);
    } finally {
      setChecking(false);
    }
  };

  if (!loggedIn) {
    return <Login onLoginSuccess={() => setLoggedIn(true)} />;
  }

  return (
    <div>
      <h1>Signage Management</h1>

      {/* Update section */}
      <div style={{ marginBottom: "20px" }}>
        <button onClick={checkForUpdates} disabled={checking}>
          {checking ? "Checking..." : "Check for Updates"}
        </button>
        {updateStatus && (
          <div style={{ marginTop: "8px", color: checking ? "gray" : "white" }}>
            {updateStatus}
          </div>
        )}
      </div>

      <TwoSidesUploader />
    </div>
  );
};

export default App;
