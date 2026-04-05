# API Key Manager

一个安全且高效的API密钥管理系统，帮助开发者和团队轻松管理各种AI模型的API密钥。

## 功能

- **API密钥管理**: 安全地存储和管理来自多个AI服务提供商的API密钥
- **安全加密**: 使用高级加密技术保护您的API密钥
- **状态监控**: 实时监控API密钥的连接状态
- **多语言支持**: 在中文和英文界面之间切换
- **自定义设置**: 根据您的需求自定义系统设置和偏好
- **连接测试**: 直接从仪表盘测试API连接

## 快速开始

### 前提条件

- Node.js 18.x 或更高版本
- npm 或 yarn

### 本地开发

1. 安装依赖：

```bash
npm install
```

2. 创建 `.env.local` 文件：

```plaintext
ENCRYPTION_KEY=your-secure-random-string
```

3. 启动开发服务器：

```bash
npm run dev
```

应用将在 `http://localhost:3000` 上可用。

### Cloudflare Pages 部署

1. Fork 本仓库
2. 创建 Cloudflare Pages 项目并关联仓库
3. 创建 KV 命名空间：`npx wrangler kv:namespace create "KV"`
4. 在 Cloudflare Pages 设置中配置环境变量：
   - `ENCRYPTION_KEY`: 用于加密API密钥的安全随机字符串
5. 部署

默认登录凭据：
- 用户名: `admin`
- 密码: `password`

> 首次登录后请立即更改默认密码。

### Docker 部署

```bash
docker build -t api-key-manager .
docker run -p 3000:3000 -e ENCRYPTION_KEY=your-secure-key api-key-manager
```

## 使用方法

1. 使用默认凭据登录
2. 前往"API密钥"页面添加/管理密钥
3. 使用仪表盘上的"测试"按钮测试连接
4. 在设置页面进行配置

## 安全建议

1. 首次登录后立即更改默认管理员密码
2. 为生产部署使用强大且唯一的 `ENCRYPTION_KEY`
3. 生产环境确保启用 HTTPS
4. 定期备份数据
5. 定期更换 API 密钥

## 配置

| 变量             | 描述                  | 默认值 |
| ---------------- | --------------------- | ------ |
| `ENCRYPTION_KEY` | 用于加密API密钥的密钥 | 必填   |

## 许可证

MIT License
