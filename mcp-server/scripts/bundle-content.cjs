/**
 * Bundles skills/ and subagents/ (inside mcp-server) into dist/content.json so the server is self-contained.
 * Writes dist/content.json.sha256 for runtime integrity verification.
 * Run from mcp-server: node scripts/bundle-content.cjs (e.g. via npm run build).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// __dirname = mcp-server/scripts, so ROOT = mcp-server
const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const SUBAGENTS_DIR = path.join(ROOT, 'subagents');
const OUT_DIR = path.join(__dirname, '..', 'dist');
const OUT_FILE = path.join(OUT_DIR, 'content.json');

function readDirRecursive(dir, base = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result = {};
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full);
    if (e.isDirectory()) {
      Object.assign(result, readDirRecursive(full, base));
    } else if (e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.markdown'))) {
      result[rel.replace(/\\/g, '/')] = fs.readFileSync(full, 'utf8');
    }
  }
  return result;
}

function extractNameFromFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const nameMatch = match[1].match(/name:\s*(.+)/);
  return nameMatch ? nameMatch[1].trim() : null;
}

function buildSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return { skills: [], byName: {} };
  const byName = {};
  const skillDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(e => e.isDirectory());
  for (const d of skillDirs) {
    const skillDir = path.join(SKILLS_DIR, d.name);
    const skillPath = path.join(skillDir, 'SKILL.md');
    const refPath = path.join(skillDir, 'REFERENCE.md');
    if (!fs.existsSync(skillPath)) continue;
    const skillContent = fs.readFileSync(skillPath, 'utf8');
    const name = extractNameFromFrontmatter(skillContent) || d.name;
    byName[name] = {
      id: d.name,
      name,
      content: skillContent,
      reference: fs.existsSync(refPath) ? fs.readFileSync(refPath, 'utf8') : null,
    };
  }
  const skills = Object.values(byName).map(s => ({ id: s.id, name: s.name, hasReference: !!s.reference }));
  return { skills, byName };
}

function buildSubagents() {
  if (!fs.existsSync(SUBAGENTS_DIR)) return { subagents: [], byName: {} };
  const byName = {};
  const files = fs.readdirSync(SUBAGENTS_DIR).filter(f => f.endsWith('.md'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(SUBAGENTS_DIR, f), 'utf8');
    const name = extractNameFromFrontmatter(content) || path.basename(f, '.md');
    const id = path.basename(f, '.md');
    byName[name] = { id, name, content };
  }
  const subagents = Object.values(byName).map(s => ({ id: s.id, name: s.name }));
  return { subagents, byName };
}

const skillsData = buildSkills();
const subagentsData = buildSubagents();

const output = {
  skills: skillsData.skills,
  subagents: subagentsData.subagents,
  content: {
    skills: Object.fromEntries(
      Object.entries(skillsData.byName).map(([k, v]) => [
        k,
        { content: v.content, reference: v.reference },
      ])
    ),
    subagents: Object.fromEntries(
      Object.entries(subagentsData.byName).map(([k, v]) => [k, { content: v.content }])
    ),
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const jsonContent = JSON.stringify(output, null, 0);
fs.writeFileSync(OUT_FILE, jsonContent, 'utf8');
const hash = crypto.createHash('sha256').update(jsonContent, 'utf8').digest('hex');
fs.writeFileSync(OUT_FILE + '.sha256', hash + '\n', 'utf8');
console.log('Bundled', skillsData.skills.length, 'skills and', subagentsData.subagents.length, 'subagents into', OUT_FILE);
