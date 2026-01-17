console.log("VOICE.JS START (avatar + browser STT -> /api/ask -> forced EN female TTS)");

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

// =====================
// UI ELEMENTS
// =====================
const statusEl = document.getElementById("status");
const micBtn = document.getElementById("micBtn");
const subtitleEl = document.getElementById("subtitle");

// =====================
// 3D SCENE
// =====================
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 1.55, 2.2);

scene.add(new THREE.DirectionalLight(0xffffff, 1.2).position.set(2, 3, 2));
scene.add(new THREE.DirectionalLight(0xffffff, 0.6).position.set(-2, 2, 1));
scene.add(new THREE.AmbientLight(0xffffff, 0.35));

const loader = new GLTFLoader();
let avatar = null;
let jawBone = null;

statusEl.textContent = "Loading avatar…";

loader.load(
  "avatar.glb",
  (gltf) => {
    avatar = gltf.scene;
    scene.add(avatar);

    avatar.traverse((o) => {
      const n = (o.name || "").toLowerCase();
      if (!jawBone && (n.includes("jaw") || n.includes("mandible") || n.includes("chin"))) {
        jawBone = o;
      }
    });

    console.log("Avatar loaded. Jaw bone:", jawBone ? jawBone.name : "(none)");
    statusEl.textContent = "Idle";
  },
  undefined,
  () => {
    statusEl.textContent = "Failed to load avatar.glb";
  }
);

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// =====================
// AVATAR ANIMATION
// =====================
let talking = false;
let talkPhase = 0;

function animate() {
  requestAnimationFrame(animate);

  if (avatar) {
    avatar.rotation.y = Math.sin(Date.now() * 0.00035) * 0.04;

    if (talking) {
      talkPhase += 0.22;
      const open = (Math.sin(talkPhase) * 0.5 + 0.5) * 0.35;
      if (jawBone) jawBone.rotation.x = -open;
    } else if (jawBone) {
      jawBone.rotation.x = 0;
    }
  }

  renderer.render(scene, camera);
}
animate();

// =====================
// SPEECH TO TEXT (ENGLISH ONLY)
// =====================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let recognizing = false;

if (!SpeechRecognition) {
  statusEl.textContent = "Speech recognition not supported";
  subtitleEl.textContent = "Use Chrome or Edge.";
} else {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    recognizing = true;
    statusEl.textContent = "Listening…";
    subtitleEl.textContent = "Listening…";
  };

  recognition.onend = () => {
    recognizing = false;
    if (statusEl.textContent === "Listening…") statusEl.textContent = "Idle";
  };

  recognition.onerror = () => {
    recognizing = false;
    statusEl.textContent = "Mic error";
  };

  recognition.onresult = async (event) => {
    const text = event.results?.[0]?.[0]?.transcript?.trim();
    if (!text) return;
    subtitleEl.textContent = `You: ${text}`;
    await askAndSpeak(text);
  };
}

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  recognizing ? recognition.stop() : recognition.start();
});

// =====================
// FORCE ENGLISH FEMALE VOICE
// =====================
function pickEnglishFemaleVoice() {
  const voices = window.speechSynthesis.getVoices() || [];

  const english = voices.filter(v =>
    v.lang && v.lang.toLowerCase().startsWith("en")
  );

  const femaleHints = [
    "zira", "jenny", "aria", "samantha", "victoria",
    "google uk english female", "google us english"
  ];

  for (const hint of femaleHints) {
    const v = english.find(x =>
      (x.name || "").toLowerCase().includes(hint)
    );
    if (v) return v;
  }

  return english[0] || null;
}

// Ensure voices are loaded
window.speechSynthesis.onvoiceschanged = () => {
  console.log(
    "Voices loaded:",
    window.speechSynthesis.getVoices().map(v => `${v.name} (${v.lang})`)
  );
};

// =====================
// ASK SERVER + SPEAK
// =====================
async function askAndSpeak(userText) {
  statusEl.textContent = "Thinking…";

  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userText }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    statusEl.textContent = "Server error";
    return;
  }

  const answer = (data.text || "").trim();
  subtitleEl.textContent = answer;
  if (!answer) return;

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(answer);
  utter.lang = "en-US";

  const voice = pickEnglishFemaleVoice();
  if (voice) utter.voice = voice;

  utter.rate = 0.95;
  utter.pitch = 1.05;

  talking = true;
  statusEl.textContent = "Speaking…";

  utter.onend = () => {
    talking = false;
    statusEl.textContent = "Idle";
  };

  utter.onerror = () => {
    talking = false;
    statusEl.textContent = "TTS error";
  };

  window.speechSynthesis.speak(utter);
}
