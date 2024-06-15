const WebSocket = require("ws");
const { executeSQL } = require("./database");

const clients = [];

/**
 * Initializes the websocket server.
 * @example
 * initializeWebsocketServer(server);
 * @param {Object} server - The http server object.
 * @returns {void}
 */
const initializeWebsocketServer = (server) => {
  const websocketServer = new WebSocket.Server({ server });
  websocketServer.on("connection", onConnection);
};

/**
 * Handles a new websocket connection.
 * @example
 * onConnection(ws);
 * @param {Object} ws - The websocket object.
 * @returns {void}
 */
const onConnection = (ws) => {
  console.log("New websocket connection");

  // Send existing messages to the newly connected client
  sendExistingMessages(ws);

  ws.on("message", (message) => onMessage(ws, message));
};

/**
 * Sends existing messages to the newly connected client.
 * @param {Object} ws - The websocket object.
 */
const sendExistingMessages = async (ws) => {
  const messages = await executeSQL("SELECT m.message, u.username FROM messages m JOIN users u ON m.user_id = u.id");
  messages.forEach((msg) => {
    const message = {
      type: "message",
      text: msg.message,
      username: msg.username
    };
    ws.send(JSON.stringify(message));
  });
};

/**
 * Handles a new message from a websocket connection.
 * @example
 * onMessage(ws, messageBuffer);
 * @param {Object} ws - The websocket object.
 * @param {Buffer} messageBuffer - The message buffer. IMPORTANT: Needs to be converted to a string or JSON object first.
 */
const onMessage = async (ws, messageBuffer) => {
  const messageString = messageBuffer.toString();
  const message = JSON.parse(messageString);
  console.log("Received message: " + messageString);

  // The message type is checked and the appropriate action is taken
  switch (message.type) {
    case "join": {
      clients.push({ ws, username: message.username });
      const usersMessage = {
        type: "users",
        users: clients.map((client) => client.username),
      };
      clients.forEach((client) => {
        client.ws.send(JSON.stringify(usersMessage));
      });
      ws.on("close", () => onDisconnect(ws));
      break;
    }
    case "message": {
      await saveMessage(message);
      clients.forEach((client) => {
        client.ws.send(messageString);
      });
      break;
    }
    case "update-username": {
      updateUsername(ws, message.oldUsername, message.newUsername);
      break;
    }
    default: {
      console.log("Unknown message type: " + message.type);
    }
  }
};

/**
 * Saves a message to the database.
 * @param {Object} message - The message object containing username and text.
 */
const saveMessage = async (message) => {
  const users = await executeSQL('SELECT id FROM users WHERE username = ?', [message.username]);
  if (users.length > 0) {
    const userId = users[0].id;
    await executeSQL('INSERT INTO messages (user_id, message) VALUES (?, ?)', [userId, message.text]);
  }
};

/**
 * Updates a user's username.
 * @param {Object} ws - The websocket object.
 * @param {string} oldUsername - The old username.
 * @param {string} newUsername - The new username.
 */
const updateUsername = async (ws, oldUsername, newUsername) => {
  const index = clients.findIndex(client => client.ws === ws && client.username === oldUsername);
  if (index !== -1) {
    clients[index].username = newUsername;
    await executeSQL('UPDATE users SET username = ? WHERE username = ?', [newUsername, oldUsername]);
    const usersMessage = {
      type: "users",
      users: clients.map((client) => client.username),
    };
    clients.forEach((client) => {
      client.ws.send(JSON.stringify(usersMessage));
    });
  }
};

/**
 * Handles a websocket disconnect. All other clients are notified about the disconnect.
 * @example
 * onDisconnect(ws);
 * @param {Object} ws - The websocket object.
 * @returns {void}
 */
const onDisconnect = (ws) => {
  const index = clients.findIndex((client) => client.ws === ws);
  if (index !== -1) {
    clients.splice(index, 1);
  }
  const usersMessage = {
    type: "users",
    users: clients.map((client) => client.username),
  };
  clients.forEach((client) => {
    client.ws.send(JSON.stringify(usersMessage));
  });
};

module.exports = { initializeWebsocketServer };
