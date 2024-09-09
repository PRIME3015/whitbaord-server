const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// Create the server using HTTP and attach the Socket.io server to it
const server = http.createServer(app);

// Enable CORS to allow cross-origin requests
app.use(cors());

let elements = []; // This will hold the whiteboard elements
let cursors = {}; // Track cursor positions by socket ID

// Initialize Socket.io and configure CORS
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins, you can restrict it to a specific origin for security
    methods: ["GET", "POST"], // Allowed HTTP methods
  },
});

// When a client connects
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Send the current state of the whiteboard and all cursors to the newly connected user
  socket.emit("whiteboard-state", elements);
  socket.emit("all-cursors", cursors);

  // Handle element updates from the client
  socket.on("element-update", (elementData) => {
    updateElementInElements(elementData); // Update the elements array

    // Broadcast the updated element to all other connected clients
    socket.broadcast.emit("element-update", elementData);
  });

  // Handle whiteboard clear action
  socket.on("whiteboard-clear", () => {
    elements = []; // Clear all elements
    io.emit("whiteboard-clear"); // Notify all clients to clear their boards
  });

  // Handle cursor position updates
  socket.on("cursor-position", (cursorData) => {
    // Save the cursor position associated with the user's socket ID
    cursors[socket.id] = {
      ...cursorData,
      userId: socket.id,
    };

    // Broadcast the updated cursor position to all other clients
    socket.broadcast.emit("cursor-position", cursors[socket.id]);
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);

    // Remove the user's cursor when they disconnect
    delete cursors[socket.id];

    // Notify all other clients that the user disconnected and remove their cursor
    socket.broadcast.emit("user-disconnected", socket.id);
  });
});

// Serve a simple GET endpoint for the server's root URL
app.get("/", (req, res) => {
  res.send("Hello, the server is running!");
});

// Start the server on the specified port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Function to update elements array with new or updated element data
const updateElementInElements = (elementData) => {
  const index = elements.findIndex((element) => element.id === elementData.id);

  if (index === -1) {
    // If the element doesn't exist, add it
    elements.push(elementData);
  } else {
    // If the element exists, update it
    elements[index] = elementData;
  }
};
