/* eslint-disable no-unused-vars */
import * as API from "./api";
import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "policyguard_data";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { documents: [], inventory: [], calendarEvents: [], analyses: {} };
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

const DOC_TYPES = [
  { value: "policy", label: "Insurance policy", icon: "shield" },
  { value: "receipt", label: "Receipt", icon: "receipt" },
  { value: "photo", label: "Property photo", icon: "camera" },
  { value: "warranty", label: "Warranty", icon: "badge" },
  { value: "repair", label: "Repair record", icon: "wrench" },
  { value: "other", label: "Other document", icon: "file" },
];

const POLICY_SUBTYPES = [
  { value: "homeowners", label: "Homeowners" },
  { value: "renters", label: "Renters" },
  { value: "auto", label: "Personal auto" },
  { value: "umbrella", label: "Umbrella" },
  { value: "other_policy", label: "Other P&C" },
];

const ICONS = {
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
  receipt: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><path d="M8 10h8"/><path d="M8 14h4"/></svg>
  ),
  camera: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
  ),
  badge: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 014.78-4.77 4 4 0 016.74 0 4 4 0 014.78 4.78 4 4 0 010 6.74 4 4 0 01-4.77 4.78 4 4 0 01-6.75 0 4 4 0 01-4.78-4.77 4 4 0 010-6.76z"/><path d="M9 12l2 2 4-4"/></svg>
  ),
  wrench: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
  ),
  file: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
  ),
  upload: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
  ),
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
  ),
  folder: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  clipboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
  ),
  box: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
  ),
  chevron: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,18 15,12 9,6"/></svg>
  ),
  alert: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20,6 9,17 4,12"/></svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  book: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
  ),
  dollar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
  ),
  xCircle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  ),
  helpCircle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  ),
  arrowRight: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12,5 19,12 12,19"/></svg>
  ),
  loader: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
  ),
};

function Icon({ name, size = 20 }) {
  const icon = ICONS[name];
  if (!icon) return null;
  if (size === 20) return icon;
  return <span style={{ display: "inline-flex", transform: `scale(${size / 20})`, transformOrigin: "center" }}>{icon}</span>;
}

/* ─── API Key Manager ─── */
function getApiKey() {
  return localStorage.getItem("policyguard_api_key") || "";
}
function setApiKey(key) {
  localStorage.setItem("policyguard_api_key", key);
}

/* ─── Claude API Call ─── */
async function analyzePolicy(base64Data, mimeType, policySubtype) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not set. Go to Settings to add your Anthropic API key.");

  const policyTypeLabel = POLICY_SUBTYPES.find(p => p.value === policySubtype)?.label || "property and casualty";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: mimeType || "application/pdf",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `You are analyzing a ${policyTypeLabel} insurance policy to help a policyholder understand their coverage in plain language. This person may need to file a claim and wants to understand what to expect.

Analyze this policy document and return a JSON response with exactly this structure (no markdown, no backticks, just raw JSON):

{
  "policyOverview": {
    "insurer": "name of insurance company",
    "policyType": "homeowners/auto/renters/etc",
    "policyNumber": "if found",
    "effectiveDates": "policy period if found",
    "summary": "2-3 sentence plain language summary of what this policy covers"
  },
  "coverages": [
    {
      "name": "Coverage name (e.g. Dwelling Coverage, Liability, Collision)",
      "limit": "dollar limit if stated",
      "deductible": "deductible amount if stated",
      "plainExplanation": "1-2 sentences explaining what this coverage actually pays for in everyday language",
      "claimExample": "A brief example of when a policyholder would use this coverage"
    }
  ],
  "keyDefinitions": [
    {
      "term": "important policy term",
      "policyDefinition": "how the policy defines it",
      "plainMeaning": "what it actually means in everyday language"
    }
  ],
  "exclusions": [
    {
      "item": "what is NOT covered",
      "plainExplanation": "why this matters to the policyholder"
    }
  ],
  "claimsProcess": {
    "steps": [
      "Step 1 description in plain language",
      "Step 2 description in plain language"
    ],
    "timeRequirements": "any deadlines for filing or reporting claims",
    "contactInfo": "claims contact info if found in policy",
    "importantNotes": "anything else the policyholder should know about filing"
  },
  "importantDates": [
    {
      "event": "what the date is for",
      "date": "the date or timeframe",
      "action": "what the policyholder should do"
    }
  ],
  "warnings": [
    "Any surprising limitations, conditions, or gotchas the policyholder should know about"
  ]
}

Focus on being helpful to someone who might be filing a claim. Define insurance jargon in plain language. If you cannot find specific information for a field, use "Not specified in policy" rather than making something up.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (response.status === 401) throw new Error("Invalid API key. Check your key in Settings.");
    if (response.status === 429) throw new Error("Rate limited. Please wait a moment and try again.");
    throw new Error(`API error (${response.status}): ${errBody}`);
  }

  const result = await response.json();
  const text = result.content.map(c => c.text || "").join("");
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Could not parse analysis results. The policy may be too complex or unreadable. Try a clearer PDF.");
  }
}

/* ─── Ask a question about the policy ─── */
async function askPolicyQuestion(base64Data, mimeType, question, analysisJson) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API key not set.");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: mimeType || "application/pdf",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `You are a helpful insurance policy interpreter. A policyholder has uploaded their insurance policy and has this question:

"${question}"

Here is the prior analysis of their policy for context:
${JSON.stringify(analysisJson, null, 2)}

Answer their question in plain, everyday language. Reference specific parts of their policy when possible. If the answer involves filing a claim, explain the practical steps. If the policy doesn't address their question, say so clearly.

Keep your answer concise but thorough — 2-4 paragraphs maximum. Do not use legal jargon without explaining it.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) throw new Error("Failed to get answer. Please try again.");
  const result = await response.json();
  return result.content.map(c => c.text || "").join("");
}


