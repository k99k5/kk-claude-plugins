#!/usr/bin/env node
"use strict";

const { stdin, stdout, env } = require("node:process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DEBUG = true;

const LOG_FILE =
  env.AGENT_MODEL_ROUTING_LOG_FILE ||
  path.join(os.homedir(), ".claude", "agent-model-routing-debug.log");

const MODEL = Object.freeze({
  HAIKU: "haiku",
  FAST: "fast",
  SONNET: "sonnet",
  OPUS: "opus",
});

const MODEL_BY_AGENT = new Map([
  ["guide", MODEL.FAST],
  ["explore", MODEL.FAST],

  // 快速执行
  ["general", MODEL.SONNET],
  ["generalpurpose", MODEL.SONNET],

  // 规划、子任务
  ["plan", MODEL.OPUS],

  // 主任务、复杂任务
  ["agent", MODEL.OPUS],
  ["primary", MODEL.OPUS],
  ["team", MODEL.OPUS],
]);

function debugLog(message, data) {
  if (!DEBUG) {
    return;
  }

  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

    const line = JSON.stringify({
      time: new Date().toISOString(),
      message,
      data,
    });

    fs.appendFileSync(LOG_FILE, `${line}\n`, "utf8");
  } catch {
    // 不能影响 hook 本身
  }
}

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
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+model$/u, "")
    .replace(/[^a-z0-9]/gu, "");
}

async function main() {
  try {
    const rawInput = await readStdin();

    debugLog("raw input received", {
      length: rawInput.length,
      rawInput,
    });

    if (!rawInput || rawInput.trim() === "") {
      debugLog("empty input, skipped");
      return;
    }

    const payload = JSON.parse(rawInput);

    debugLog("payload parsed", {
      tool_name: payload.tool_name,
      tool_input: payload.tool_input,
    });

    if (payload.tool_name !== "Agent") {
      debugLog("not Agent tool, skipped", {
        tool_name: payload.tool_name,
      });
      return;
    }

    if (!isObject(payload.tool_input)) {
      debugLog("tool_input is not object, skipped", {
        tool_input: payload.tool_input,
      });
      return;
    }

    const toolInput = payload.tool_input;

    const rawAgent =
      toolInput.subagent_type ??
      toolInput.agent ??
      toolInput.agent_name ??
      toolInput.name;

    const normalizedAgent = normalizeAgentName(rawAgent);
    const targetModel = MODEL_BY_AGENT.get(normalizedAgent);

    debugLog("agent resolved", {
      rawAgent,
      normalizedAgent,
      targetModel,
    });

    if (!targetModel) {
      debugLog("no model mapping found, skipped", {
        normalizedAgent,
      });
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

    debugLog("hook output generated", result);

    stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    debugLog("error caught", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
  }
}

main();