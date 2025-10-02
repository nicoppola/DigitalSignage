import './App.css'

import React, { useState, useEffect } from 'react';
import Login from './components/Login'
import TwoSidesUploader from './components/TwoSidesUploader'

const App = () => {
  const [loggedIn, setLoggedIn] = useState(false);

  // Check if user is logged in by hitting a protected route
  useEffect(() => {
    fetch('/config?side=left', { credentials: 'include' })
      .then(res => {
        if (res.ok) setLoggedIn(true);
      })
      .catch(() => setLoggedIn(false));
  }, []);

  if (!loggedIn) {
    return <Login onLoginSuccess={() => setLoggedIn(true)} />;
  }

  return (
    <div>
      <h1>Signage Management</h1>
      <TwoSidesUploader/>
    </div>
  );
};

export default App;
