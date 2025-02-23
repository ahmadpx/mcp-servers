const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const { McpServer } = require("@modelcontextprotocol/sdk/server");
const { z } = require("zod");
const fs = require("fs").promises;
const path = require("path");

const LOG_FILE = path.join(__dirname, "logs", "dev.log");
const MAX_LINES = 15;

async function ensureLogDirectory() {
  const logDir = path.dirname(LOG_FILE);
  try {
    await fs.access(logDir);
  } catch {
    await fs.mkdir(logDir, { recursive: true });
  }
}

async function readLastLines() {
  try {
    const content = await fs.readFile(LOG_FILE, "utf-8");
    const lines = content.split("\n");
    return lines.slice(-MAX_LINES).join("\n");
  } catch (err) {
    if (err.code === "ENOENT") {
      return ""; // Return empty string if file doesn't exist
    }
    throw err;
  }
}

async function cleanupFile() {
  try {
    const content = await fs.readFile(LOG_FILE, "utf-8");
    const lines = content.split("\n");
    const keptLines = lines.slice(-MAX_LINES);
    await fs.writeFile(LOG_FILE, keptLines.join("\n"));
  } catch (err) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
}

const server = new McpServer({
  version: "1.0.0",
  name: "Log File Reader",
});

server.tool("readLogs", {}, async () => {
  try {
    await ensureLogDirectory();
    const logs = await readLastLines();
    await cleanupFile();

    return {
      content: [
        {
          type: "text",
          text: logs,
        },
      ],
    };
  } catch (err) {
    console.error("Error reading logs:", err.message);
    throw err;
  }
});

// Start the server with stdio transport
const transport = new StdioServerTransport();
server.listen(transport);
