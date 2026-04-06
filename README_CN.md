# API Key Manager

> 本项目已从 Vercel 部署迁移至 Cloudflare Pages，使用 Cloudflare KV 存储替代原有的 Vercel 存储方案。

## 迁移说明

**存储架构变更**：
- 原 Vercel 部署 → 现为 Cloudflare Pages + KV 存储
- 所有数据（API 密钥、用户、会话、设置）均存储在 Cloudflare KV 中
- 浏览器仅存储界面语言偏好（localStorage）

**功能修复**：
- ✅ 修复 Cloudflare Pages 环境下的认证流程（`9822680`）
- ✅ 修复连接测试在 Edge Runtime 下的兼容性问题（`9822680`, `3f0fc15`）
- ✅ 优化仪表盘缓存加载和服务商筛选（`e910030`）
- ✅ 添加 KV runtime 导出以支持 Cloudflare Pages（`bbb6b0c`）

**新增功能**：
- ✅ 首页检测开关（`monitorOnDashboard`）- 每个密钥可独立控制是否在首页监控

---

一个安全且高效的 API 密钥管理系统，帮助开发者和团队轻松管理各种 AI 模型的 API 密钥。

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [部署指南](#部署指南)
- [使用方法](#使用方法)
- [安全建议](#安全建议)
- [配置说明](#配置说明)
- [许可证](#许可证)

## 功能特性

### 🔑 API 密钥管理

- **多服务商支持**：支持 OpenAI、Anthropic、百度、Google、Meta、Mistral、Cohere 及自定义服务商
- **复合密钥类型**：支持单一 API Key 和 Key + AppID + SecretKey 两种密钥类型
- **自定义 API 地址**：支持本地部署或私有 API 端点
- **充值链接管理**：每个密钥可配置充值 URL，方便从仪表盘快速跳转

### 📊 首页监控开关

- **独立控制**：每个密钥可独立设置是否加入首页连接状态检测（`monitorOnDashboard`）
- **向后兼容**：旧数据默认开启首页检测，保持原有体验
- **灵活筛选**：替代了之前的"前10条"限制，让您自主选择需要在首页监控的密钥

### 🔌 连接测试

- **URL 可达性检测**：测试 API 地址是否可访问
- **模型列表获取**：支持时自动获取可用模型列表
- **单条测试**：点击单个密钥的"测试"按钮立即测试
- **批量刷新**：首页支持一键刷新所有监控密钥的连接状态

### 🔒 安全加密

- **AES-256 加密**：所有密钥使用 AES-256 加密算法存储
- **HTTPS 传输**：生产环境强制使用 HTTPS
- **会话管理**：安全的会话机制，支持过期自动清理

### 👥 多用户支持

- **角色管理**：支持管理员和普通用户两种角色
- **权限控制**：管理员可管理系统设置，普通用户仅管理自己的密钥
- **登录限流**：防止暴力破解，15分钟内最多10次尝试

### 🌍 多语言界面

- **中英文切换**：界面支持中文和英文两种语言
- **实时切换**：在设置中随时切换界面语言

## 技术栈

- **前端框架**：[Next.js](https://nextjs.org/) 14.1 (App Router)
- **运行时环境**：[Cloudflare Workers](https://workers.cloudflare.com/) / [Cloudflare Pages](https://pages.cloudflare.com/)
- **数据存储**：[Cloudflare KV](https://developers.cloudflare.com/kv/)
- **UI 组件**：[Radix UI](https://www.radix-ui.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **开发语言**：[TypeScript](https://www.typescriptlang.org/)
- **主题支持**：[next-themes](https://github.com/pacocoursey/next-themes)

## 快速开始

### 前提条件

- Node.js 18.x 或更高版本
- npm 或 yarn

### 本地开发

1. **克隆仓库**

```bash
git clone <your-repo-url>
cd api-key-manager
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

创建 `.env.local` 文件：

```bash
ENCRYPTION_KEY=your-secure-random-string-here
```

> ⚠️ **重要**：`ENCRYPTION_KEY` 必须是一个强随机字符串，用于加密所有 API 密钥。请妥善保管，丢失后无法解密已存储的密钥。

4. **启动开发服务器**

```bash
npm run dev
```

应用将在 `http://localhost:3000` 上运行。

5. **首次登录**

首次访问时系统会提示创建管理员账号。

## 部署指南

### Cloudflare Pages 部署（推荐）

1. **Fork 本仓库**到您的 GitHub 账号

2. **创建 KV 命名空间**

```bash
npm install -g wrangler
npx wrangler kv:namespace create "KV"
```

记下返回的 `id`，例如：`xxxxyyyyzzzz`

3. **在 Cloudflare Pages 创建项目**

   - 连接您的 GitHub 账号
   - 选择 `api-key-manager` 仓库
   - 构建设置保持默认（自动检测 Next.js）

4. **配置环境变量**

在 Cloudflare Pages 设置 > 环境变量中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `KV` | 您的 KV 命名空间 ID | 从步骤 2 获取 |
| `ENCRYPTION_KEY` | 强随机字符串 | 必填，用于加密密钥 |
| `SETUP_TOKEN` | 随机字符串（可选） | 可选，用于初始化验证 |

5. **部署**

   - 点击"保存并部署"
   - 等待构建完成

6. **首次访问**

   访问分配的 `.pages.dev` 域名，创建管理员账号。

### Docker 部署

1. **构建镜像**

```bash
docker build -t api-key-manager .
```

2. **运行容器**

```bash
docker run -p 3000:3000 \
  -e ENCRYPTION_KEY=your-secure-key \
  api-key-manager
```

3. **访问应用**

打开 `http://localhost:3000`

## 使用方法

### 1. 添加 API 密钥

登录后，进入"API 密钥"页面：

1. 点击"添加密钥"按钮
2. 填写密钥信息：
   - **名称**：给密钥起个易于识别的名字
   - **服务商**：选择 AI 服务商（OpenAI、Anthropic 等）
   - **密钥类型**：单一 API Key 或复合密钥
   - **API 密钥**：输入实际的 API Key
   - **App ID / Secret Key**：复合密钥类型需要填写
   - **API 请求 URL**：可选，留空使用默认地址
   - **充值 URL**：可选，方便后续充值
   - **加入首页检测**：勾选后该密钥会在首页显示连接状态
3. 点击"保存"

### 2. 测试连接

在"API 密钥"页面或首页仪表盘：

- **单个测试**：点击密钥卡片上的"测试"按钮
- **批量刷新**：在首页点击"刷新状态"按钮，测试所有已开启监控的密钥

测试结果会显示：
- ✅ 连接正常（延迟时间）
- ⚠️ 认证失败
- ❌ 连接失败
- ℹ️ 未测试

### 3. 管理密钥

- **编辑**：点击密钥卡片的编辑图标，修改密钥信息
- **删除**：点击删除图标，确认后删除密钥
- **充值**：点击"充值"按钮快速跳转到配置的充值页面

### 4. 系统设置

在"设置"页面可以：

- **更改密码**：更新当前账号密码
- **切换语言**：在中文和英文之间切换
- **调整主题**：在亮色/暗色/自动主题间切换

## 安全建议

### 🔴 关键安全措施

1. **更改默认密码**
   - 首次登录后立即修改管理员密码
   - 使用强密码（建议 12 位以上，包含大小写字母、数字和符号）

2. **保护 ENCRYPTION_KEY**
   - 使用强随机字符串（至少 32 字符）
   - 不要提交到代码仓库
   - 丢失后无法恢复已加密的密钥

3. **启用 HTTPS**
   - 生产环境必须使用 HTTPS
   - Cloudflare Pages 自动提供 SSL 证书

4. **定期维护**
   - 定期更换 API 密钥
   - 定期备份 KV 数据（使用 Wrangler CLI）
   - 监控异常登录尝试

5. **访问控制**
   - 避免在公共网络环境下管理密钥
   - 及时移除不再需要的用户账号

### 备份数据

使用 Wrangler CLI 备份 KV 数据：

```bash
# 列出所有 KV 键
npx wrangler kv:key list --namespace-id=<YOUR_KV_ID>

# 导出特定键
npx wrangler kv:key get "keys:1" --namespace-id=<YOUR_KV_ID>
```

## 配置说明

### 环境变量

| 变量名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `ENCRYPTION_KEY` | string | ✅ | 用于加密 API 密钥的密钥，建议使用 32 字符以上的强随机字符串 |
| `SETUP_TOKEN` | string | ❌ | 初始化验证令牌，设置后需要提供此值才能创建管理员账号 |
| `KV` | string | ❌ | Cloudflare KV 命名空间 ID（Cloudflare Pages 自动配置） |

### 密钥类型说明

- **API Key（单一密钥）**
  - 只需填写 API Key
  - 适用于：OpenAI、Anthropic、Google、Meta、Mistral、Cohere 等

- **复合密钥（Key + AppID）**
  - 需要填写 API Key、App ID、Secret Key
  - 适用于：百度文心一言等需要多参数认证的服务

### 首页检测说明

- `monitorOnDashboard: true` - 密钥会出现在首页连接状态监控中
- `monitorOnDashboard: false` - 密钥仅在列表页显示，不参与首页监控
- 旧数据默认为 `true`，保持向后兼容

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 支持

如有问题或建议，请：
- 提交 [Issue](../../issues)
- 发起 [Pull Request](../../pulls)

---

**享受安全、高效的 API 密钥管理体验！**
