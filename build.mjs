// Build step: slim formula list + dates of recently added formulae. Node 18+, no deps.
import { mkdirSync, writeFileSync } from "node:fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};

async function gh(url) {
  for (let i = 0; i < 10; i++) {
    const res = await fetch(url, { headers: { ...headers, Accept: "application/vnd.github+json" } });
    if (res.ok) return res.json();
    if (res.status !== 403 && res.status !== 429) throw new Error(`${res.status} ${url}`);
    const reset = +res.headers.get("x-ratelimit-reset") * 1000 - Date.now();
    console.log(`rate limited, sleeping ${Math.ceil(reset / 1000)}s`);
    await sleep(Math.max(reset, 5000) + 1000);
  }
  throw new Error("gave up on " + url);
}

mkdirSync("public", { recursive: true });

// 1. formulae: [[name, desc], ...]
const all = await (await fetch("https://formulae.brew.sh/api/formula.json")).json();
const formulae = all.filter((f) => f.desc && !f.deprecated && !f.disabled).map((f) => [f.name, f.desc]);
writeFileSync("public/formulae.json", JSON.stringify(formulae));
console.log(`${formulae.length} formulae`);

// 2. new formulae in the last year: {name: "YYYY-MM-DD"}. Search caps at 1000/query, so window by month.
const added = {};
const day = (d) => d.toISOString().slice(0, 10);
for (let m = 0; m < 12; m++) {
  const to = new Date(); to.setUTCMonth(to.getUTCMonth() - m);
  const from = new Date(to); from.setUTCMonth(from.getUTCMonth() - 1);
  const q = `repo:Homebrew/homebrew-core "(new formula)" committer-date:${day(from)}..${day(to)}`;
  for (let page = 1; page <= 10; page++) {
    const data = await gh(`https://api.github.com/search/commits?q=${encodeURIComponent(q)}&per_page=100&page=${page}`);
    for (const it of data.items) {
      const m = it.commit.message.split("\n")[0].match(/^(\S+) .*\(new formula\)$/);
      if (m && !added[m[1]]) added[m[1]] = it.commit.committer.date.slice(0, 10);
    }
    if (data.items.length < 100) break;
  }
  console.log(`${day(from)}..${day(to)}: ${Object.keys(added).length} total`);
}
writeFileSync("public/new.json", JSON.stringify(added));
