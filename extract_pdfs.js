import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const inputDir = path.join(process.cwd(), "archive");
const outputDir = path.join(process.cwd(), "archive_txt");

// IMPORTANT: this must be the FULL path to pdftotext.exe (not the folder)
const PDFTOTEXT = "C:\\Users\\Daria\\Downloads\\Release-25.12.0-0\\poppler-25.12.0\\Library\\bin\\pdftotext.exe";

console.log("Input dir:", inputDir);
console.log("Output dir:", outputDir);
console.log("Using pdftotext:", PDFTOTEXT);

if (!fs.existsSync(inputDir)) {
  console.error("ERROR: archive folder not found:", inputDir);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
  console.log("Created output folder:", outputDir);
}

const files = fs.readdirSync(inputDir).filter(f => f.toLowerCase().endsWith(".pdf"));

if (files.length === 0) {
  console.error("ERROR: no PDFs found in:", inputDir);
  process.exit(1);
}

console.log("Found PDFs:", files);

for (const file of files) {
  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, file.replace(/\.pdf$/i, ".txt"));

  // Build the command explicitly
  const cmd = `"${PDFTOTEXT}" "${inputPath}" "${outputPath}"`;

  try {
    console.log("\nRUN:", cmd);

    // Execute and capture output if it errors
    execSync(cmd, { stdio: "pipe" });

    const size = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;

    if (size > 20) {
      console.log("OK:", path.basename(outputPath), `(bytes: ${size})`);
    } else {
      console.log("OK but empty:", path.basename(outputPath), `(bytes: ${size})`);
    }
  } catch (err) {
    console.error("FAILED:", file);
    console.error("Command was:", cmd);
    console.error("Error:", String(err?.message || err));
  }
}

console.log("\nDone. Check the archive_txt folder.");
