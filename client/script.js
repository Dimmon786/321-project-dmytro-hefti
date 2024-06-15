document.addEventListener("DOMContentLoaded", () => {
    const registerButton = document.getElementById('register');
    const loginButton = document.getElementById('login');
    const joinChatButton = document.getElementById('join-chat');
    const sendMessageButton = document.getElementById('send-message');
    const updateUsernameButton = document.getElementById('update-username');
    const registerMessage = document.getElementById('register-message');
    let socket;
    let username = '';

    // Registration
    if (registerButton) {
        registerButton.addEventListener('click', () => {
            const username = document.getElementById('register-username').value;
            const password = document.getElementById('register-password').value;

            if (username && password) {
                fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                }).then(response => response.json())
                .then(data => {
                    if (data.success) {
                        registerMessage.textContent = 'Registration successful! You can now log in.';
                        registerMessage.classList.remove('hidden');
                        registerMessage.classList.add('text-green-500');
                        setTimeout(() => {
                            window.location.href = '/login.html';
                        }, 2000); // Redirect after 2 seconds
                    } else {
                        registerMessage.textContent = data.message;
                        registerMessage.classList.remove('hidden');
                        registerMessage.classList.add('text-red-500');
                    }
                }).catch(error => {
                    console.error('Error during fetch:', error);
                    registerMessage.textContent = 'Failed to connect to server.';
                    registerMessage.classList.remove('hidden');
                    registerMessage.classList.add('text-red-500');
                });
            } else {
                alert('Please enter a username and password.');
            }
        });
    }

    // Login
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            if (username && password) {
                fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                }).then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Login successful!');
                        window.location.href = '/chat.html';  // Redirect to chat page
                    } else if (data.message === 'User does not exist.') {
                        if (confirm('User does not exist. Do you want to register?')) {
                            window.location.href = '/register.html';
                        }
                    } else {
                        alert(data.message);
                    }
                }).catch(error => {
                    console.error('Error during fetch:', error);
                });
            } else {
                alert('Please enter a username and password.');
            }
        });
    }

    // Join Chat
    if (joinChatButton) {
        joinChatButton.addEventListener('click', () => {
            username = document.getElementById('username').value;
            if (username) {
                document.getElementById('username-section').style.display = 'none';
                document.getElementById('chat-section').style.display = 'flex';

                socket = new WebSocket("ws://localhost:3000");
                socket.addEventListener("open", (event) => {
                    console.log("WebSocket connected.");
                    socket.send(JSON.stringify({ type: 'join', username }));
                });
                setupSocketListeners();
            }
        });
    }

    // Update Username
    if (updateUsernameButton) {
        updateUsernameButton.addEventListener('click', () => {
            const newUsername = document.getElementById('new-username').value;
            if (newUsername) {
                const message = {
                    type: 'update-username',
                    oldUsername: username,
                    newUsername
                };
                socket.send(JSON.stringify(message));
                username = newUsername;
                document.getElementById('new-username').value = '';
            }
        });
    }

    // Send Message
    if (sendMessageButton) {
        sendMessageButton.addEventListener('click', () => {
            const message = document.getElementById('message-input').value;
            if (message) {
                socket.send(JSON.stringify({ type: 'message', text: message, username }));
                document.getElementById('message-input').value = '';
            }
        });
    }

    const createMessage = (message) => {
        const p = document.createElement("p");
        p.textContent = message;
        document.getElementById("messages").appendChild(p);
    };

    const setupSocketListeners = () => {
        socket.addEventListener("message", (event) => {
            console.log(`Received message: ${event.data}`);
            const parsedMessage = JSON.parse(event.data);
            if (parsedMessage.type === 'message') {
                createMessage(`${parsedMessage.username}: ${parsedMessage.text}`);
            } else if (parsedMessage.type === 'users') {
                const participantsElement = document.getElementById("participants");
                if (participantsElement) {
                    const users = parsedMessage.users.join(', ');
                    participantsElement.textContent = `Active users: ${users}`;
                }
            }
        });

        socket.addEventListener("close", (event) => {
            console.log("WebSocket closed.");
        });

        socket.addEventListener("error", (event) => {
            console.error("WebSocket error:", event);
        });
    };
});
