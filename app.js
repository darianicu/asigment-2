const output = document.getElementById("output");
const userInput = document.getElementById("userInput");

// Hour 4 state: withdrawal level (0..4)
let withdrawalLevel = 0;

// Store last 5 questions (to detect repetition)
const recentQuestions = [];

// Simple word lists (you can edit these later)
const aggressiveWords = ["prove", "deserve", "liar", "idiot", "stupid", "torture", "worst"];
const ideologyWords = ["communism", "capitalism", "left", "right", "politics", "blame"];
const gentleWords = ["please", "thank", "sorry", "are you ok", "helped you", "survive"];

function norm(s) {
  return (s || "").toLowerCase().trim();
}

function isRepeated(q) {
  const nq = norm(q);
  return recentQuestions.some(r => norm(r) === nq);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function updateWithdrawal(q) {
  const nq = norm(q);

  const hasAggressive = aggressiveWords.some(w => nq.includes(w));
  const hasIdeology = ideologyWords.some(w => nq.includes(w));
  const hasGentle = gentleWords.some(w => nq.includes(w));
  const repeated = isRepeated(q);

  // Increase withdrawal when pressured / repeated / ideology
  if (hasAggressive || hasIdeology || repeated) withdrawalLevel += 1;

  // Decrease withdrawal when gentle
  if (hasGentle) withdrawalLevel -= 1;

  withdrawalLevel = clamp(withdrawalLevel, 0, 4);
}

function show(text) {
  output.textContent = text || "";
}

async function askAI(userText) {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userText,
      withdrawalLevel,
      recentQuestions
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return (data.text || "").trim();
}

// Handle Enter to submit
userInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();

    const q = userInput.value.trim();
    if (!q) return;

    userInput.value = "";

    updateWithdrawal(q);

    recentQuestions.push(q);
    if (recentQuestions.length > 5) recentQuestions.shift();

    // Silence chance when withdrawn
    if (withdrawalLevel >= 3 && Math.random() < 0.4) {
      show("...");
      return;
    }

    show("...");

    try {
      const answer = await askAI(q);

      // If shut down and empty output, use fixed boundary line
      if (!answer && withdrawalLevel >= 4) {
        show("I will not be questioned like that.");
        return;
      }

      show(answer);
    } catch (err) {
      console.error(err);
      show("I cannot speak right now.");
    }
  }
});

// Idle behavior: occasionally speak if nothing is shown
setInterval(() => {
  if (!output.textContent.trim() && Math.random() < 0.08) {
    output.textContent = "Speak slowly. I learned to listen.";
  }
}, 8000);
