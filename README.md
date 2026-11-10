# Dify Chatflow 网页封装（双角色）

把两个角色的 Dify Chatflow 封装成一个网页：前端切换“埃尔文 / 一只猪”，后端代理 Dify API 请求，API Key 保存在服务端环境变量中。

## 角色与配置

| 网页角色 | 服务端变量 | 本地聊天接口 |
| --- | --- | --- |
| 埃尔文（角色 A） | `DIFY_API_KEY_ROLE_A` | `POST /api/chat/a` |
| 一只猪（角色 B） | `DIFY_API_KEY_ROLE_B` | `POST /api/chat/b` |

本项目调用 Dify 的 **Chatflow 聊天接口** `/v1/chat-messages`。请为两个角色分别准备可通过该接口调用的应用和 API Key，不能直接使用只支持 `/v1/workflows/run` 的 Workflow 应用代替。

网页会发送 `inputs.user_name` 和 `inputs.mission`；当前前端要求 **mission 必填**。请让自己的 Chatflow 表单变量与这两个字段匹配。

## Windows PowerShell 快速开始

先安装 [Git](https://git-scm.com/downloads) 和 [Node.js](https://nodejs.org/en/download)。代码使用 Node.js 原生 `fetch`，需要 Node.js 18 或更新版本；新安装请选择仍受维护的 LTS 版本。

### 1. 下载项目

在自己选择的开发目录执行：

```powershell
git clone https://github.com/beiwocaishijia/difyjuese.git
cd difyjuese
node --version
npm --version
```

也可以从仓库页面选择 **Code → Download ZIP**，解压后在包含 `package.json` 的目录打开 PowerShell。

### 2. 配置两个角色的 Key

首次配置时复制模板；如果已有 `.env`，直接编辑现有文件，保留原配置：

```powershell
Copy-Item .env.example .env
```

用文本编辑器打开 `.env`，把占位符替换成自己两个应用的 API Key：

```dotenv
DIFY_BASE_URL=https://api.dify.ai/v1
DIFY_API_KEY_ROLE_A=替换为角色A应用的APIKey
DIFY_API_KEY_ROLE_B=替换为角色B应用的APIKey
PORT=5173
```

自托管 Dify 可修改 `DIFY_BASE_URL`，地址应包含 `/v1` 且不带末尾斜杠。`.env` 已被 Git 忽略；不要把真实 Key 写进前端文件、提交记录或问题截图。

### 3. 安装依赖并启动

```powershell
npm ci
npm run dev
```

本仓库已提交 `package-lock.json`，`npm ci` 会按锁定版本安装依赖。`npm start` 也可以启动同一个服务入口。

保持终端运行，在浏览器打开 **http://localhost:5173**。不要直接双击 `public/index.html`，页面需要本地后端提供接口。停止服务可在运行它的终端按 `Ctrl+C`；修改 `.env` 后需要重新启动服务。

macOS / Linux 可将复制模板的命令换成 `cp .env.example .env`，其余安装和启动命令相同。

## 检查服务与开始聊天

服务运行后，在另一个 PowerShell 窗口执行：

```powershell
Invoke-RestMethod http://localhost:5173/api/health
```

配置了两个非空 Key 时，返回字段应包括：

```json
{
  "ok": true,
  "difyBaseUrl": "https://api.dify.ai/v1",
  "hasRoleAKey": true,
  "hasRoleBKey": true
}
```

**这个接口只检查本地服务和环境变量是否非空，不会向 Dify 验证 Key。** 即使仍使用模板占位符，两个 Key 字段也可能显示为 `true`。必须分别切换角色发送消息，才能验证对应应用的 Key、表单变量、模型配置和额度是否可用。

1. 选择“埃尔文”或“一只猪”。
2. 按自己的 Chatflow 要求填写 **mission**；`user_name` 可选。
3. 输入消息，按 `Enter` 发送；`Shift+Enter` 换行。
4. 收到回复后切换另一个角色，再验证一次。

真实对话会调用自己配置的 Dify 应用，可能产生该应用或模型的使用费用。

## 会话与本地记录

- 两个角色独立保存 `conversation_id`、消息记录和表单输入，数据位于当前浏览器的 `localStorage`。
- **新建会话**：清空当前角色的 `conversation_id` 和本地消息；下一条消息开启新会话。
- **清空本地聊天记录**：只清空当前角色的本地消息，保留 `conversation_id`，后续消息仍可能延续原会话。
- 两个按钮都不会删除 Dify 服务端的历史数据。更换浏览器或清除站点存储后，本地记录不会自动同步回来。

## 常见问题

| 现象 | 排查方式 |
| --- | --- |
| `node` / `npm` 无法识别 | 安装 Node.js 后重新打开终端，再检查 `node --version` 和 `npm --version`。 |
| PowerShell 提示无法运行 `npm.ps1` | 可使用 `npm.cmd ci`、`npm.cmd run dev` 调用同一个 npm，无需修改执行策略。 |
| 浏览器无法连接或健康检查失败 | 确认终端中的服务仍在运行，地址端口与 `.env` 的 `PORT` 相同；从项目根目录启动服务。 |
| `EADDRINUSE` / 5173 端口被占用 | 将 `.env` 的 `PORT` 改为其他空闲端口，例如 5174，重启后访问 `http://localhost:5174`，健康检查地址也同步修改。 |
| `hasRoleAKey` 或 `hasRoleBKey` 为 `false` | 检查对应变量名、文件名是否确为 `.env`，以及是否从项目根目录启动；修改配置后重启。 |
| `Unknown role or missing API key.`（HTTP 400） | 接口角色只接受 `a` / `b`；检查当前角色对应的 Key 是否为空。 |
| 提示 `inputs.mission` 必填 | 在网页上方填写 mission；两个角色的表单输入分别保存。 |
| `Dify API error` | 查看返回的 HTTP 状态和 `details`；核对应用类型、Key、表单变量、应用发布状态及模型额度。健康检查为 `true` 不代表这些条件已通过。 |
| HTTP 401 / 403 | 根据 Dify 返回详情检查 Key 是否有效、是否属于当前应用，以及该应用的访问权限。 |
| HTTP 429 | 按返回详情检查限流或配额，稍后再试。 |
| `Server error` / `fetch failed` | 查看页面返回的错误详情，检查运行服务的进程到 `DIFY_BASE_URL` 的网络连接、代理配置及地址格式。 |
| “Dify 未返回 answer 字段” | 核对使用的是兼容 `/chat-messages` 的 Chatflow 应用和正确 API 地址。 |

## 接口与项目结构

- `GET /api/health`：本地健康检查，返回配置是否存在，不返回 Key 内容。
- `POST /api/chat/:role`：接收 `message`、`conversation_id`、`user`、`inputs`，以 `blocking` 模式调用 Dify `/chat-messages`。
- [server.js](server.js)：Express 服务、环境变量和 Dify 请求代理。
- [public/index.html](public/index.html)：角色切换、表单和聊天页面。
- [public/main.js](public/main.js)：消息发送、表单校验与浏览器本地记录。
- [.env.example](.env.example)：环境变量模板。

当前代理接口未提供用户登录或访问鉴权。对外部署前，需要为服务增加适当的访问控制；把 Key 放在服务端并不等于接口只能由自己调用。

## 原项目参考

原项目使用的两个工作流编辑链接如下，查看它们需要对应的 Dify 账号权限；使用自己的 Chatflow 时无需访问这些链接：

- https://cloud.dify.ai/app/51b43266-e8b8-4d4e-beb7-6f682c64afb2/workflow
- https://cloud.dify.ai/app/f3664b37-a573-4b46-a56c-4411e70ee04a/workflow

