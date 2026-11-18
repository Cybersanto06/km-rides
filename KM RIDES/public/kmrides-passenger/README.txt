KM RIDES - PASSENGER APP (PWA)  version 1.0.0
==============================================

FILES (upload all of them, keeping the icons folder, to the ROOT of kmrides.app)
  index.html            the passenger app
  manifest.webmanifest  install information (name, icons, colours)
  sw.js                 service worker (updates + offline)
  offline.html          shown when there is no connection and nothing is saved yet
  icons/                app icons

EVERY RELEASE (so phones update properly)
  1. Change the version in TWO places and keep them identical:
       index.html  ->  const APP_VERSION = '1.0.0';
       sw.js       ->  const VERSION = '1.0.0';
  2. Upload all changed files.
  3. Phones that already have the app will show "A new version of KM Rides is ready - Update".
  Suggested tag in your notes / Git:  passenger-1.0.0

SERVER SETTINGS (important)
  sw.js, index.html and manifest.webmanifest must NOT be cached for long by the server,
  or phones will see new versions late. On Firebase Hosting add this to firebase.json:

  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "README.txt", "**/.*", "**/node_modules/**"],
    "headers": [
      { "source": "/sw.js",                "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "/index.html",           "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "/manifest.webmanifest", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
    ]
  }

THE DRIVER APP
  This service worker never touches anything under /driver/. Keep the driver app out of this folder.
  When it goes online, give it its own address (for example driver.kmrides.app).

CHECKING THE INSTALL
  Open the site on a phone over HTTPS.
  Android Chrome: menu -> "Install app".   iPhone Safari: Share -> "Add to Home Screen".
  Profile tab shows the version number at the bottom.
