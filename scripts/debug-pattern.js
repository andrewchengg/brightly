const fs = require("fs");
const path = require("path");

// Read the documentation file
const docPath = path.join(__dirname, "../docs/SESSION_MANAGEMENT.md");
const docContent = fs.readFileSync(docPath, "utf8");

console.log("📄 First 10 lines of the file:");
const lines = docContent.split("\n").slice(0, 10);
lines.forEach((line, index) => {
  console.log(`${index + 1}: "${line}"`);
});

console.log("\n🔍 Testing different patterns:");

// Test pattern 1: Simple UUID
const pattern1 =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
const matches1 = docContent.match(pattern1);
console.log(
  `Pattern 1 (simple UUID): Found ${matches1 ? matches1.length : 0} matches`
);
if (matches1) console.log(`First 3: ${matches1.slice(0, 3).join(", ")}`);

// Test pattern 2: Checkmark + Completed
const pattern2 =
  /✅.*?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/g;
const matches2 = [];
let match2;
while ((match2 = pattern2.exec(docContent)) !== null) {
  matches2.push(match2[1]);
}
console.log(
  `Pattern 2 (checkmark + any text + UUID): Found ${matches2.length} matches`
);
if (matches2.length > 0)
  console.log(`First 3: ${matches2.slice(0, 3).join(", ")}`);

// Test pattern 3: Any line with UUID
const pattern3 =
  /.*?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/g;
const matches3 = [];
let match3;
while ((match3 = pattern3.exec(docContent)) !== null) {
  matches3.push(match3[1]);
}
console.log(`Pattern 3 (any line with UUID): Found ${matches3.length} matches`);
if (matches3.length > 0)
  console.log(`First 3: ${matches3.slice(0, 3).join(", ")}`);
