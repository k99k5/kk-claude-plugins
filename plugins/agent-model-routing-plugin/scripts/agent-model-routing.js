#!/usr/bin/env node
"use strict";

const { stdin, stdout } = require("node:process");

const MODEL = Object.freeze({
  HAIKU: "haiku",
  FAST: "fast",
  SONNET: "sonnet",
  OPUS: "opus",
});

const MODEL_BY_AGENT = new Map([
  ["guide", MODEL.HAIKU],
  ["explore", MODEL.HAIKU],

  // 快速执行
  ["general", MODEL.FAST],
  ["generalpurpose", MODEL.FAST],

  // 规划、子任务
  ["plan", MODEL.OPUS],

  // 主任务、复杂任务
  ["agent", MODEL.OPUS],
  ["primary", MODEL.OPUS],
  ["team", MODEL.OPUS],
]);

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    stdin.setEncoding("utf8");
    stdin.on("data", (chunk) => {
      data += chunk;
    });
    stdin.on("end", () => resolve(data));
    stdin.on("error", reject);
  });
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeAgentName(value) {
  if (value == null) {
    return '';
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+model$/u, '')
    .replace(/[^a-z0-9]/gu, '');
}

async function main() {
  try {
    const rawInput = await readStdin();
    if (!rawInput || rawInput.trim() === "") {
      return;
    }

    const payload = JSON.parse(rawInput);
    if (payload.tool_name !== "Agent" || !isObject(payload.tool_input)) {
      return;
    }

    const toolInput = payload.tool_input;
    const normalizedAgent = normalizeAgentName(
      toolInput.subagent_type ??
        toolInput.agent ??
        toolInput.agent_name ??
        toolInput.name
    );

    const targetModel = MODEL_BY_AGENT.get(normalizedAgent);

    if (!targetModel) {
      return;
    }

    const updatedInput = { ...toolInput, model: targetModel };
    delete updatedInput.isolation;

    const result = {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput,
      },
    };

    stdout.write(`${JSON.stringify(result)}\n`);
  } catch {
    // Match the original PowerShell behavior: fail closed to "no hook decision".
  }
}

main();
