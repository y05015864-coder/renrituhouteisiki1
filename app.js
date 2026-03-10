// ======= 連立方程式ドリル（x, y を整数解に設定） =======

// 進捗保存（個人情報なし）
const STORAGE_KEY = "lin-sys-progress-v1";
let totalTried = 0;
let totalCorrect = 0;

// 現在の問題データ
let current = null; // { a,b,c,d,e,f, sol:{x,y}, steps:[string] }

// 要素参照
const levelSel = document.getElementById("level");
const newBtn = document.getElementById("newBtn");
const equationsEl = document.getElementById("equations");
const form = document.getElementById("answerForm");
const inputX = document.getElementById("ansX");
const inputY = document.getElementById("ansY");
const nextBtn = document.getElementById("nextBtn");
const hintBtn = document.getElementById("hintBtn");
const feedbackEl = document.getElementById("feedback");
const solutionBox = document.getElementById("solutionBox");
const solutionStepsEl = document.getElementById("solutionSteps");
const progressEl = document.getElementById("progress");
const correctEl = document.getElementById("correctCount");
const accuracyEl = document.getElementById("accuracy");

// ユーティリティ
const gcd = (a, b) => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};
const lcm = (a, b) => a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b);

function formatTerm(coef, v, isFirst = false) {
  if (coef === 0) return isFirst ? "0" : "";
  const sign = coef > 0 ? (isFirst ? "" : " + ") : (isFirst ? "-" : " - ");
  const abs = Math.abs(coef);
  const mag = abs === 1 ? "" : String(abs);
  return `${sign}${mag}${v}`;
}
function formatEq(a, b, c) {
  // a x + b y = c を見やすく
  const left = `${formatTerm(a, "x", true)}${formatTerm(b, "y")}`.replace(/^0 \+ /, "").replace(/^0$/, "0");
  return `${left} = ${c}`;
}

