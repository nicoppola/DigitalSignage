import Login from "./components/Login/Login.tsx";
import TwoSidesUploader from "./components/TwoSidesUploader/TwoSidesUploader.tsx";
import { useUpdateChecker } from "./hooks/useUpdateChecker.ts";
import { useReboot } from "./hooks/useReboot.ts";
import { useAuth } from "./hooks/useAuth.ts";
import "./App.css";

const App = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { checking, updateStatus, checkForUpdates } = useUpdateChecker();
  const { reboot } = useReboot();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => window.location.reload()} />;
  }

  return (
    <div>
      <h1>Signage Management</h1>

      <div className="button-container">
        <div className="button-row">
          <button onClick={checkForUpdates} disabled={checking}>
            {checking ? "Checking..." : "Check for Updates"}
          </button>

          <button onClick={reboot}>
            Reboot Pi
          </button>
        </div>
        {updateStatus && (
          <div className={`status-text${checking ? " checking" : ""}`}>
            {updateStatus}
          </div>
        )}
      </div>

      <TwoSidesUploader />
    </div>
  );
};

export default App;
