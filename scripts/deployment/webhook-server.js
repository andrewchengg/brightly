const http = require("http");
const crypto = require("crypto");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// Configuration
const PORT = process.env.PORT || 3001;
const SECRET = process.env.WEBHOOK_SECRET; // Should be set in environment
const DEPLOY_BRANCH = "main";

// Deployment commands
const DEPLOY_COMMANDS = [
  "cd /var/www/brightly",
  "git pull origin main",
  "npm install",
  "npx prisma generate",
  "npm run build",
  "pm2 reload brightly-production --update-env", // Using reload instead of restart for zero-downtime
].join(" && ");

function verifySignature(payload, signature) {
  if (!SECRET) {
    console.warn("Warning: WEBHOOK_SECRET not set");
    return true;
  }

  const hmac = crypto.createHmac("sha256", SECRET);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    return res.end("Method Not Allowed");
  }

  // Collect the payload
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));

  try {
    await new Promise((resolve, reject) => {
      req.on("end", resolve);
      req.on("error", reject);
    });

    const payload = Buffer.concat(chunks).toString();
    const signature = req.headers["x-hub-signature-256"];

    // Verify webhook signature
    if (!signature || !verifySignature(payload, signature)) {
      console.error("Invalid signature");
      res.writeHead(401, { "Content-Type": "text/plain" });
      return res.end("Unauthorized");
    }

    const event = JSON.parse(payload);

    // Only deploy on push to main branch
    if (event.ref !== `refs/heads/${DEPLOY_BRANCH}`) {
      console.log(
        `Skipping deployment: Push was to ${event.ref}, not ${DEPLOY_BRANCH}`
      );
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end("Skipped: Not main branch");
    }

    console.log("Starting deployment...");
    const { stdout, stderr } = await execAsync(DEPLOY_COMMANDS);
    console.log("Deployment stdout:", stdout);
    if (stderr) console.error("Deployment stderr:", stderr);

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Deployment successful");
  } catch (error) {
    console.error("Deployment error:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Deployment failed");
  }
});

server.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
