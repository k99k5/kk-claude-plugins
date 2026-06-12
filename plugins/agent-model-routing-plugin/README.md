# Agent Model Routing

Claude Code 插件：在 `PreToolUse` 阶段拦截 `Agent` 工具调用，根据 `subagent_type` 自动改写 `model`，并移除 `isolation` 字段。

## 路由规则

| subagent_type | model |
| --- | --- |
| `Explore` | `sonnet` |
| `Plan` | `opus` |
| `general-purpose` | `opus` |
| `Agent` | `opus` |
| 空值 | `sonnet` |
| 其他值 | 不处理 |

原 PowerShell 脚本中的 `soonet` 已修正为 `sonnet`。

## 目录结构

```text
agent-model-routing-plugin/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   └── hooks.json
└── scripts/
    └── agent-model-routing.js
```

## 本地测试

```bash
claude --plugin-dir ./agent-model-routing-plugin
```

Claude Code 启动后执行：

```text
/hooks
```

确认 `PreToolUse -> Agent` hook 已加载。

修改插件后执行：

```text
/reload-plugins
```

## 独立测试脚本

```bash
echo '{"tool_name":"Agent","tool_input":{"subagent_type":"Explore","prompt":"test","isolation":"worktree"}}' \
  | node ./scripts/agent-model-routing.js
```

预期输出中应包含：

```json
{"model":"sonnet"}
```