/* ─── Upload Modal ─── */
function UploadModal({ open, onClose, onUpload }) {
  const [files, setFiles] = useState([]);
  const [docType, setDocType] = useState("policy");
  const [policySubtype, setPolicySubtype] = useState("homeowners");
  const [label, setLabel] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  if (!open) return null;

  const handleFiles = (fileList) => {
    setFiles(Array.from(fileList));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!files.length) return;
    for (const file of files) {
      const base64 = await fileToBase64(file);
      const doc = {
        id: Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        name: file.name,
        type: docType,
        policySubtype: docType === "policy" ? policySubtype : undefined,
        label: label || file.name,
        size: file.size,
        mimeType: file.type,
        data: base64,
        uploadedAt: new Date().toISOString(),
        status: docType === "policy" ? "pending_analysis" : "stored",
      };
      onUpload(doc);
    }
    setFiles([]);
    setLabel("");
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }} onClick={onClose}>
      <div style={{ background: "var(--bg-primary)", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", padding: "2rem" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>Upload document</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}><Icon name="x" /></button>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
            borderRadius: 12,
            padding: "2rem",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "var(--accent-light)" : "var(--bg-secondary)",
            transition: "all 0.2s",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ color: "var(--accent)", marginBottom: 8 }}><Icon name="upload" size={32} /></div>
          {files.length ? (
            <p style={{ margin: 0, color: "var(--text-primary)", fontWeight: 500 }}>{files.map(f => f.name).join(", ")}</p>
          ) : (
            <>
              <p style={{ margin: 0, color: "var(--text-primary)", fontWeight: 500 }}>Drop files here or click to browse</p>
              <p style={{ margin: "4px 0 0", color: "var(--text-tertiary)", fontSize: 13 }}>PDF, images, or documents</p>
            </>
          )}
          <input ref={inputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Document type</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {DOC_TYPES.map(dt => (
              <button key={dt.value} onClick={() => setDocType(dt.value)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                border: `1.5px solid ${docType === dt.value ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 10, background: docType === dt.value ? "var(--accent-light)" : "var(--bg-primary)",
                cursor: "pointer", color: docType === dt.value ? "var(--accent)" : "var(--text-secondary)",
                fontSize: 13, fontWeight: 500, transition: "all 0.15s",
              }}>
                <Icon name={dt.icon} />{dt.label}
              </button>
            ))}
          </div>
        </div>

        {docType === "policy" && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Policy type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {POLICY_SUBTYPES.map(ps => (
                <button key={ps.value} onClick={() => setPolicySubtype(ps.value)} style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: `1.5px solid ${policySubtype === ps.value ? "var(--accent)" : "var(--border)"}`,
                  background: policySubtype === ps.value ? "var(--accent-light)" : "var(--bg-primary)",
                  color: policySubtype === ps.value ? "var(--accent)" : "var(--text-secondary)",
                  transition: "all 0.15s",
                }}>{ps.label}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Label (optional)</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="e.g. State Farm homeowners 2026"
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)",
              background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!files.length}
          style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: files.length ? "var(--accent)" : "var(--border)",
            color: files.length ? "#fff" : "var(--text-tertiary)",
            fontSize: 15, fontWeight: 600, cursor: files.length ? "pointer" : "default",
            transition: "all 0.2s",
          }}
        >
          Upload {files.length ? `${files.length} file${files.length > 1 ? "s" : ""}` : ""}
        </button>
      </div>
    </div>
  );
}

/* ─── Document Card ─── */
function DocCard({ doc, onClick, onDelete }) {
  const typeInfo = DOC_TYPES.find(d => d.value === doc.type) || DOC_TYPES[5];
  const isImage = doc.mimeType?.startsWith("image/");
  const isPDF = doc.mimeType === "application/pdf";

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 14,
        padding: "1rem", cursor: "pointer", transition: "all 0.2s",
        display: "flex", flexDirection: "column", gap: 10,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
    >
      {isImage && doc.data && (
        <div style={{ borderRadius: 8, overflow: "hidden", height: 120, background: "var(--bg-secondary)" }}>
          <img src={doc.data} alt={doc.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      {isPDF && (
        <div style={{ borderRadius: 8, height: 120, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-tertiary)" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }}><Icon name={typeInfo.icon} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.label}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
            {typeInfo.label}{doc.policySubtype ? ` \u00b7 ${POLICY_SUBTYPES.find(p => p.value === doc.policySubtype)?.label || ""}` : ""} \u00b7 {formatBytes(doc.size)}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>{formatDate(doc.uploadedAt)}</p>
        </div>
      </div>
      {doc.status === "pending_analysis" && (
        <div style={{ padding: "6px 10px", borderRadius: 8, background: "var(--warning-light)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="alert" size={14} />
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--warning)" }}>Ready for analysis</span>
        </div>
      )}
      {doc.status === "analyzed" && (
        <div style={{ padding: "6px 10px", borderRadius: 8, background: "var(--success-light)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="check" size={14} />
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--success)" }}>Analyzed</span>
        </div>
      )}
    </div>
  );
}

/* ─── Policy Analyzer Page ─── */
function AnalyzerPage({ data, setData, pageArg, onNavigate }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(pageArg || null);
  const [activeTab, setActiveTab] = useState("overview");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);

  const policies = data.documents.filter(d => d.type === "policy");
  const selectedDoc = policies.find(d => d.id === selectedDocId);
  const analysis = selectedDocId ? data.analyses[selectedDocId] : null;

  const runAnalysis = async () => {
    if (!selectedDoc) return;
    setAnalyzing(true);
    setError(null);
    try {
      const rawBase64 = selectedDoc.data.split(",")[1] || selectedDoc.data;
      const result = await analyzePolicy(rawBase64, selectedDoc.mimeType, selectedDoc.policySubtype);

      // Auto-create calendar events from extracted dates
      const newEvents = [];
      if (result.importantDates && result.importantDates.length > 0) {
        result.importantDates.forEach(d => {
          // Try to parse the date — skip if it's vague
          const dateMatch = d.date?.match(/\d{4}-\d{2}-\d{2}/) || d.date?.match(/(\w+ \d{1,2},?\s*\d{4})/);
          if (dateMatch) {
            const parsed = new Date(dateMatch[0]);
            if (!isNaN(parsed.getTime())) {
              const dateStr = parsed.toISOString().split("T")[0];
              // Don't add duplicates
              const exists = data.calendarEvents.some(e => e.title === d.event && e.eventDate === dateStr);
              if (!exists) {
                newEvents.push({
                  id: Date.now() + "_" + Math.random().toString(36).slice(2, 8),
                  title: d.event,
                  eventType: d.event.toLowerCase().includes("renew") ? "renewal" :
                             d.event.toLowerCase().includes("deadline") ? "deadline" :
                             d.event.toLowerCase().includes("expir") ? "expiration" : "other",
                  eventDate: dateStr,
                  reminderDays: 14,
                  notes: d.action || "",
                  sourceDocument: selectedDoc.label,
                  createdAt: new Date().toISOString(),
                });
              }
            }
          }
        });
      }

      const next = {
        ...data,
        analyses: { ...data.analyses, [selectedDocId]: result },
        documents: data.documents.map(d => d.id === selectedDocId ? { ...d, status: "analyzed" } : d),
        calendarEvents: [...data.calendarEvents, ...newEvents],
      };
      setData(next);
      saveData(next);
      setActiveTab("overview");
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || !selectedDoc || !analysis) return;
    setAsking(true);
    try {
      const rawBase64 = selectedDoc.data.split(",")[1] || selectedDoc.data;
      const answer = await askPolicyQuestion(rawBase64, selectedDoc.mimeType, question, analysis);
      setQaHistory(prev => [...prev, { q: question, a: answer }]);
      setQuestion("");
    } catch (e) {
      setError(e.message);
    } finally {
      setAsking(false);
    }
  };

  // No policies uploaded yet
  if (policies.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <div style={{ color: "var(--accent)", marginBottom: 12 }}><Icon name="shield" size={48} /></div>
        <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>No policies uploaded yet</h1>
        <p style={{ margin: "0 0 1.5rem", fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, marginInline: "auto" }}>
          Upload a homeowners or auto insurance policy in the Document Vault to get started with AI-powered analysis.
        </p>
        <button onClick={() => onNavigate("vault")} style={{
          padding: "10px 24px", borderRadius: 10, background: "var(--accent)", color: "#fff",
          border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>Go to Document Vault</button>
      </div>
    );
  }

  const TABS = [
    { id: "overview", label: "Overview", icon: "shield" },
    { id: "coverages", label: "Coverages", icon: "book" },
    { id: "definitions", label: "Key terms", icon: "helpCircle" },
    { id: "exclusions", label: "Exclusions", icon: "xCircle" },
    { id: "claims", label: "Claims process", icon: "clipboard" },
    { id: "dates", label: "Important dates", icon: "calendar" },
    { id: "ask", label: "Ask a question", icon: "search" },
  ];

  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Policy analyzer</h1>
      <p style={{ margin: "0 0 1.5rem", fontSize: 14, color: "var(--text-secondary)" }}>Upload a P&C policy to get plain-language explanations of your coverage</p>

      {/* Policy selector */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Select a policy to analyze</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {policies.map(doc => (
            <button key={doc.id} onClick={() => { setSelectedDocId(doc.id); setQaHistory([]); }} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              background: selectedDocId === doc.id ? "var(--accent-light)" : "var(--bg-primary)",
              border: `1.5px solid ${selectedDocId === doc.id ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.15s",
            }}>
              <Icon name="shield" />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{doc.label}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
                  {POLICY_SUBTYPES.find(p => p.value === doc.policySubtype)?.label || "Policy"} \u00b7 {formatDate(doc.uploadedAt)}
                  {doc.status === "analyzed" && " \u00b7 Analyzed"}
                </p>
              </div>
              {doc.status === "analyzed" && <span style={{ color: "var(--success)" }}><Icon name="check" /></span>}
              {doc.status === "pending_analysis" && <span style={{ color: "var(--warning)" }}><Icon name="alert" /></span>}
            </button>
          ))}
        </div>
      </div>

      {/* Analyze button */}
      {selectedDoc && !analysis && (
        <div style={{ marginBottom: "2rem" }}>
          <button onClick={runAnalysis} disabled={analyzing} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: analyzing ? "var(--bg-tertiary)" : "var(--accent)",
            color: analyzing ? "var(--text-tertiary)" : "#fff",
            fontSize: 15, fontWeight: 600, cursor: analyzing ? "default" : "pointer",
          }}>
            {analyzing ? (
              <>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-flex" }}><Icon name="loader" /></span>
                Analyzing policy... this may take 30-60 seconds
              </>
            ) : (
              <>
                <Icon name="search" /> Analyze this policy
              </>
            )}
          </button>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--danger-light)", border: "1.5px solid var(--danger)", marginBottom: "1.5rem", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ color: "var(--danger)", flexShrink: 0, marginTop: 2 }}><Icon name="alert" /></span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--danger)" }}>Error</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{error}</p>
          </div>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", marginLeft: "auto" }}><Icon name="x" /></button>
        </div>
      )}

      {/* Analysis results */}
      {analysis && (
        <>
          {/* Tab navigation */}
          <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", overflowX: "auto", paddingBottom: 4 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
                border: `1.5px solid ${activeTab === tab.id ? "var(--accent)" : "transparent"}`,
                background: activeTab === tab.id ? "var(--accent-light)" : "transparent",
                color: activeTab === tab.id ? "var(--accent)" : "var(--text-secondary)",
                fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
              }}>
                <Icon name={tab.icon} size={16} />{tab.label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === "overview" && analysis.policyOverview && (
            <div>
              <div style={{ background: "var(--bg-secondary)", borderRadius: 14, padding: "1.5rem", marginBottom: "1rem" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Policy summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {[
                    { label: "Insurer", value: analysis.policyOverview.insurer },
                    { label: "Policy type", value: analysis.policyOverview.policyType },
                    { label: "Policy number", value: analysis.policyOverview.policyNumber },
                    { label: "Effective dates", value: analysis.policyOverview.effectiveDates },
                  ].map(item => (
                    <div key={item.label}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{item.value || "Not specified"}</p>
                    </div>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{analysis.policyOverview.summary}</p>
              </div>

              {/* Warnings */}
              {analysis.warnings && analysis.warnings.length > 0 && (
                <div style={{ background: "var(--warning-light)", borderRadius: 14, padding: "1.25rem", border: "1.5px solid var(--warning)" }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600, color: "var(--warning)", display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name="alert" /> Things to watch out for
                  </h3>
                  {analysis.warnings.map((w, i) => (
                    <p key={i} style={{ margin: i > 0 ? "8px 0 0" : 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, paddingLeft: 12, borderLeft: "3px solid var(--warning)" }}>{w}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Coverages tab */}
          {activeTab === "coverages" && analysis.coverages && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {analysis.coverages.map((cov, i) => (
                <div key={i} style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "1.25rem" }}>
                  <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{cov.name}</h3>
                  <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
                    {cov.limit && (
                      <div style={{ padding: "4px 12px", borderRadius: 8, background: "var(--accent-light)", fontSize: 13, fontWeight: 500, color: "var(--accent)" }}>
                        Limit: {cov.limit}
                      </div>
                    )}
                    {cov.deductible && (
                      <div style={{ padding: "4px 12px", borderRadius: 8, background: "var(--warning-light)", fontSize: 13, fontWeight: 500, color: "var(--warning)" }}>
                        Deductible: {cov.deductible}
                      </div>
                    )}
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{cov.plainExplanation}</p>
                  {cov.claimExample && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--bg-secondary)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Example: </span>{cov.claimExample}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Definitions tab */}
          {activeTab === "definitions" && analysis.keyDefinitions && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {analysis.keyDefinitions.map((def, i) => (
                <div key={i} style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "1.25rem" }}>
                  <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>{def.term}</h3>
                  <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 500 }}>Policy says: </span>{def.policyDefinition}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>What this means: </span>{def.plainMeaning}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Exclusions tab */}
          {activeTab === "exclusions" && analysis.exclusions && (
            <div>
              <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--danger-light)", marginBottom: "1rem" }}>
                <p style={{ margin: 0, fontSize: 13, color: "var(--danger)", fontWeight: 500 }}>
                  These are things your policy does NOT cover. Understanding exclusions helps you avoid surprises when filing a claim.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {analysis.exclusions.map((exc, i) => (
                  <div key={i} style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "1rem 1.25rem", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ color: "var(--danger)", flexShrink: 0, marginTop: 2 }}><Icon name="xCircle" /></span>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{exc.item}</p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{exc.plainExplanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Claims process tab */}
          {activeTab === "claims" && analysis.claimsProcess && (
            <div>
              <div style={{ background: "var(--bg-secondary)", borderRadius: 14, padding: "1.5rem", marginBottom: "1rem" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>How to file a claim</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {analysis.claimsProcess.steps && analysis.claimsProcess.steps.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", background: "var(--accent)",
                        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>{i + 1}</div>
                      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, paddingTop: 4 }}>{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {analysis.claimsProcess.timeRequirements && (
                  <div style={{ background: "var(--warning-light)", borderRadius: 12, padding: "1rem" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: "var(--warning)", textTransform: "uppercase", letterSpacing: 0.5 }}>Filing deadlines</p>
                    <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5 }}>{analysis.claimsProcess.timeRequirements}</p>
                  </div>
                )}
                {analysis.claimsProcess.contactInfo && (
                  <div style={{ background: "var(--accent-light)", borderRadius: 12, padding: "1rem" }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>Claims contact</p>
                    <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5 }}>{analysis.claimsProcess.contactInfo}</p>
                  </div>
                )}
              </div>

              {analysis.claimsProcess.importantNotes && (
                <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 12, background: "var(--bg-secondary)", borderLeft: "4px solid var(--accent)" }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Good to know: </span>{analysis.claimsProcess.importantNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Important dates tab */}
          {activeTab === "dates" && analysis.importantDates && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {analysis.importantDates.length === 0 ? (
                <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-tertiary)", fontSize: 14 }}>No specific dates found in this policy.</p>
              ) : analysis.importantDates.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "1rem 1.25rem" }}>
                  <span style={{ color: "var(--accent)" }}><Icon name="calendar" /></span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{d.event}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>{d.date}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{d.action}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Ask a question tab */}
          {activeTab === "ask" && (
            <div>
              <div style={{ background: "var(--bg-secondary)", borderRadius: 14, padding: "1.25rem", marginBottom: "1rem" }}>
                <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary)" }}>
                  Ask any question about your policy — what's covered, how to file a specific type of claim, what a term means, or anything else.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAsk()}
                    placeholder="e.g. Is water damage from a burst pipe covered?"
                    style={{
                      flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)",
                      background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none",
                    }}
                  />
                  <button onClick={handleAsk} disabled={asking || !question.trim()} style={{
                    padding: "10px 20px", borderRadius: 10, border: "none",
                    background: asking || !question.trim() ? "var(--border)" : "var(--accent)",
                    color: asking || !question.trim() ? "var(--text-tertiary)" : "#fff",
                    fontSize: 14, fontWeight: 600, cursor: asking ? "default" : "pointer", whiteSpace: "nowrap",
                  }}>
                    {asking ? "Thinking..." : "Ask"}
                  </button>
                </div>
              </div>

              {/* Suggested questions */}
              {qaHistory.length === 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Try asking</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[
                      "What should I do first if I need to file a claim?",
                      "What is my deductible for property damage?",
                      "Does this policy cover temporary housing if my home is damaged?",
                      "What happens if I miss the claim filing deadline?",
                      "Are my personal belongings covered outside my home?",
                    ].map((q, i) => (
                      <button key={i} onClick={() => { setQuestion(q); }} style={{
                        padding: "8px 14px", borderRadius: 10, fontSize: 13, border: "1.5px solid var(--border)",
                        background: "var(--bg-primary)", color: "var(--text-secondary)", cursor: "pointer",
                        textAlign: "left", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                      >{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Q&A history */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {qaHistory.map((qa, i) => (
                  <div key={i}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>Q</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text-primary)", paddingTop: 4 }}>{qa.q}</p>
                    </div>
                    <div style={{ marginLeft: 38, padding: "14px 16px", borderRadius: 12, background: "var(--bg-secondary)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {qa.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Settings Page ─── */
function SettingsPage() {
  const [key, setKey] = useState(getApiKey());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setApiKey(key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Settings</h1>
      <p style={{ margin: "0 0 2rem", fontSize: 14, color: "var(--text-secondary)" }}>Configure your PolicyGuard application</p>

      <div style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "1.5rem", maxWidth: 520 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Anthropic API key</h3>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-tertiary)" }}>Required for AI policy analysis. Your key is stored locally in your browser and never sent anywhere except Anthropic's API.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)",
              background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: 14, outline: "none",
              fontFamily: "monospace",
            }}
          />
          <button onClick={handleSave} style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: saved ? "var(--success)" : "var(--accent)", color: "#fff",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Vault Page ─── */
function VaultPage({ data, setData, onNavigate }) {
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const handleUpload = (doc) => {
    const next = { ...data, documents: [...data.documents, doc] };
    setData(next);
    saveData(next);
  };

  const handleDelete = (id) => {
    const next = { ...data, documents: data.documents.filter(d => d.id !== id) };
    setData(next);
    saveData(next);
  };

  const filtered = data.documents.filter(d => {
    if (filter !== "all" && d.type !== filter) return false;
    if (search && !d.label.toLowerCase().includes(search.toLowerCase()) && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const policies = data.documents.filter(d => d.type === "policy");
  const receipts = data.documents.filter(d => d.type === "receipt");
  const photos = data.documents.filter(d => d.type === "photo");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Document vault</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{data.documents.length} document{data.documents.length !== 1 ? "s" : ""} stored</p>
        </div>
        <button onClick={() => setShowUpload(true)} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10,
          background: "var(--accent)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          <Icon name="upload" /> Upload
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
        {[
          { label: "Policies", count: policies.length, icon: "shield", color: "var(--accent)" },
          { label: "Receipts", count: receipts.length, icon: "receipt", color: "var(--warning)" },
          { label: "Photos", count: photos.length, icon: "camera", color: "var(--success)" },
          { label: "Total files", count: data.documents.length, icon: "folder", color: "var(--text-secondary)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: s.color }}><Icon name={s.icon} /></div>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{s.count}</p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}><Icon name="search" size={16} /></div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        {["all", "policy", "receipt", "photo", "warranty", "repair", "other"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
            border: `1.5px solid ${filter === f ? "var(--accent)" : "var(--border)"}`,
            background: filter === f ? "var(--accent-light)" : "var(--bg-primary)",
            color: filter === f ? "var(--accent)" : "var(--text-secondary)",
            textTransform: "capitalize",
          }}>{f === "all" ? "All" : f}</button>
        ))}
      </div>

      {/* Document grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-tertiary)" }}>
          <div style={{ marginBottom: 8 }}><Icon name="folder" size={40} /></div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>No documents yet</p>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>Upload your first document to get started</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {filtered.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              onClick={() => {
                if (doc.type === "policy") onNavigate("analyzer", doc.id);
              }}
              onDelete={() => handleDelete(doc.id)}
            />
          ))}
        </div>
      )}

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onUpload={handleUpload} />
    </div>
  );
}

/* ─── Dashboard Page ─── */
function DashboardPage({ data, onNavigate }) {
  const policies = data.documents.filter(d => d.type === "policy");
  const analyzedPolicies = policies.filter(d => d.status === "analyzed");
  const pendingAnalysis = policies.filter(d => d.status === "pending_analysis");
  const totalItems = data.inventory.length;
  const totalValue = data.inventory.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);
  const receipts = data.documents.filter(d => d.type === "receipt");
  const photos = data.documents.filter(d => d.type === "photo");
  const linkedReceipts = data.inventory.filter(i => i.receiptId).length;
  const upcomingEvents = data.calendarEvents.filter(e => new Date(e.eventDate) > new Date()).sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate)).slice(0, 5);

  const roomGroups = {};
  data.inventory.forEach(item => { if (!roomGroups[item.room]) roomGroups[item.room] = { count: 0, value: 0 }; roomGroups[item.room].count++; roomGroups[item.room].value += (item.estimatedValue || 0); });
  const topRooms = Object.entries(roomGroups).sort((a, b) => b[1].value - a[1].value).slice(0, 6);
  const maxRoomValue = topRooms.length ? topRooms[0][1].value : 0;

  const catGroups = {};
  data.inventory.forEach(item => { if (!catGroups[item.category]) catGroups[item.category] = { count: 0, value: 0 }; catGroups[item.category].count++; catGroups[item.category].value += (item.estimatedValue || 0); });
  const topCats = Object.entries(catGroups).sort((a, b) => b[1].value - a[1].value).slice(0, 5);

  const barColors = ["var(--accent)", "var(--warning)", "#6b5ce7", "var(--danger)", "var(--text-secondary)", "var(--success)"];

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>PolicyGuard</h1>
        <p style={{ margin: "6px 0 0", fontSize: 15, color: "var(--text-secondary)" }}>Your insurance policy interpreter and property documentation vault</p>
      </div>

      {!getApiKey() && (
        <div style={{ padding: "14px 18px", borderRadius: 12, background: "var(--warning-light)", border: "1.5px solid var(--warning)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 12 }}>
          <Icon name="alert" />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>API key needed</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>Add your Anthropic API key in Settings to enable AI policy analysis.</p>
          </div>
          <button onClick={() => onNavigate("settings")} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Settings</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "Policies", value: policies.length, sub: analyzedPolicies.length + " analyzed", icon: "shield", color: "var(--accent)" },
          { label: "Documents", value: data.documents.length, sub: receipts.length + " receipts, " + photos.length + " photos", icon: "folder", color: "var(--text-secondary)" },
          { label: "Inventory", value: totalItems, sub: linkedReceipts + " with receipts", icon: "box", color: "var(--success)" },
          { label: "Total value", value: "$" + totalValue.toLocaleString(), sub: Object.keys(roomGroups).length + " rooms", icon: "dollar", color: "var(--accent)" },
          { label: "Deadlines", value: upcomingEvents.length, sub: "upcoming", icon: "calendar", color: "var(--warning)" },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--bg-secondary)", borderRadius: 14, padding: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: s.color }}><Icon name={s.icon} size={16} /><span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span></div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{s.value}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {topRooms.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 1rem" }}>Inventory by room</h2>
          <div style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 14, padding: "1.25rem" }}>
            {topRooms.map(([room, info], i) => (
              <div key={room} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: i < topRooms.length - 1 ? 12 : 0 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", width: 120, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{room}</span>
                <div style={{ flex: 1, height: 24, background: "var(--bg-secondary)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                  <div style={{ height: "100%", width: maxRoomValue > 0 ? Math.max(4, (info.value / maxRoomValue) * 100) + "%" : "4%", background: barColors[i % barColors.length], borderRadius: 6, transition: "width 0.5s ease", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, minWidth: 40 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>${info.value.toLocaleString()}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", width: 50, textAlign: "right", flexShrink: 0 }}>{info.count} items</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topCats.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 1rem" }}>Value by category</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {topCats.map(([cat, info], i) => (
              <div key={cat} style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "12px 16px", flex: "1 1 140px", minWidth: 140 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{cat}</p>
                <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 700, color: barColors[i % barColors.length] }}>${info.value.toLocaleString()}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>{info.count} item{info.count !== 1 ? "s" : ""}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 1rem" }}>Quick actions</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: "2rem" }}>
        {[
          { label: "Upload a policy", desc: "Add an insurance policy for AI analysis", icon: "upload", page: "vault", accent: false },
          { label: "View inventory", desc: "Manage your property documentation", icon: "box", page: "inventory", accent: false },
          { label: "Search everything", desc: "Find info across all your data", icon: "search", page: "searchAll", accent: false },
          { label: "Disaster mode", desc: "Document a loss step by step", icon: "alert", page: "disaster", accent: true },
        ].map(a => (
          <button key={a.label} onClick={() => onNavigate(a.page)} style={{
            background: a.accent ? "var(--danger-light)" : "var(--bg-primary)", border: "1.5px solid " + (a.accent ? "var(--danger)" : "var(--border)"), borderRadius: 14, padding: "1.25rem",
            cursor: "pointer", textAlign: "left", display: "flex", gap: 14, alignItems: "flex-start", transition: "all 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = a.accent ? "var(--danger)" : "var(--accent)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = a.accent ? "var(--danger)" : "var(--border)"}
          >
            <div style={{ color: a.accent ? "var(--danger)" : "var(--accent)", marginTop: 2 }}><Icon name={a.icon} /></div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{a.label}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>{a.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {pendingAnalysis.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 1rem" }}>Policies ready for analysis</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "2rem" }}>
            {pendingAnalysis.map(doc => (
              <button key={doc.id} onClick={() => onNavigate("analyzer", doc.id)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                background: "var(--warning-light)", border: "1.5px solid var(--warning)", borderRadius: 12,
                cursor: "pointer", textAlign: "left", width: "100%",
              }}>
                <Icon name="shield" />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{doc.label}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>Uploaded {formatDate(doc.uploadedAt)}</p>
                </div>
                <Icon name="chevron" />
              </button>
            ))}
          </div>
        </>
      )}

      {upcomingEvents.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 1rem" }}>Upcoming deadlines</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcomingEvents.map(ev => (
              <div key={ev.id} onClick={() => onNavigate("calendar")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: 12, cursor: "pointer" }}>
                <Icon name="calendar" />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{ev.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>{formatDate(ev.eventDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Property Inventory Page ─── */
const ROOMS = [
  "Living room", "Kitchen", "Master bedroom", "Bedroom 2", "Bedroom 3",
  "Bathroom", "Dining room", "Garage", "Basement", "Attic",
  "Home office", "Laundry room", "Patio / Outdoor", "Other",
];

const ITEM_CATEGORIES = [
  "Electronics", "Furniture", "Appliances", "Clothing", "Jewelry",
  "Tools", "Sports equipment", "Musical instruments", "Art / Collectibles",
  "Kitchenware", "Bedding / Linens", "Toys / Games", "Other",
];

function InventoryPage({ data, setData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterRoom, setFilterRoom] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("room");

  // Add item form state
  const [formName, setFormName] = useState("");
  const [formRoom, setFormRoom] = useState("Living room");
  const [formCategory, setFormCategory] = useState("Electronics");
  const [formValue, setFormValue] = useState("");
  const [formPurchasePrice, setFormPurchasePrice] = useState("");
  const [formPurchaseDate, setFormPurchaseDate] = useState("");
  const [formSerial, setFormSerial] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formPhoto, setFormPhoto] = useState(null);
  const [formReceiptId, setFormReceiptId] = useState("");
  const photoRef = useRef(null);
  const receipts = data.documents.filter(d => d.type === "receipt");

  const resetForm = () => {
    setFormName(""); setFormRoom("Living room"); setFormCategory("Electronics");
    setFormValue(""); setFormPurchasePrice(""); setFormPurchaseDate("");
    setFormSerial(""); setFormNotes(""); setFormPhoto(null); setFormReceiptId("");
  };

  const openEdit = (item) => {
    setEditItem(item);
    setFormName(item.name); setFormRoom(item.room); setFormCategory(item.category);
    setFormValue(item.estimatedValue?.toString() || ""); setFormPurchasePrice(item.purchasePrice?.toString() || "");
    setFormPurchaseDate(item.purchaseDate || ""); setFormSerial(item.serialNumber || "");
    setFormNotes(item.notes || ""); setFormPhoto(item.photo || null); setFormReceiptId(item.receiptId || "");
    setShowAdd(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setFormPhoto(base64);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const item = {
      id: editItem ? editItem.id : Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      name: formName.trim(),
      room: formRoom,
      category: formCategory,
      estimatedValue: parseFloat(formValue) || 0,
      purchasePrice: parseFloat(formPurchasePrice) || 0,
      purchaseDate: formPurchaseDate,
      serialNumber: formSerial.trim(),
      notes: formNotes.trim(),
      photo: formPhoto, receiptId: formReceiptId || null,
      createdAt: editItem ? editItem.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let nextInventory;
    if (editItem) {
      nextInventory = data.inventory.map(i => i.id === editItem.id ? item : i);
    } else {
      nextInventory = [...data.inventory, item];
    }

    const next = { ...data, inventory: nextInventory };
    setData(next);
    saveData(next);
    setShowAdd(false);
    setEditItem(null);
    resetForm();
  };

  const handleDelete = (id) => {
    const next = { ...data, inventory: data.inventory.filter(i => i.id !== id) };
    setData(next);
    saveData(next);
  };

  const filtered = data.inventory
    .filter(item => {
      if (filterRoom !== "all" && item.room !== filterRoom) return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.category.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "room") return a.room.localeCompare(b.room);
      if (sortBy === "value") return (b.estimatedValue || 0) - (a.estimatedValue || 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "recent") return new Date(b.updatedAt) - new Date(a.updatedAt);
      return 0;
    });

  const totalValue = data.inventory.reduce((sum, i) => sum + (i.estimatedValue || 0), 0);
  const roomsUsed = [...new Set(data.inventory.map(i => i.room))];

  // Group by room for display
  const groupedByRoom = {};
  filtered.forEach(item => {
    if (!groupedByRoom[item.room]) groupedByRoom[item.room] = [];
    groupedByRoom[item.room].push(item);
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Property inventory</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{data.inventory.length} item{data.inventory.length !== 1 ? "s" : ""} \u00b7 ${totalValue.toLocaleString()} estimated total</p>
        </div>
        <button onClick={() => { resetForm(); setEditItem(null); setShowAdd(true); }} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10,
          background: "var(--accent)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          + Add item
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: "1.5rem" }}>
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total items</p>
          <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{data.inventory.length}</p>
        </div>
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total value</p>
          <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>${totalValue.toLocaleString()}</p>
        </div>
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Rooms</p>
          <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{roomsUsed.length}</p>
        </div>
        <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: "14px 16px" }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>With photos</p>
          <p style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{data.inventory.filter(i => i.photo).length}</p>
        </div>
      </div>

      {/* Filter & sort bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}><Icon name="search" size={16} /></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
            style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} style={{
          padding: "9px 12px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)",
          color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer",
        }}>
          <option value="all">All rooms</option>
          {roomsUsed.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
          padding: "9px 12px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)",
          color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer",
        }}>
          <option value="room">Sort by room</option>
          <option value="value">Sort by value</option>
          <option value="name">Sort by name</option>
          <option value="recent">Most recent</option>
        </select>
      </div>

      {/* Inventory list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-tertiary)" }}>
          <div style={{ marginBottom: 8 }}><Icon name="box" size={40} /></div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>No items yet</p>
          <p style={{ margin: "4px 0 0", fontSize: 13 }}>Add your first item to start building your inventory</p>
        </div>
      ) : sortBy === "room" ? (
        // Grouped by room view
        Object.entries(groupedByRoom).map(([room, items]) => (
          <div key={room} style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
              {room}
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-tertiary)" }}>
                {items.length} item{items.length !== 1 ? "s" : ""} \u00b7 ${items.reduce((s, i) => s + (i.estimatedValue || 0), 0).toLocaleString()}
              </span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {items.map(item => (
                <div key={item.id} onClick={() => openEdit(item)} style={{
                  background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 12,
                  padding: "1rem", cursor: "pointer", transition: "all 0.2s", display: "flex", gap: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
                >
                  {item.photo ? (
                    <div style={{ width: 60, height: 60, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "var(--bg-secondary)" }}>
                      <img src={item.photo} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: 8, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-tertiary)" }}>
                      <Icon name="box" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>{item.category}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>
                      {item.estimatedValue ? `$${item.estimatedValue.toLocaleString()}` : "No value set"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        // Flat list view
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {filtered.map(item => (
            <div key={item.id} onClick={() => openEdit(item)} style={{
              background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 12,
              padding: "1rem", cursor: "pointer", transition: "all 0.2s", display: "flex", gap: 12,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
            >
              {item.photo ? (
                <div style={{ width: 60, height: 60, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "var(--bg-secondary)" }}>
                  <img src={item.photo} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{ width: 60, height: 60, borderRadius: 8, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--text-tertiary)" }}>
                  <Icon name="box" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>{item.room} \u00b7 {item.category}</p>
                <p style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>
                  {item.estimatedValue ? `$${item.estimatedValue.toLocaleString()}` : "No value set"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
          onClick={() => { setShowAdd(false); setEditItem(null); resetForm(); }}>
          <div style={{ background: "var(--bg-primary)", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", padding: "2rem" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>{editItem ? "Edit item" : "Add item"}</h2>
              <button onClick={() => { setShowAdd(false); setEditItem(null); resetForm(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}><Icon name="x" /></button>
            </div>

            {/* Photo */}
            <div style={{ marginBottom: "1rem" }}>
              {formPhoto ? (
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 160, marginBottom: 8 }}>
                  <img src={formPhoto} alt="Item" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => setFormPhoto(null)} style={{
                    position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", color: "#fff",
                  }}><Icon name="x" size={14} /></button>
                </div>
              ) : (
                <button onClick={() => photoRef.current?.click()} style={{
                  width: "100%", padding: "1.5rem", borderRadius: 12, border: "2px dashed var(--border)",
                  background: "var(--bg-secondary)", cursor: "pointer", textAlign: "center", color: "var(--text-tertiary)",
                }}>
                  <div style={{ marginBottom: 4 }}><Icon name="camera" /></div>
                  <p style={{ margin: 0, fontSize: 13 }}>Add a photo (optional)</p>
                </button>
              )}
              <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
            </div>

            {/* Name */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Item name *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Samsung 65 inch TV"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* Room & Category */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Room</label>
                <select value={formRoom} onChange={e => setFormRoom(e.target.value)} style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)",
                  background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none",
                }}>
                  {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Category</label>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value)} style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)",
                  background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none",
                }}>
                  {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Values */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Estimated current value ($)</label>
                <input type="number" value={formValue} onChange={e => setFormValue(e.target.value)} placeholder="0"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Original purchase price ($)</label>
                <input type="number" value={formPurchasePrice} onChange={e => setFormPurchasePrice(e.target.value)} placeholder="0"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Purchase date & serial */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Purchase date</label>
                <input type="date" value={formPurchaseDate} onChange={e => setFormPurchaseDate(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Serial / Model number</label>
                <input value={formSerial} onChange={e => setFormSerial(e.target.value)} placeholder="Optional"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
            </div>

            {/* Notes */}
            {receipts.length > 0 && <div style={{ marginBottom: "1rem" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Link a receipt</label><select value={formReceiptId} onChange={e => setFormReceiptId(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none" }}><option value="">No receipt</option>{receipts.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Notes</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Condition, brand, model, etc."
                rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              {editItem && (
                <button onClick={() => { handleDelete(editItem.id); setShowAdd(false); setEditItem(null); resetForm(); }} style={{
                  padding: "12px 20px", borderRadius: 10, border: "1.5px solid var(--danger)",
                  background: "var(--danger-light)", color: "var(--danger)", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>Delete</button>
              )}
              <button onClick={handleSave} disabled={!formName.trim()} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "none",
                background: formName.trim() ? "var(--accent)" : "var(--border)",
                color: formName.trim() ? "#fff" : "var(--text-tertiary)",
                fontSize: 15, fontWeight: 600, cursor: formName.trim() ? "pointer" : "default",
              }}>
                {editItem ? "Save changes" : "Add item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Placeholder Pages ─── */

/* ─── Semantic Search API Call ─── */
async function semanticSearchCall(query, data) {
  const apiKey = localStorage.getItem("policyguard_api_key") || "";
  if (!apiKey) throw new Error("API key not set.");
  let context = "User's PolicyGuard data:\n\nDOCUMENTS:\n";
  data.documents.forEach(d => { context += "- " + d.label + " (" + d.type + ", uploaded " + d.uploadedAt + ")\n"; });
  context += "\nPOLICY ANALYSES:\n";
  Object.entries(data.analyses).forEach(([docId, analysis]) => {
    const doc = data.documents.find(d => d.id === docId);
    context += "\nPolicy: " + (doc ? doc.label : docId) + "\n" + JSON.stringify(analysis, null, 1) + "\n";
  });
  context += "\nINVENTORY ITEMS:\n";
  data.inventory.forEach(item => { context += "- " + item.name + " (" + item.room + ", " + item.category + ", $" + (item.estimatedValue || 0) + ")\n"; });
  context += "\nCALENDAR EVENTS:\n";
  data.calendarEvents.forEach(ev => { context += "- " + ev.title + " (" + ev.eventType + ", " + ev.eventDate + ")\n"; });
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500,
      messages: [{ role: "user", content: context + "\n\nThe user is searching for: \"" + query + "\"\n\nSearch across all their documents, policy analyses, inventory items, and calendar events. Return a helpful answer that references specific items from their data. Be specific." }],
    }),
  });
  if (!response.ok) throw new Error("Search failed.");
  const result = await response.json();
  return result.content.map(c => c.text || "").join("");
}
 
/* ─── Search Everything Page ─── */
function SearchPage({ data }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setError(null);
    try { const answer = await semanticSearchCall(query, data); setResults(prev => [...prev, { q: query, a: answer }]); setQuery(""); }
    catch (e) { setError(e.message); } finally { setSearching(false); }
  };
  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Search everything</h1>
      <p style={{ margin: "0 0 1.5rem", fontSize: 14, color: "var(--text-secondary)" }}>Search across all your policies, inventory, receipts, and deadlines</p>
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }}><Icon name="search" size={16} /></div>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} placeholder="e.g. What does my policy cover for water damage?" style={{ width: "100%", padding: "12px 14px 12px 40px", borderRadius: 12, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <button onClick={handleSearch} disabled={searching || !query.trim()} style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: searching || !query.trim() ? "var(--border)" : "var(--accent)", color: searching || !query.trim() ? "var(--text-tertiary)" : "#fff", fontSize: 14, fontWeight: 600, cursor: searching ? "default" : "pointer", whiteSpace: "nowrap" }}>{searching ? "Searching..." : "Search"}</button>
      </div>
      {error && <div style={{ padding: "12px 16px", borderRadius: 12, background: "var(--danger-light)", marginBottom: "1rem", fontSize: 13, color: "var(--danger)" }}>{error}</div>}
      {results.length === 0 && !searching && (
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Try searching for</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["What is my deductible?", "Show all kitchen items", "When does my policy renew?", "What is not covered?", "Find roof-related items and coverage"].map((q, i) => (
              <button key={i} onClick={() => setQuery(q)} style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-secondary)", cursor: "pointer" }}>{q}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: results.length ? "1rem" : 0 }}>
        {results.map((r, i) => (
          <div key={i}>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="search" size={14} /></div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text-primary)", paddingTop: 4 }}>{r.q}</p>
            </div>
            <div style={{ marginLeft: 38, padding: "14px 16px", borderRadius: 12, background: "var(--bg-secondary)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
 
/* ─── Claim Report Generator ─── */
function ClaimReportPage({ data }) {
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [lossDescription, setLossDescription] = useState("");
  const [lossDate, setLossDate] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const policies = data.documents.filter(d => d.type === "policy" && d.status === "analyzed");
  const analysis = selectedPolicy ? data.analyses[selectedPolicy] : null;
  const toggleItem = (id) => setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const affectedItems = data.inventory.filter(i => selectedItems.includes(i.id));
  const totalLoss = affectedItems.reduce((sum, i) => sum + (i.estimatedValue || 0), 0);
 
  if (showReport) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <button onClick={() => setShowReport(false)} style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 10, padding: "8px 16px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13 }}>Back to editor</button>
          <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "var(--accent)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Print / Save PDF</button>
        </div>
        <div style={{ background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "2rem", maxWidth: 800, marginInline: "auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "2px solid var(--accent)" }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>Insurance Claim Report</h1>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>Generated by PolicyGuard on {formatDate(new Date().toISOString())}</p>
          </div>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Loss Information</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Date of loss</p><p style={{ margin: "4px 0", fontSize: 14, fontWeight: 500 }}>{lossDate ? formatDate(lossDate) : "Not specified"}</p></div>
              <div><p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>Total estimated loss</p><p style={{ margin: "4px 0", fontSize: 14, fontWeight: 500 }}>${totalLoss.toLocaleString()}</p></div>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{lossDescription || "No description provided"}</p>
          </div>
          {analysis && (
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Policy Information</h2>
              <div style={{ background: "var(--bg-secondary)", borderRadius: 12, padding: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[{l:"Insurer",v:analysis.policyOverview?.insurer},{l:"Policy number",v:analysis.policyOverview?.policyNumber},{l:"Policy type",v:analysis.policyOverview?.policyType},{l:"Effective dates",v:analysis.policyOverview?.effectiveDates}].map(x => (
                    <div key={x.l}><p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{x.l}</p><p style={{ margin: "4px 0", fontSize: 14, fontWeight: 500 }}>{x.v || "N/A"}</p></div>
                  ))}
                </div>
              </div>
              {analysis.coverages && <div style={{ marginTop: 12 }}><p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Relevant coverages:</p>{analysis.coverages.map((c, i) => (<div key={i} style={{ padding: "8px 12px", background: "var(--bg-secondary)", borderRadius: 8, marginBottom: 6, display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13 }}>{c.name}</span><span style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)" }}>{c.limit || "See policy"}</span></div>))}</div>}
            </div>
          )}
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Affected Items ({affectedItems.length})</h2>
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 14px", background: "var(--bg-secondary)", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}><span>Item</span><span>Room</span><span>Purchase</span><span>Value</span></div>
              {affectedItems.map(item => (<div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 14px", borderTop: "1px solid var(--border)", fontSize: 13 }}><span style={{ fontWeight: 500 }}>{item.name}</span><span style={{ color: "var(--text-secondary)" }}>{item.room}</span><span style={{ color: "var(--text-secondary)" }}>{item.purchasePrice ? "$" + item.purchasePrice.toLocaleString() : "-"}</span><span style={{ fontWeight: 500, color: "var(--accent)" }}>${(item.estimatedValue || 0).toLocaleString()}</span></div>))}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 14px", borderTop: "2px solid var(--border)", background: "var(--bg-secondary)", fontSize: 13, fontWeight: 600 }}><span>Total</span><span></span><span></span><span style={{ color: "var(--accent)" }}>${totalLoss.toLocaleString()}</span></div>
            </div>
          </div>
          {analysis?.claimsProcess && (
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Claims Process</h2>
              {analysis.claimsProcess.steps?.map((step, i) => (<div key={i} style={{ display: "flex", gap: 12, marginBottom: 8 }}><div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div><p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, paddingTop: 3 }}>{step}</p></div>))}
              {analysis.claimsProcess.timeRequirements && <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--warning-light)", borderRadius: 8 }}><p style={{ margin: 0, fontSize: 13, color: "var(--warning)" }}>Filing deadline: {analysis.claimsProcess.timeRequirements}</p></div>}
            </div>
          )}
          <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text-tertiary)", textAlign: "center" }}><p style={{ margin: 0 }}>Generated by PolicyGuard for documentation purposes. Not legal or insurance advice.</p></div>
        </div>
      </div>
    );
  }
 
  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Claim report generator</h1>
      <p style={{ margin: "0 0 1.5rem", fontSize: 14, color: "var(--text-secondary)" }}>Create a documented claim report combining your policy, inventory, and loss details</p>
      {policies.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-tertiary)" }}><Icon name="clipboard" size={40} /><p style={{ margin: "8px 0 0", fontSize: 15, fontWeight: 500 }}>No analyzed policies yet</p><p style={{ margin: "4px 0", fontSize: 13 }}>Upload and analyze a policy first</p></div>
      ) : (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Select policy</label>
            {policies.map(doc => (<button key={doc.id} onClick={() => setSelectedPolicy(doc.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: selectedPolicy === doc.id ? "var(--accent-light)" : "var(--bg-primary)", border: "1.5px solid " + (selectedPolicy === doc.id ? "var(--accent)" : "var(--border)"), borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%", marginBottom: 8 }}><Icon name="shield" /><span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{doc.label}</span></button>))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
            <div><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Date of loss</label><input type="date" value={lossDate} onChange={e => setLossDate(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Description of loss</label><textarea value={lossDescription} onChange={e => setLossDescription(e.target.value)} placeholder="Describe what happened..." rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} /></div>
          </div>
          {data.inventory.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Select affected items</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {data.inventory.map(item => (<button key={item.id} onClick={() => toggleItem(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "1.5px solid " + (selectedItems.includes(item.id) ? "var(--accent)" : "var(--border)"), borderRadius: 10, background: selectedItems.includes(item.id) ? "var(--accent-light)" : "var(--bg-primary)", cursor: "pointer", textAlign: "left" }}>
                  {selectedItems.includes(item.id) ? <Icon name="check" /> : <Icon name="box" />}
                  <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p><p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-tertiary)" }}>{item.room} - ${(item.estimatedValue || 0).toLocaleString()}</p></div>
                </button>))}
              </div>
              {selectedItems.length > 0 && <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>{selectedItems.length} items - ${totalLoss.toLocaleString()} total</p>}
            </div>
          )}
          <button onClick={() => setShowReport(true)} disabled={!selectedPolicy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "14px", borderRadius: 12, border: "none", background: selectedPolicy ? "var(--accent)" : "var(--border)", color: selectedPolicy ? "#fff" : "var(--text-tertiary)", fontSize: 15, fontWeight: 600, cursor: selectedPolicy ? "pointer" : "default" }}><Icon name="clipboard" /> Generate claim report</button>
        </>
      )}
    </div>
  );
}
 
/* ─── Disaster Mode Page ─── */
function DisasterModePage({ data, setData, onNavigate }) {
  const [step, setStep] = useState(0);
  const [lossType, setLossType] = useState("");
  const [lossDate, setLossDate] = useState("");
  const [lossDesc, setLossDesc] = useState("");
  const [damagePhotos, setDamagePhotos] = useState([]);
  const [affectedRooms, setAffectedRooms] = useState([]);
  const photoRef = useRef(null);
  const policies = data.documents.filter(d => d.type === "policy" && d.status === "analyzed");
  const LOSS_TYPES = ["Fire", "Water damage", "Storm / Wind", "Theft / Burglary", "Vandalism", "Vehicle damage", "Other"];
  const roomsWithItems = [...new Set(data.inventory.map(i => i.room))];
  const affectedItems = data.inventory.filter(i => affectedRooms.includes(i.room));
  const totalLoss = affectedItems.reduce((sum, i) => sum + (i.estimatedValue || 0), 0);
 
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const base64 = await fileToBase64(file);
      setDamagePhotos(prev => [...prev, { name: file.name, data: base64 }]);
      const doc = { id: Date.now() + "_" + Math.random().toString(36).slice(2, 8), name: file.name, type: "photo", label: "Damage photo - " + (lossType || "loss") + " - " + file.name, size: file.size, mimeType: file.type, data: base64, uploadedAt: new Date().toISOString(), status: "stored" };
      const next = { ...data, documents: [...data.documents, doc] };
      setData(next); saveData(next);
    }
  };
 
  const steps = [{ title: "What happened?", icon: "alert" }, { title: "Document damage", icon: "camera" }, { title: "Affected areas", icon: "box" }, { title: "Review", icon: "clipboard" }];
 
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--danger)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="alert" /></div>
        <div><h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Disaster mode</h1><p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>Guided workflow to document a loss and prepare your claim</p></div>
      </div>
      {policies.length === 0 && <div style={{ padding: "14px 18px", borderRadius: 12, background: "var(--warning-light)", border: "1.5px solid var(--warning)", marginBottom: "1.5rem", fontSize: 13, color: "var(--warning)" }}>Tip: Upload and analyze your policy first for a stronger report.</div>}
      <div style={{ display: "flex", gap: 4, marginBottom: "2rem" }}>{steps.map((s, i) => (<div key={i} style={{ flex: 1, textAlign: "center" }}><div style={{ height: 4, borderRadius: 2, background: i <= step ? "var(--accent)" : "var(--border)", marginBottom: 8 }} /><p style={{ margin: 0, fontSize: 11, color: i <= step ? "var(--accent)" : "var(--text-tertiary)", fontWeight: i === step ? 600 : 400 }}>{s.title}</p></div>))}</div>
 
      {step === 0 && (<div>
        <div style={{ marginBottom: "1.5rem" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 8 }}>Type of loss</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{LOSS_TYPES.map(t => (<button key={t} onClick={() => setLossType(t)} style={{ padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1.5px solid " + (lossType === t ? "var(--danger)" : "var(--border)"), background: lossType === t ? "var(--danger-light)" : "var(--bg-primary)", color: lossType === t ? "var(--danger)" : "var(--text-secondary)" }}>{t}</button>))}</div></div>
        <div style={{ marginBottom: "1.5rem" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>When did it happen?</label><input type="date" value={lossDate} onChange={e => setLossDate(e.target.value)} style={{ padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none" }} /></div>
        <div style={{ marginBottom: "1.5rem" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Describe what happened</label><textarea value={lossDesc} onChange={e => setLossDesc(e.target.value)} placeholder="Provide as much detail as possible..." rows={4} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} /></div>
        <button onClick={() => setStep(1)} disabled={!lossType} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: lossType ? "var(--accent)" : "var(--border)", color: lossType ? "#fff" : "var(--text-tertiary)", fontSize: 14, fontWeight: 600, cursor: lossType ? "pointer" : "default" }}>Next: Document damage</button>
      </div>)}
 
      {step === 1 && (<div>
        <p style={{ margin: "0 0 1rem", fontSize: 14, color: "var(--text-secondary)" }}>Take photos of all damage. They are saved to your vault automatically.</p>
        <button onClick={() => photoRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 10, border: "2px dashed var(--border)", background: "var(--bg-secondary)", cursor: "pointer", color: "var(--text-secondary)", fontSize: 14, fontWeight: 500, marginBottom: "1rem", width: "100%" }}><Icon name="camera" /> Add damage photos</button>
        <input ref={photoRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoUpload} />
        {damagePhotos.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: "1rem" }}>{damagePhotos.map((p, i) => (<div key={i} style={{ borderRadius: 10, overflow: "hidden", height: 100 }}><img src={p.data} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>))}</div>}
        <p style={{ margin: "0 0 1rem", fontSize: 13, color: "var(--text-tertiary)" }}>{damagePhotos.length} photo{damagePhotos.length !== 1 ? "s" : ""} added</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setStep(0)} style={{ padding: "12px 20px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer" }}>Back</button>
          <button onClick={() => setStep(2)} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Next: Affected areas</button>
        </div>
      </div>)}
 
      {step === 2 && (<div>
        <p style={{ margin: "0 0 1rem", fontSize: 14, color: "var(--text-secondary)" }}>Select which rooms were affected. Items in those rooms will be included in your claim.</p>
        {roomsWithItems.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1rem" }}>{roomsWithItems.map(room => {
            const roomItems = data.inventory.filter(i => i.room === room);
            const sel = affectedRooms.includes(room);
            return (<button key={room} onClick={() => setAffectedRooms(prev => prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room])} style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "1.5px solid " + (sel ? "var(--accent)" : "var(--border)"), background: sel ? "var(--accent-light)" : "var(--bg-primary)", color: sel ? "var(--accent)" : "var(--text-secondary)" }}>{sel && "\u2713 "}{room} ({roomItems.length} items)</button>);
          })}</div>
        ) : <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: "1rem" }}>No inventory items yet.</p>}
        {affectedRooms.length > 0 && <p style={{ margin: "0 0 1rem", fontSize: 14, fontWeight: 600, color: "var(--accent)" }}>{affectedItems.length} items - ${totalLoss.toLocaleString()} estimated</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setStep(1)} style={{ padding: "12px 20px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer" }}>Back</button>
          <button onClick={() => setStep(3)} style={{ padding: "12px 24px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Next: Review</button>
        </div>
      </div>)}
 
      {step === 3 && (<div>
        <div style={{ background: "var(--bg-secondary)", borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Loss summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Type</p><p style={{ margin: "4px 0", fontSize: 14, fontWeight: 500 }}>{lossType}</p></div>
            <div><p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Date</p><p style={{ margin: "4px 0", fontSize: 14, fontWeight: 500 }}>{lossDate ? formatDate(lossDate) : "Not specified"}</p></div>
            <div><p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Photos</p><p style={{ margin: "4px 0", fontSize: 14, fontWeight: 500 }}>{damagePhotos.length}</p></div>
            <div><p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Items</p><p style={{ margin: "4px 0", fontSize: 14, fontWeight: 500 }}>{affectedItems.length}</p></div>
            <div style={{ gridColumn: "1 / -1" }}><p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Estimated total loss</p><p style={{ margin: "4px 0", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>${totalLoss.toLocaleString()}</p></div>
          </div>
          {lossDesc && <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{lossDesc}</p>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setStep(2)} style={{ padding: "12px 20px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer" }}>Back</button>
          <button onClick={() => onNavigate("reports")} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}><Icon name="clipboard" /> Generate full claim report</button>
        </div>
      </div>)}
    </div>
  );
}

/* ─── Compliance Calendar Page ─── */
const EVENT_TYPES = [
  { value: "renewal", label: "Policy renewal", color: "var(--accent)" },
  { value: "deadline", label: "Filing deadline", color: "var(--danger)" },
  { value: "expiration", label: "Warranty expiration", color: "var(--warning)" },
  { value: "maintenance", label: "Maintenance reminder", color: "var(--text-secondary)" },
  { value: "payment", label: "Payment due", color: "#6b5ce7" },
  { value: "other", label: "Other", color: "var(--text-tertiary)" },
];

function generateICS(events) {
  const pad = (n) => String(n).padStart(2, "0");
  const toICSDate = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
  };
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}T${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  let ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//PolicyGuard//EN\r\nCALSCALE:GREGORIAN\r\n`;
  events.forEach(ev => {
    ics += `BEGIN:VEVENT\r\n`;
    ics += `DTSTART;VALUE=DATE:${toICSDate(ev.eventDate)}\r\n`;
    ics += `SUMMARY:${ev.title.replace(/[,;\\]/g, " ")}\r\n`;
    if (ev.notes) ics += `DESCRIPTION:${ev.notes.replace(/\n/g, "\\n").replace(/[,;\\]/g, " ")}\r\n`;
    ics += `UID:${ev.id}@policyguard\r\n`;
    ics += `DTSTAMP:${stamp}\r\n`;
    if (ev.reminderDays) {
      ics += `BEGIN:VALARM\r\nTRIGGER:-P${ev.reminderDays}D\r\nACTION:DISPLAY\r\nDESCRIPTION:${ev.title}\r\nEND:VALARM\r\n`;
    }
    ics += `END:VEVENT\r\n`;
  });
  ics += `END:VCALENDAR\r\n`;
  return ics;
}

function CalendarPage({ data, setData }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [view, setView] = useState("upcoming"); // upcoming | month | all

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("renewal");
  const [formDate, setFormDate] = useState("");
  const [formReminder, setFormReminder] = useState("7");
  const [formNotes, setFormNotes] = useState("");
  const [formSource, setFormSource] = useState("");

  const resetForm = () => {
    setFormTitle(""); setFormType("renewal"); setFormDate("");
    setFormReminder("7"); setFormNotes(""); setFormSource("");
  };

  const openEdit = (ev) => {
    setEditEvent(ev);
    setFormTitle(ev.title); setFormType(ev.eventType); setFormDate(ev.eventDate);
    setFormReminder(ev.reminderDays?.toString() || "7"); setFormNotes(ev.notes || "");
    setFormSource(ev.sourceDocument || "");
    setShowAdd(true);
  };

  const handleSave = () => {
    if (!formTitle.trim() || !formDate) return;
    const ev = {
      id: editEvent ? editEvent.id : Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      title: formTitle.trim(),
      eventType: formType,
      eventDate: formDate,
      reminderDays: parseInt(formReminder) || 0,
      notes: formNotes.trim(),
      sourceDocument: formSource.trim(),
      createdAt: editEvent ? editEvent.createdAt : new Date().toISOString(),
    };

    let nextEvents;
    if (editEvent) {
      nextEvents = data.calendarEvents.map(e => e.id === editEvent.id ? ev : e);
    } else {
      nextEvents = [...data.calendarEvents, ev];
    }

    const next = { ...data, calendarEvents: nextEvents };
    setData(next);
    saveData(next);
    setShowAdd(false);
    setEditEvent(null);
    resetForm();
  };

  const handleDelete = (id) => {
    const next = { ...data, calendarEvents: data.calendarEvents.filter(e => e.id !== id) };
    setData(next);
    saveData(next);
  };

  const handleExport = () => {
    const ics = generateICS(data.calendarEvents);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "policyguard-calendar.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const allEvents = [...data.calendarEvents].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
  const upcomingEvents = allEvents.filter(e => new Date(e.eventDate) >= today);
  const pastEvents = allEvents.filter(e => new Date(e.eventDate) < today);

  // Events due soon (within 30 days)
  const soonCutoff = new Date(today);
  soonCutoff.setDate(soonCutoff.getDate() + 30);
  const soonEvents = upcomingEvents.filter(e => new Date(e.eventDate) <= soonCutoff);

  // Month view
  const [monthOffset, setMonthOffset] = useState(0);
  const viewMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthName = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = viewMonth.getDay();

  const getEventsForDay = (day) => {
    const dateStr = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return allEvents.filter(e => e.eventDate === dateStr);
  };

  const daysUntil = (dateStr) => {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diff = Math.ceil((d - today) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff < 0) return `${Math.abs(diff)} days ago`;
    return `${diff} days`;
  };

  const getTypeInfo = (type) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[5];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>Compliance calendar</h1>
          <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{upcomingEvents.length} upcoming event{upcomingEvents.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {data.calendarEvents.length > 0 && (
            <button onClick={handleExport} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10,
              border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-secondary)",
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}>
              Export .ics
            </button>
          )}
          <button onClick={() => { resetForm(); setEditEvent(null); setShowAdd(true); }} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10,
            background: "var(--accent)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            + Add event
          </button>
        </div>
      </div>

      {/* Alerts for soon events */}
      {soonEvents.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          {soonEvents.filter(e => {
            const d = Math.ceil((new Date(e.eventDate) - today) / 86400000);
            return d <= 14 && d >= 0;
          }).map(ev => {
            const typeInfo = getTypeInfo(ev.eventType);
            const days = daysUntil(ev.eventDate);
            const isUrgent = days === "Today" || days === "Tomorrow";
            return (
              <div key={ev.id} style={{
                padding: "12px 16px", borderRadius: 12, marginBottom: 8,
                background: isUrgent ? "var(--danger-light)" : "var(--warning-light)",
                border: `1.5px solid ${isUrgent ? "var(--danger)" : "var(--warning)"}`,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <Icon name="alert" />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{ev.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>{days} \u00b7 {formatDate(ev.eventDate)}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: isUrgent ? "var(--danger)" : "var(--warning)" }}>{days}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem" }}>
        {[
          { id: "upcoming", label: "Upcoming" },
          { id: "month", label: "Month view" },
          { id: "all", label: "All events" },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: "pointer",
            border: `1.5px solid ${view === v.id ? "var(--accent)" : "transparent"}`,
            background: view === v.id ? "var(--accent-light)" : "transparent",
            color: view === v.id ? "var(--accent)" : "var(--text-secondary)",
          }}>{v.label}</button>
        ))}
      </div>

      {/* Upcoming view */}
      {view === "upcoming" && (
        upcomingEvents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-tertiary)" }}>
            <div style={{ marginBottom: 8 }}><Icon name="calendar" size={40} /></div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>No upcoming events</p>
            <p style={{ margin: "4px 0 0", fontSize: 13 }}>Add deadlines, renewal dates, or reminders to stay on track</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcomingEvents.map(ev => {
              const typeInfo = getTypeInfo(ev.eventType);
              return (
                <div key={ev.id} onClick={() => openEdit(ev)} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                  background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 12,
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                >
                  <div style={{ width: 4, height: 40, borderRadius: 2, background: typeInfo.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{ev.title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
                      {typeInfo.label} \u00b7 {formatDate(ev.eventDate)}
                      {ev.sourceDocument ? ` \u00b7 ${ev.sourceDocument}` : ""}
                    </p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap" }}>{daysUntil(ev.eventDate)}</span>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Month view */}
      {view === "month" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <button onClick={() => setMonthOffset(m => m - 1)} style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13 }}>Prev</button>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>{monthName}</h3>
            <button onClick={() => setMonthOffset(m => m + 1)} style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 13 }}>Next</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} style={{ padding: 8 }} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isToday = monthOffset === 0 && day === today.getDate();
              return (
                <div key={day} style={{
                  padding: "6px 4px", minHeight: 60, borderRadius: 8, fontSize: 12,
                  background: isToday ? "var(--accent-light)" : dayEvents.length ? "var(--bg-secondary)" : "transparent",
                  border: isToday ? "1.5px solid var(--accent)" : "1px solid transparent",
                }}>
                  <p style={{ margin: "0 0 4px", fontWeight: isToday ? 700 : 400, color: isToday ? "var(--accent)" : "var(--text-primary)", textAlign: "center" }}>{day}</p>
                  {dayEvents.map(ev => (
                    <div key={ev.id} onClick={() => openEdit(ev)} style={{
                      padding: "2px 4px", borderRadius: 4, marginBottom: 2, cursor: "pointer",
                      background: getTypeInfo(ev.eventType).color, fontSize: 10, color: "#fff",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{ev.title}</div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All events view */}
      {view === "all" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allEvents.length === 0 ? (
            <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-tertiary)", fontSize: 14 }}>No events yet.</p>
          ) : allEvents.map(ev => {
            const typeInfo = getTypeInfo(ev.eventType);
            const isPast = new Date(ev.eventDate) < today;
            return (
              <div key={ev.id} onClick={() => openEdit(ev)} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                background: "var(--bg-primary)", border: "1.5px solid var(--border)", borderRadius: 12,
                cursor: "pointer", opacity: isPast ? 0.5 : 1,
              }}>
                <div style={{ width: 4, height: 36, borderRadius: 2, background: typeInfo.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{ev.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>{typeInfo.label} \u00b7 {formatDate(ev.eventDate)}</p>
                </div>
                <span style={{ fontSize: 12, color: isPast ? "var(--text-tertiary)" : "var(--accent)", fontWeight: 500 }}>{daysUntil(ev.eventDate)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}
          onClick={() => { setShowAdd(false); setEditEvent(null); resetForm(); }}>
          <div style={{ background: "var(--bg-primary)", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto", padding: "2rem" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>{editEvent ? "Edit event" : "Add event"}</h2>
              <button onClick={() => { setShowAdd(false); setEditEvent(null); resetForm(); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}><Icon name="x" /></button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Event title *</label>
              <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Homeowners policy renewal"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Event type</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EVENT_TYPES.map(et => (
                  <button key={et.value} onClick={() => setFormType(et.value)} style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer",
                    border: `1.5px solid ${formType === et.value ? et.color : "var(--border)"}`,
                    background: formType === et.value ? "var(--bg-secondary)" : "var(--bg-primary)",
                    color: formType === et.value ? et.color : "var(--text-secondary)",
                  }}>{et.label}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Date *</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Remind me</label>
                <select value={formReminder} onChange={e => setFormReminder(e.target.value)} style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)",
                  background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none",
                }}>
                  <option value="0">No reminder</option>
                  <option value="1">1 day before</option>
                  <option value="3">3 days before</option>
                  <option value="7">1 week before</option>
                  <option value="14">2 weeks before</option>
                  <option value="30">1 month before</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Source document (optional)</label>
              <input value={formSource} onChange={e => setFormSource(e.target.value)} placeholder="e.g. State Farm homeowners policy"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Notes</label>
              <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Additional details..."
                rows={2} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {editEvent && (
                <button onClick={() => { handleDelete(editEvent.id); setShowAdd(false); setEditEvent(null); resetForm(); }} style={{
                  padding: "12px 20px", borderRadius: 10, border: "1.5px solid var(--danger)",
                  background: "var(--danger-light)", color: "var(--danger)", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>Delete</button>
              )}
              <button onClick={handleSave} disabled={!formTitle.trim() || !formDate} style={{
                flex: 1, padding: "12px", borderRadius: 10, border: "none",
                background: formTitle.trim() && formDate ? "var(--accent)" : "var(--border)",
                color: formTitle.trim() && formDate ? "#fff" : "var(--text-tertiary)",
                fontSize: 15, fontWeight: 600, cursor: formTitle.trim() && formDate ? "pointer" : "default",
              }}>
                {editEvent ? "Save changes" : "Add event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Placeholder Pages ─── */
function PlaceholderPage({ title, icon, description }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <div style={{ color: "var(--accent)", marginBottom: 12 }}><Icon name={icon} size={48} /></div>
      <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", maxWidth: 400, marginInline: "auto" }}>{description}</p>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [data, setData] = useState({ documents: [], inventory: [], calendarEvents: [], analyses: {} });
  const [page, setPage] = useState("dashboard");
  const [pageArg, setPageArg] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(API.getStoredUser());
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const navigate = useCallback((p, arg = null) => { setPage(p); setPageArg(arg); setSidebarOpen(false); }, []);

  const loadAllData = useCallback(async () => {
    if (!API.isLoggedIn()) return;
    setDataLoading(true);
    try {
      const [docs, items, events, analyses] = await Promise.all([
        API.listDocuments(), API.listInventory(), API.listCalendarEvents(), API.listAnalyses()
      ]);
      const analysesMap = {};
      analyses.forEach(a => { try { analysesMap[a.document_id] = JSON.parse(a.analysis_json); } catch(e){} });
      setData({ documents: docs.map(d => ({...d, type: d.doc_type, policySubtype: d.policy_subtype, mimeType: d.mime_type, uploadedAt: d.uploaded_at})), inventory: items.map(i => ({...i, estimatedValue: i.estimated_value, purchasePrice: i.purchase_price, purchaseDate: i.purchase_date, serialNumber: i.serial_number, photoPath: i.photo_path, receiptId: i.receipt_id, createdAt: i.created_at, updatedAt: i.updated_at})), calendarEvents: events.map(e => ({...e, eventType: e.event_type, eventDate: e.event_date, reminderDays: e.reminder_days, sourceDocument: e.source_document, createdAt: e.created_at})), analyses: analysesMap });
    } catch(e) { console.error("Failed to load data:", e); }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { if (API.isLoggedIn()) loadAllData(); }, [loadAllData]);

  const handleAuth = async () => {
    setAuthError(null); setAuthLoading(true);
    try {
      if (authMode === "register") { const r = await API.register(authEmail, authName, authPass); setUser(r.user); }
      else { const r = await API.login(authEmail, authPass); setUser(r.user); }
      loadAllData();
    } catch(e) { setAuthError(e.message); }
    finally { setAuthLoading(false); }
  };

  const handleLogout = () => { API.logout(); setUser(null); setData({ documents: [], inventory: [], calendarEvents: [], analyses: {} }); };

  if (!API.isLoggedIn() || !user) {
    return (
      <>
        <style>{`:root{--accent:#1a6b4e;--accent-light:#e8f5ee;--bg-primary:#ffffff;--bg-secondary:#f7f8f6;--bg-tertiary:#eef0ec;--text-primary:#1a1c1a;--text-secondary:#5a5f5a;--text-tertiary:#8a8f8a;--border:#dde0da;--warning:#9a6b15;--warning-light:#fdf5e6;--danger:#b53030;--danger-light:#fde8e8}@media(prefers-color-scheme:dark){:root{--accent:#4dab82;--accent-light:#1a3328;--bg-primary:#1a1c1a;--bg-secondary:#232623;--bg-tertiary:#2c302c;--text-primary:#e8ebe8;--text-secondary:#a0a5a0;--text-tertiary:#6a6f6a;--border:#3a3e3a;--danger:#e05050;--danger-light:#301515}}*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg-tertiary);color:var(--text-primary)}`}</style>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ background: "var(--bg-primary)", borderRadius: 20, padding: "2.5rem", width: "100%", maxWidth: 400, border: "1.5px solid var(--border)" }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>PolicyGuard</h1>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--text-secondary)" }}>{authMode === "register" ? "Create your account" : "Sign in to your account"}</p>
            </div>
            {authError && <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--danger-light)", marginBottom: "1rem", fontSize: 13, color: "var(--danger)" }}>{authError}</div>}
            {authMode === "register" && <div style={{ marginBottom: "1rem" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Name</label><input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Your name" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>}
            <div style={{ marginBottom: "1rem" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Email</label><input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
            <div style={{ marginBottom: "1.5rem" }}><label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>Password</label><input type="password" value={authPass} onChange={e => setAuthPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()} placeholder="Your password" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
            <button onClick={handleAuth} disabled={authLoading || !authEmail || !authPass} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: "1rem" }}>{authLoading ? "Please wait..." : authMode === "register" ? "Create account" : "Sign in"}</button>
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)" }}>{authMode === "register" ? "Already have an account? " : "Need an account? "}<button onClick={() => { setAuthMode(authMode === "register" ? "login" : "register"); setAuthError(null); }} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>{authMode === "register" ? "Sign in" : "Register"}</button></p>
          </div>
        </div>
      </>
    );
  }

  if (dataLoading) {
    return (
      <>
        <style>{`:root{--accent:#1a6b4e;--bg-tertiary:#eef0ec;--text-primary:#1a1c1a;--text-secondary:#5a5f5a}@media(prefers-color-scheme:dark){:root{--accent:#4dab82;--bg-tertiary:#2c302c;--text-primary:#e8ebe8;--text-secondary:#a0a5a0}}*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg-tertiary)}`}</style>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16, animation: "pulse 1.5s infinite" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>Loading your data...</p>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
          </div>
        </div>
      </>
    );
  }

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "vault", label: "Document vault", icon: "folder" },
    { id: "analyzer", label: "Policy analyzer", icon: "search" },
    { id: "inventory", label: "Property inventory", icon: "box" },
    { id: "calendar", label: "Compliance calendar", icon: "calendar" },
    { id: "searchAll", label: "Search everything", icon: "search" },
    { id: "reports", label: "Claim reports", icon: "clipboard" },
    { id: "disaster", label: "Disaster mode", icon: "alert" },
    { id: "settings", label: "Settings", icon: "wrench" },
  ];

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardPage data={data} onNavigate={navigate} />;
      case "vault": return <VaultPage data={data} setData={setData} onNavigate={navigate} />;
      case "analyzer": return <AnalyzerPage data={data} setData={setData} pageArg={pageArg} onNavigate={navigate} />;
      case "inventory": return <InventoryPage data={data} setData={setData} />;
      case "calendar": return <CalendarPage data={data} setData={setData} />;
      case "searchAll": return <SearchPage data={data} />;
      case "reports": return <ClaimReportPage data={data} />;
      case "disaster": return <DisasterModePage data={data} setData={setData} onNavigate={navigate} />;
      case "settings": return <SettingsPage />;
      default: return <DashboardPage data={data} onNavigate={navigate} />;
    }
  };

  return (
    <>
      <style>{`
        :root {
          --accent: #1a6b4e;
          --accent-light: #e8f5ee;
          --accent-hover: #145a40;
          --bg-primary: #ffffff;
          --bg-secondary: #f7f8f6;
          --bg-tertiary: #eef0ec;
          --text-primary: #1a1c1a;
          --text-secondary: #5a5f5a;
          --text-tertiary: #8a8f8a;
          --border: #dde0da;
          --border-hover: #c0c4bc;
          --warning: #9a6b15;
          --warning-light: #fdf5e6;
          --success: #1a6b4e;
          --success-light: #e8f5ee;
          --danger: #b53030;
          --danger-light: #fde8e8;
          --sidebar-width: 240px;
          --header-height: 56px;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --accent: #4dab82;
            --accent-light: #1a3328;
            --accent-hover: #5dbb92;
            --bg-primary: #1a1c1a;
            --bg-secondary: #232623;
            --bg-tertiary: #2c302c;
            --text-primary: #e8ebe8;
            --text-secondary: #a0a5a0;
            --text-tertiary: #6a6f6a;
            --border: #3a3e3a;
            --border-hover: #4a4e4a;
            --warning: #d4a340;
            --warning-light: #2d2510;
            --success: #4dab82;
            --success-light: #1a3328;
            --danger: #e05050;
            --danger-light: #301515;
          }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg-tertiary); color: var(--text-primary); }
        button { font-family: inherit; }
        input { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      `}</style>

      {/* Mobile header */}
      <div style={{
        display: "none", position: "fixed", top: 0, left: 0, right: 0, height: "var(--header-height)",
        background: "var(--bg-primary)", borderBottom: "1px solid var(--border)", zIndex: 100,
        alignItems: "center", padding: "0 1rem", justifyContent: "space-between",
      }} className="mobile-header">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", padding: 8 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>PolicyGuard</span>
        <div style={{ width: 40 }} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-header { display: flex !important; }
          .sidebar { transform: translateX(${sidebarOpen ? "0" : "-100%"}) !important; position: fixed !important; z-index: 200 !important; }
          .main-content { margin-left: 0 !important; padding-top: calc(var(--header-height) + 1.5rem) !important; }
          .sidebar-overlay { display: ${sidebarOpen ? "block" : "none"} !important; }
        }
      `}</style>

      {/* Sidebar overlay for mobile */}
      <div className="sidebar-overlay" style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 150 }} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <nav className="sidebar" style={{
        position: "fixed", top: 0, left: 0, bottom: 0, width: "var(--sidebar-width)",
        background: "var(--bg-primary)", borderRight: "1px solid var(--border)", padding: "1.5rem 0.75rem",
        display: "flex", flexDirection: "column", transition: "transform 0.2s ease",
        overflowY: "auto", zIndex: 200,
      }}>
        <div style={{ padding: "0 0.75rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>PolicyGuard</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
              border: "none", background: page === item.id ? "var(--accent-light)" : "transparent",
              color: page === item.id ? "var(--accent)" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 14, fontWeight: page === item.id ? 600 : 400,
              transition: "all 0.15s", width: "100%", textAlign: "left",
            }}>
              <Icon name={item.icon} />{item.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border)", marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>{user?.name?.[0]?.toUpperCase() || "U"}</div><span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{user?.name || "User"}</span></div>
          <button onClick={handleLogout} style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1.5px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>Sign out</button>
          <p style={{ fontSize: 10, color: "var(--text-tertiary)", lineHeight: 1.4, marginTop: 8 }}>Not legal or insurance advice.</p>
        </div>
      </nav>

      {/* Main content */}
      <main className="main-content" style={{ marginLeft: "var(--sidebar-width)", padding: "2rem", minHeight: "100vh" }}>
        <div style={{ maxWidth: 960, marginInline: "auto" }}>
          {renderPage()}
        </div>
      </main>
    </>
  );
}
