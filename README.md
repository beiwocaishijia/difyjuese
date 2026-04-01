# Dify Chatflow 网页封装（双角色）

把两个不同角色的 Dify Chatflow 封装成一个网页：前端切换「埃尔文 / 一只猪」，后端做 API 代理来避免在浏览器暴露 `API_KEY`。

## 角色映射

- 角色 A = 埃尔文（服务端环境变量：`DIFY_API_KEY_ROLE_A`）
- 角色 B = 一只猪（服务端环境变量：`DIFY_API_KEY_ROLE_B`）

## 1) 准备

安装 Node.js（建议 18+）。

在项目根目录复制一份环境变量文件：

- 把 `.env.example` 复制为 `.env`
- 填入两个角色各自的 Key：
  - `DIFY_API_KEY_ROLE_A=...`（埃尔文）
  - `DIFY_API_KEY_ROLE_B=...`（一只猪）

> Dify API 地址默认为 `https://api.dify.ai/v1`，可用 `DIFY_BASE_URL` 覆盖。

## 2) 运行

在项目根目录执行：

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。

## 3) 使用说明

- 右上角切换角色：埃尔文/一只猪 各自**独立保存** `conversation_id` 与聊天记录（保存在浏览器 localStorage）。
- 「新建会话」会清空当前角色的 `conversation_id`，下一条消息会开启新会话。
- 「清空本地聊天记录」只清空显示，不会影响 Dify 侧数据。

## 4) 你给的两个工作流链接

- `https://cloud.dify.ai/app/51b43266-e8b8-4d4e-beb7-6f682c64afb2/workflow`
- `https://cloud.dify.ai/app/f3664b37-a573-4b46-a56c-4411e70ee04a/workflow`

网页封装是通过 Dify 的 API（`/v1/chat-messages`）按不同角色 Key 调用来实现的。

## 5) 验证（可选）

- 启动后访问 `http://localhost:5173/api/health`
  - 期待看到：`hasRoleAKey=true`、`hasRoleBKey=true`

