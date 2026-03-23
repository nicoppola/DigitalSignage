const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const simpleGit = require('simple-git');

const router = express.Router();
const git = simpleGit(path.join(__dirname, '..'));

// POST /api/self-update - Pull latest changes and restart
router.post('/self-update', async (req, res) => {
  try {
    await git.fetch();

    const local = await git.revparse(['HEAD']);
    const remote = await git.revparse(['origin/main']);

    if (local === remote) {
      return res.json({ updated: false, message: 'Already up to date.' });
    }

    await git.pull('origin', 'main');

    // Update systemd service file and reload daemon
    const projectRoot = path.join(__dirname, '..', '..');
    const serviceFile = path.join(projectRoot, 'setup', 'digitalsignage-server.service');
    exec(`sudo cp ${serviceFile} /etc/systemd/system/ && sudo systemctl daemon-reload`, (cpErr) => {
      if (cpErr) {
        console.warn('Could not update service file:', cpErr.message);
      }
    });

    const serverDir = path.join(__dirname, '..');
    const appDir = path.join(__dirname, '..', '..', 'management-app');

    exec('npm install', { cwd: serverDir }, (err, stdout, stderr) => {
      if (err) {
        console.error('npm install (server) failed:', stderr);
        return res.status(500).json({ error: 'npm install failed' });
      }
      console.log(stdout);

      // Rebuild management app so frontend changes take effect
      exec('npm install && npm run build', { cwd: appDir }, (err2, stdout2, stderr2) => {
        if (err2) {
          console.error('Management app build failed:', stderr2);
          // Still restart — server-side changes should apply
        } else {
          console.log(stdout2);
        }

        res.json({ updated: true, message: 'Updated successfully, rebooting server... \nRefresh page after a few seconds' });

        setTimeout(() => {
          process.exit(0);
        }, 1000);
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed.' });
  }
});

// GET /api/check-updates - Check if updates are available
router.get('/check-updates', async (req, res) => {
  try {
    await git.fetch();

    const local = (await git.revparse(['HEAD'])).trim();
    const remote = (await git.revparse(['origin/main'])).trim();

    if (local === remote) {
      return res.json({ updatesAvailable: false, message: 'You are up to date.' });
    } else {
      return res.json({ updatesAvailable: true, message: 'Updates are available.' });
    }
  } catch (err) {
    console.error('Git check failed:', err);
    return res.status(500).json({ error: 'Could not check for updates.' });
  }
});

// POST /api/reboot - Reboot the device
router.post('/reboot', (req, res) => {
  try {
    console.log("Reboot requested by user:", req.session?.user);

    res.json({ message: "Rebooting the Pi..." });

    setTimeout(() => {
      exec('sudo reboot', (err, stdout, stderr) => {
        if (err) {
          console.error('Reboot failed:', stderr);
        }
      });
    }, 1000);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reboot." });
  }
});

module.exports = router;