// 文字列 → 数値（整数/小数/分数 "p/q" を許容）
function parseNumber(s) {
  if (!s) return NaN;
  let t = s.trim()
    .replace(/，/g, ",")
    .replace(/[－ー—−]/g, "-")
    .replace(/[＋+]/g, "+")
    .replace(/[−]/g, "-")
    .replace(/[／]/g, "/");
  // 小数
  if (/^[+-]?\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  // 分数
  if (/^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(t)) {
    const [p, q] = t.split("/").map(Number);
    if (q === 0) return NaN;
    return p / q;
  }
  return NaN;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 問題生成（整数解）
// レベルに応じて係数や解のレンジを調整
function generateProblem(level = "easy") {
  const solRange = level === "easy" ?  [-5, 5] : [-9, 9];
  const coefRange = level === "easy" ? [-5, 5] : [-9, 9];

  let x = 0, y = 0;
  // 解を決める（0 もOK）
  do {
    x = randInt(solRange[0], solRange[1]);
    y = randInt(solRange[0], solRange[1]);
  } while (x === 0 && y === 0); // どちらも0は味気ないので避ける

  let a, b, d, e, det;
  // 係数をランダムにしつつ、行列が正則（det ≠ 0）になるまで
  for (;;) {
    a = randInt(coefRange[0], coefRange[1]);
    b = randInt(coefRange[0], coefRange[1]);
    d = randInt(coefRange[0], coefRange[1]);
    e = randInt(coefRange[0], coefRange[1]);

    // 全て0や小さすぎる組合せを避ける
    if (a === 0 && b === 0) continue;
    if (d === 0 && e === 0) continue;

    det = a * e - b * d;
    if (det !== 0) break;
  }

  // 定数項（整数に必ずなる）
  const c = a * x + b * y;
  const f = d * x + e * y;

  const steps = buildEliminationSteps(a, b, c, d, e, f, x, y);
  return { a, b, c, d, e, f, sol: { x, y }, steps };
}

// 加減法の手順を生成（見やすいよう整数係数のみ使用）
function buildEliminationSteps(a, b, c, d, e, f, x, y) {
  const eq1 = formatEq(a, b, c);
  const eq2 = formatEq(d, e, f);

  // どちらの変数を消すか：LCMが小さい方
  const Lx = lcm(Math.abs(a), Math.abs(d)) || Infinity;
  const Ly = lcm(Math.abs(b), Math.abs(e)) || Infinity;

  let target = "x";
  if (!Number.isFinite(Lx) && Number.isFinite(Ly)) target = "y";
  else if (Number.isFinite(Lx) && Number.isFinite(Ly)) target = Lx <= Ly ? "x" : "y";
  else target = "x";

  let m1 = 1, m2 = 1;
  if (target === "x") {
    const L = lcm(Math.abs(a), Math.abs(d));
    m1 = a === 0 ? 0 : L / Math.abs(a);
    m2 = d === 0 ? 0 : L / Math.abs(d);
    // 符号を反転させて和で消えるようにする
    m1 *= Math.sign(a || 1);
    m2 *= -Math.sign(d || 1);
  } else {
    const L = lcm(Math.abs(b), Math.abs(e));
    m1 = b === 0 ? 0 : L / Math.abs(b);
    m2 = e === 0 ? 0 : L / Math.abs(e);
    m1 *= Math.sign(b || 1);
    m2 *= -Math.sign(e || 1);
  }

  // E1*m1 + E2*m2
  const A = a * m1 + d * m2;
  const B = b * m1 + e * m2;
  const C = c * m1 + f * m2;

  let solvedVar, solvedVal;
  if (target === "x") {
    // A x が 0 になるので、 B y = C
    solvedVar = "y";
    solvedVal = B !== 0 ? C / B : y; // 安全策
  } else {
    solvedVar = "x";
    solvedVal = A !== 0 ? C / A : x;
  }

  // もう一方は代入で
  const otherVar = solvedVar === "x" ? "y" : "x";
  const otherVal = otherVar === "x"
    ? (c - b * solvedVal) / a  // a x + b y = c
    : (c - a * solvedVal) / b;

  const lines = [];
  lines.push("【問題】");
  lines.push(eq1);
  lines.push(eq2);
  lines.push("");
  lines.push("【加減法（消去法）の一例】");
  lines.push(`消去する文字：${target}`);
  lines.push(`式(1)に ${m1} を、式(2)に ${m2} をかけて足し合わせます。`);
  lines.push(`→ ${formatEq(a * m1, b * m1, c * m1)}`);
  lines.push(`→ ${formatEq(d * m2, e * m2, f * m2)}`);
  lines.push("――――――――――――――― 加える ―――――――――――――――");
  lines.push(`→ ${formatEq(A, B, C)}`);
  lines.push(`ここから ${solvedVar} = ${toNiceNumber(solvedVal)} を得ます。`);
  lines.push("");
  lines.push("次に、求めた値を元の式に代入します。");
  lines.push(`式(1)より ${otherVar} = ${toNiceNumber(otherVal)}。`);
  lines.push("");
  lines.push(`【答え】x = ${toNiceNumber(x)}, y = ${toNiceNumber(y)}`);

  return lines;
}

function toNiceNumber(v) {
  // ぴったり整数なら整数表示、そうでなければ小数（最大6桁）
  if (Number.isInteger(v)) return String(v);
  const s = v.toFixed(6);
  return s.replace(/\.?0+$/, "");
}

// 画面反映
function renderProblem(p) {
  equationsEl.textContent = `${formatEq(p.a, p.b, p.c)}\n${formatEq(p.d, p.e, p.f)}`;
  inputX.value = "";
  inputY.value = "";
  inputX.focus();

  feedbackEl.textContent = "";
  feedbackEl.classList.remove("ok", "ng");
  nextBtn.disabled = true;
  solutionBox.open = false;
  solutionStepsEl.innerHTML = "";
}

function updateStatus() {
  progressEl.textContent = `${totalTried}問`;
  correctEl.textContent = `${totalCorrect}`;
  const acc = totalTried ? Math.round((totalCorrect / totalTried) * 100) : 0;
  accuracyEl.textContent = `${acc}%`;
}

function saveProgress() {
  const data = { totalTried, totalCorrect, timestamp: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadProgress() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const obj = JSON.parse(raw);
    if (typeof obj.totalTried === "number") totalTried = obj.totalTried;
    if (typeof obj.totalCorrect === "number") totalCorrect = obj.totalCorrect;
  } catch {}
}

// 採点
function grade() {
  const ux = parseNumber(inputX.value);
  const uy = parseNumber(inputY.value);

  if (!Number.isFinite(ux) || !Number.isFinite(uy)) {
    feedbackEl.textContent = "x, y には整数・小数・分数（例: 3/4）で入力してください。";
    feedbackEl.classList.add("ng");
    return false;
  }

  const tol = 1e-6;
  const ok = Math.abs(ux - current.sol.x) < tol && Math.abs(uy - current.sol.y) < tol;

  totalTried++;
  if (ok) totalCorrect++;

  feedbackEl.textContent = ok
    ? "正解！よくできました。"
    : `不正解… 正解は x = ${current.sol.x}, y = ${current.sol.y}`;
  feedbackEl.classList.toggle("ok", ok);
  feedbackEl.classList.toggle("ng", !ok);

  // 解説を用意
  solutionStepsEl.innerHTML = "";
  current.steps.forEach((line) => {
    const div = document.createElement("div");
    div.className = "step";
    div.textContent = line;
    solutionStepsEl.appendChild(div);
  });

  nextBtn.disabled = false;
  updateStatus();
  saveProgress();
  return ok;
}

// イベント
form.addEventListener("submit", (e) => {
  e.preventDefault();
  grade();
});
nextBtn.addEventListener("click", () => {
  current = generateProblem(levelSel.value);
  renderProblem(current);
});
newBtn.addEventListener("click", () => {
  current = generateProblem(levelSel.value);
  renderProblem(current);
});
hintBtn.addEventListener("click", () => {
  solutionBox.open = true;
  if (!solutionStepsEl.innerHTML) {
    current.steps.forEach((line) => {
      const div = document.createElement("div");
      div.className = "step";
      div.textContent = line;
      solutionStepsEl.appendChild(div);
    });
  }
});

// 初期化
loadProgress();
updateStatus();
current = generateProblem(levelSel.value);
renderProblem(current);