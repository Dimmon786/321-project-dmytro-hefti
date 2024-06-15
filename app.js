const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const livereload = require("livereload");
const connectLiveReload = require("connect-livereload");
const { initializeWebsocketServer } = require("./server/websocketserver");
const { initializeAPI } = require("./server/api");
const { initializeMariaDB, initializeDBSchema, executeSQL } = require("./server/database");

// Create the express server
const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());

const env = process.env.NODE_ENV || "development";
if (env !== "production") {
  const liveReloadServer = livereload.createServer();
  liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      liveReloadServer.refresh("/");
    }, 100);
  });
  app.use(connectLiveReload());
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("client"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/index.html");
});

// User registration endpoint
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const users = await executeSQL('SELECT * FROM users WHERE username = ?', [username]);

  if (users.length > 0) {
    return res.json({ success: false, message: 'Username already exists.' });
  }

  await executeSQL('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
  res.json({ success: true });
});

// User login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = await executeSQL('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);

  if (users.length === 0) {
    return res.json({ success: false, message: 'Invalid username or password.' });
  }

  res.json({ success: true });
});

initializeWebsocketServer(server);
initializeAPI(app);

(async function () {
  try {
    initializeMariaDB();
    await initializeDBSchema();

    const serverPort = process.env.PORT || 3000;
    server.listen(serverPort, () => {
      console.log(`Express Server started on port ${serverPort} as '${env}' Environment`);
    });
  } catch (error) {
    console.error('Failed to initialize the application:', error);
    process.exit(1);
  }
})();