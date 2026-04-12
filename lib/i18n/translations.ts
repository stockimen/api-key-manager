// 更新翻译不足问题
export type TranslationKey =
  | "common.loading"
  | "common.refresh"
  | "common.cancel"
  | "common.save"
  | "common.edit"
  | "common.delete"
  | "common.add"
  | "common.copy"
  | "common.copied"
  | "common.required"
  | "common.optional"
  | "common.yes"
  | "common.no"
  | "common.close"
  | "common.back"
  | "common.next"
  | "common.submit"
  | "common.search"
  | "common.filter"
  | "common.all"
  | "common.none"
  | "common.default"
  | "common.error"
  | "common.success"
  | "common.warning"
  | "common.info"
  | "common.name"
  | "common.type"
  | "common.model"
  | "common.date"
  | "common.actions"
  | "common.key"
  | "common.url"
  | "common.created"
  | "common.updated"
  | "common.lastUsed"
  | "common.settings"
  | "common.profile"
  | "common.logout"
  | "common.login"
  | "common.register"
  | "common.password"
  | "common.confirmPassword"
  | "common.email"
  | "common.username"
  | "common.dashboard"
  | "common.apiKeys"
  | "common.system"
  | "common.user"
  | "common.security"
  | "common.language"
  | "common.theme"
  | "common.light"
  | "common.dark"
  | "app.title"
  | "app.description"
  | "login.title"
  | "login.description"
  | "login.button"
  | "login.error"
  | "login.noAccount"
  | "auth.enterOtp"
  | "auth.backToLogin"
  | "auth.totpTitle"
  | "auth.totpDescription"
  | "auth.totpSetup"
  | "auth.totpEnabled"
  | "auth.totpDisabled"
  | "auth.totpEnabledStatus"
  | "auth.totpNotEnabled"
  | "auth.scanQrCode"
  | "auth.manualEntry"
  | "auth.verifyAndEnable"
  | "auth.disableTotp"
  | "auth.enterDisableCode"
  | "auth.totpSetupFailed"
  | "auth.totpVerifyFailed"
  | "register.title"
  | "register.description"
  | "register.button"
  | "register.error"
  | "register.hasAccount"
  | "register.disabled"
  | "register.disabledMessage"
  | "dashboard.title"
  | "dashboard.activeKeys"
  | "dashboard.encryptedKeys"
  | "dashboard.comparedToLastMonth"
  | "dashboard.allKeysEncrypted"
  | "dashboard.apiAvailability"
  | "dashboard.apiAvailabilityNormal"
  | "dashboard.apiAvailabilityDelayed"
  | "dashboard.apiAvailabilityIssues"
  | "dashboard.apiAvailabilityHint"
  | "apiKeys.title"
  | "apiKeys.list"
  | "apiKeys.add"
  | "apiKeys.edit"
  | "apiKeys.delete"
  | "apiKeys.deleteConfirm"
  | "apiKeys.addNew"
  | "apiKeys.addDescription"
  | "apiKeys.editDescription"
  | "apiKeys.keyType"
  | "apiKeys.apiKey"
  | "apiKeys.complexKey"
  | "apiKeys.appId"
  | "apiKeys.secretKey"
  | "apiKeys.baseUrl"
  | "apiKeys.baseUrlPlaceholder"
  | "apiKeys.baseUrlDescription"
  | "apiKeys.modelPlaceholder"
  | "apiKeys.namePlaceholder"
  | "apiKeys.keyPlaceholder"
  | "apiKeys.appIdPlaceholder"
  | "apiKeys.secretKeyPlaceholder"
  | "apiKeys.requestHeader"
  | "apiKeys.customUrlTip"
  | "apiKeys.searchLabel"
  | "apiKeys.searchPlaceholder"
  | "apiKeys.providerFilter"
  | "apiKeys.clearFilters"
  | "apiKeys.noMatchingResults"
  | "apiKeys.emptyState"
  | "apiKeys.previousPage"
  | "apiKeys.nextPage"
  | "apiKeys.resultCount"
  | "apiKeys.pageIndicator"
  | "apiKeys.pageSize"
  | "apiKeys.pageSizeAll"
  | "settings.title"
  | "settings.system"
  | "settings.user"
  | "settings.security"
  | "settings.systemSettings"
  | "settings.systemDescription"
  | "settings.allowRegistration"
  | "settings.allowRegistrationDescription"
  | "settings.defaultKeyType"
  | "settings.defaultKeyTypeDescription"
  | "settings.encryptionLevel"
  | "settings.encryptionLevelDescription"
  | "settings.medium"
  | "settings.high"
  | "settings.veryHigh"
  | "settings.userSettings"
  | "settings.userDescription"
  | "settings.showDecryptedKeys"
  | "settings.showDecryptedKeysDescription"
  | "settings.securitySettings"
  | "settings.securityDescription"
  | "settings.currentPassword"
  | "settings.newPassword"
  | "settings.confirmNewPassword"
  | "settings.changePassword"
  | "settings.saveSystemSettings"
  | "settings.saveUserSettings"
  | "settings.settingsSaved"
  | "settings.passwordChanged"
  | "settings.languageSettings"
  | "settings.languageDescription"
  | "settings.selectLanguage"
  | "settings.languageChanged"
  | "toast.copied"
  | "toast.copyDescription"
  | "toast.addSuccess"
  | "toast.editSuccess"
  | "toast.deleteSuccess"
  | "toast.error"
  | "toast.loginSuccess"
  | "toast.logoutSuccess"
  | "toast.registerSuccess"
  | "error.required"
  | "error.passwordMatch"
  | "error.invalidEmail"
  | "error.invalidUrl"
  | "error.fetchFailed"
  | "error.saveFailed"
  | "error.deleteFailed"
  | "error.loginFailed"
  | "error.registerFailed"
  | "error.unauthorized"
  | "error.notFound"
  | "error.serverError"
  | "apiKeys.apiType"
  | "apiKeys.popularProvider"
  | "apiKeys.customProvider"
  | "apiKeys.provider"
  | "apiKeys.selectProvider"
  | "apiKeys.providerDescription"
  | "apiKeys.providerPlaceholder"
  | "apiKeys.customProviderDescription"
  | "apiKeys.modelOptional"
  | "dashboard.apiBalance"
  | "dashboard.totalBalance"
  | "dashboard.recharge"
  | "dashboard.refreshBalance"
  | "dashboard.lowBalanceWarning"
  | "dashboard.balanceUpdated"
  | "dashboard.balanceNote"
  | "dashboard.usdEquivalent"
  | "apiKeys.rechargeUrl"
  | "apiKeys.rechargeUrlPlaceholder"
  | "apiKeys.rechargeUrlDescription"
  | "apiKeys.monitorOnDashboard"
  | "apiKeys.monitorOnDashboardDescription"
  | "apiKeys.priority"
  | "apiKeys.priorityDescription"
  | "apiKeys.dashboardMonitoring"
  | "apiKeys.monitoringEnabled"
  | "apiKeys.monitoringDisabled"
  | "error.connectionFailed"
  | "error.testFailed"
  | "error.networkError"
  | "error.serverConnectionFailed"
  | "error.timeout"
  | "error.unknownError"
  | "api.status.title"
  | "api.status.description"
  | "api.status.refreshing"
  | "api.status.refresh"
  | "api.status.connectionTest"
  | "api.status.testDescription"
  | "api.status.rechargeManage"
  | "api.status.redirecting"
  | "api.status.testing"
  | "api.status.test"
  | "api.status.recharge"
  | "api.status.latency"
  | "api.status.lastTested"
  | "api.status.noApiKeys"
  | "api.status.openLink"
  | "api.status.loading"
  | "api.status.autoUpdate"
  | "api.status.testButton"
  | "api.status.rechargeButton"
  | "api.status.modelListAvailable"
  | "api.status.urlReachable"
  | "api.status.modelAuthFailed"
  | "api.status.normal"
  | "api.status.authFailed"
  | "api.status.rateLimited"
  | "api.status.connectionError"
  | "api.status.notTested"
  | "home.hero.subtitle"
  | "home.hero.cta"
  | "home.features.title"
  | "home.features.subtitle"
  | "home.features.keyManagement.title"
  | "home.features.keyManagement.description"
  | "home.features.security.title"
  | "home.features.security.description"
  | "home.features.monitoring.title"
  | "home.features.monitoring.description"
  | "home.features.settings.title"
  | "home.features.settings.description"
  | "home.contact.title"
  | "home.contact.subtitle"
  | "home.footer.copyright"
  | "api.status.urlTestDescription"
  | "settings.passwordLengthHint"
  | "passkey.title"
  | "passkey.description"
  | "passkey.noPasskeys"
  | "passkey.add"
  | "passkey.delete"
  | "passkey.registerSuccess"
  | "passkey.registerFailed"
  | "passkey.deleteSuccess"
  | "passkey.deleteFailed"
  | "passkey.loginButton"
  | "common.or"
  | "apiKeys.tags"
  | "apiKeys.addTag"
  | "apiKeys.tagFilter"

export interface Translations {
  [key: string]: string
}

export type Language = "zh-CN" | "en-US"

// 中文翻译
export const zhCN: Translations = {
  // 通用翻译
  "common.loading": "加载中...",
  "common.refresh": "刷新",
  "common.cancel": "取消",
  "common.save": "保存",
  "common.edit": "编辑",
  "common.delete": "删除",
  "common.add": "添加",
  "common.copy": "复制",
  "common.copied": "已复制",
  "common.required": "必填",
  "common.optional": "可选",
  "common.yes": "是",
  "common.no": "否",
  "common.close": "关闭",
  "common.back": "返回",
  "common.next": "下一步",
  "common.submit": "提交",
  "common.search": "搜索",
  "common.filter": "筛选",
  "common.all": "全部",
  "common.none": "无",
  "common.default": "默认",
  "common.error": "错误",
  "common.success": "成功",
  "common.warning": "警告",
  "common.info": "信息",
  "common.name": "名称",
  "common.type": "类型",
  "common.model": "模型",
  "common.date": "日期",
  "common.actions": "操作",
  "common.key": "密钥",
  "common.url": "URL",
  "common.created": "创建日期",
  "common.updated": "更新日期",
  "common.lastUsed": "最后使用",
  "common.settings": "设置",
  "common.profile": "个人资料",
  "common.logout": "退出登录",
  "common.login": "登录",
  "common.register": "注册",
  "common.password": "密码",
  "common.confirmPassword": "确认密码",
  "common.email": "电子邮箱",
  "common.username": "用户名",
  "common.dashboard": "仪表盘",
  "common.apiKeys": "API 密钥",
  "common.system": "系统",
  "common.user": "用户",
  "common.security": "安全",
  "common.language": "语言",

  // 应用相关
  "app.title": "API Key Manager",
  "app.description": "安全管理各种 AI 模型的 API 密钥",

  // 登录相关
  "login.title": "登录",
  "login.description": "请输入您的账号和密码登录系统",
  "login.button": "登录",
  "login.error": "用户名或密码错误",
  "login.noAccount": "还没有账号？",

  "auth.enterOtp": "请输入两步验证码",
  "auth.backToLogin": "返回登录",
  "auth.totpTitle": "两步验证（TOTP）",
  "auth.totpDescription": "使用身份验证器 App（如 Google Authenticator）生成动态验证码，为你的账号增加额外的安全保护。",
  "auth.totpSetup": "绑定验证器",
  "auth.totpEnabled": "两步验证已启用",
  "auth.totpDisabled": "两步验证已关闭",
  "auth.totpEnabledStatus": "两步验证已启用，登录时需要输入验证码。",
  "auth.totpNotEnabled": "两步验证未启用。启用后，每次登录除了输入密码外，还需要输入验证码。",
  "auth.scanQrCode": "请使用身份验证器 App 扫描下方二维码",
  "auth.manualEntry": "或手动输入密钥：",
  "auth.verifyAndEnable": "输入验证码以确认启用",
  "auth.disableTotp": "关闭两步验证",
  "auth.enterDisableCode": "输入验证码以关闭两步验证",
  "auth.totpSetupFailed": "生成密钥失败，请重试",
  "auth.totpVerifyFailed": "验证码错误",

  // 仪表盘相关
  "dashboard.title": "仪表盘",
  "dashboard.activeKeys": "活跃密钥",
  "dashboard.encryptedKeys": "已加密密钥",
  "dashboard.comparedToLastMonth": "+1 相比上月",
  "dashboard.allKeysEncrypted": "所有密钥都已加密",
  "dashboard.apiAvailability": "API 可用率",
  "dashboard.apiAvailabilityNormal": "所有API服务运行正常",
  "dashboard.apiAvailabilityDelayed": "部分API服务可能存在延迟",
  "dashboard.apiAvailabilityIssues": "部分API服务不可用",
  "dashboard.apiAvailabilityHint": "首页可用率基于已加入首页检测的密钥的最近状态计算。",
  "dashboard.recharge": "充值",

  // API密钥相关
  "apiKeys.title": "API 密钥管理",
  "apiKeys.list": "API 密钥列表",
  "apiKeys.add": "添加密钥",
  "apiKeys.edit": "编辑密钥",
  "apiKeys.delete": "删除密钥",
  "apiKeys.deleteConfirm": "确定要删除此密钥吗？",
  "apiKeys.addNew": "添加新 API 密钥",
  "apiKeys.addDescription": "请输入 API 密钥的详细信息。所有密钥将被安全加密存储。",
  "apiKeys.editDescription": "修改 API 密钥的详细信息。",
  "apiKeys.keyType": "密钥类型",
  "apiKeys.apiKey": "API Key",
  "apiKeys.complexKey": "复合密钥 (Key + AppID)",
  "apiKeys.appId": "应用 ID",
  "apiKeys.secretKey": "Secret Key",
  "apiKeys.baseUrl": "API 请求 URL",
  "apiKeys.baseUrlPlaceholder": "默认: https://api.example.com/v1",
  "apiKeys.baseUrlDescription": "输入 API 的基础 URL，支持自定义部署的模型地址。留空则使用默认值。",
  "apiKeys.namePlaceholder": "例如：OpenAI GPT-4",
  "apiKeys.keyPlaceholder": "输入 API 密钥",
  "apiKeys.appIdPlaceholder": "输入应用 ID",
  "apiKeys.secretKeyPlaceholder": "输入 Secret Key",
  "apiKeys.requestHeader": "请求头格式：",
  "apiKeys.customUrlTip": "提示：您可以自定义 API 请求 URL 以支持本地部署的大模型或私有 API 端点。",
  "apiKeys.searchLabel": "搜索密钥",
  "apiKeys.searchPlaceholder": "按名称、提供商或 URL 搜索",
  "apiKeys.providerFilter": "提供商筛选",
  "apiKeys.clearFilters": "清空筛选",
  "apiKeys.noMatchingResults": "没有符合当前筛选条件的密钥。",
  "apiKeys.emptyState": "还没有添加任何 API 密钥。",
  "apiKeys.previousPage": "上一页",
  "apiKeys.nextPage": "下一页",
  "apiKeys.resultCount": "共 {count} 条结果",
  "apiKeys.pageIndicator": "第 {current} / {total} 页",
  "apiKeys.pageSize": "每页显示",
  "apiKeys.pageSizeAll": "全部",
  "apiKeys.provider": "提供商",
  "apiKeys.providerPlaceholder": "例如：本地部署模型",
  "apiKeys.customProviderDescription": "自定义提供商适用于本地部署或代理服务",
  "apiKeys.rechargeUrl": "充值 URL",
  "apiKeys.rechargeUrlPlaceholder": "https://example.com",
  "apiKeys.rechargeUrlDescription": "方便在仪表盘处进行余额的充值，请输入完整URL",
  "apiKeys.monitorOnDashboard": "加入首页检测",
  "apiKeys.monitorOnDashboardDescription": "开启后，该密钥将出现在首页的连接状态检测中",
  "apiKeys.priority": "优先级",
  "apiKeys.priorityDescription": "数值越大，在仪表盘中排列越靠前",
  "apiKeys.dashboardMonitoring": "首页检测",
  "apiKeys.monitoringEnabled": "已启用",
  "apiKeys.monitoringDisabled": "未启用",
  "apiKeys.tags": "标签",
  "apiKeys.addTag": "输入新标签，回车添加",
  "apiKeys.tagFilter": "标签筛选",

  // 设置相关
  "settings.title": "系统设置",
  "settings.systemSettings": "系统设置",
  "settings.systemDescription": "配置系统的全局设置",
  "settings.defaultKeyType": "默认密钥类型",
  "settings.defaultKeyTypeDescription": "添加新密钥时的默认类型",
  "settings.userSettings": "个人设置",
  "settings.userDescription": "更新您的个人信息和偏好设置",
  "settings.securitySettings": "安全设置",
  "settings.securityDescription": "管理账号安全和密码",
  "settings.currentPassword": "当前密码",
  "settings.newPassword": "新密码",
  "settings.confirmNewPassword": "确认新密码",
  "settings.changePassword": "更改密码",
  "settings.saveSystemSettings": "保存系统设置",
  "settings.saveUserSettings": "保存个人设置",
  "settings.settingsSaved": "设置已保存",
  "settings.passwordChanged": "密码已更新",
  "settings.languageSettings": "语言设置",
  "settings.languageDescription": "选择您偏好的界面语言",
  "settings.selectLanguage": "选择语言",
  "settings.languageChanged": "语言已更改",
  "settings.passwordLengthHint": "密码长度至少为6个字符",

  // Passkey 通行密钥
  "passkey.title": "通行密钥",
  "passkey.description": "使用指纹、面部识别或设备 PIN 快速安全地登录，无需输入密码。",
  "passkey.noPasskeys": "尚未注册通行密钥。",
  "passkey.add": "添加通行密钥",
  "passkey.delete": "删除",
  "passkey.registerSuccess": "通行密钥注册成功",
  "passkey.registerFailed": "通行密钥注册失败",
  "passkey.deleteSuccess": "通行密钥已删除",
  "passkey.deleteFailed": "删除通行密钥失败",
  "passkey.loginButton": "Passkey 登录",

  "common.or": "或",

  // 提示相关
  "toast.copied": "已复制",
  "toast.copyDescription": "内容已复制到剪贴板",
  "toast.addSuccess": "添加成功",
  "toast.editSuccess": "编辑成功",
  "toast.deleteSuccess": "删除成功",
  "toast.error": "操作失败",

  // 错误相关
  "error.required": "此字段为必填项",
  "error.invalidUrl": "请输入有效的URL",
  "error.loginFailed": "登录失败，请重试",
  "error.connectionFailed": "连接失败",
  "error.testFailed": "测试连接失败",
  "error.networkError": "网络错误",
  "error.serverConnectionFailed": "无法连接到服务器",
  "error.timeout": "连接超时",
  "error.unknownError": "未知错误",

  // 添加API状态相关翻译
  "api.status.title": "API 连接状态",
  "api.status.description": "测试API密钥的连接状态",
  "api.status.refreshing": "更新中...",
  "api.status.refresh": "刷新状态",
  "api.status.connectionTest": "链接访问检测",
  "api.status.testDescription": "测试链接是否可访问，并在支持时尝试获取模型列表",
  "api.status.rechargeManage": "充值/管理",
  "api.status.redirecting": "正在跳转",
  "api.status.testing": "测试中",
  "api.status.test": "测试",
  "api.status.recharge": "充值",
  "api.status.latency": "延迟",
  "api.status.lastTested": "最后测试",
  "api.status.noApiKeys": "没有找到API密钥，请先添加API密钥",
  "api.status.openLink": "打开链接",
  "api.status.loading": "正在加载API状态...",
  "api.status.autoUpdate": '连接状态每天自动更新一次，点击"测试"按钮可立即测试单个API的连接状态',
  "api.status.testButton": '点击"测试"按钮可立即测试单个API的连接状态',
  "api.status.rechargeButton": '点击"充值/管理"按钮前往对应服务商的管理页面',
  "api.status.modelListAvailable": "模型列表可获取",
  "api.status.urlReachable": "链接可访问",
  "api.status.modelAuthFailed": "链接可访问，模型列表鉴权失败",
  "api.status.normal": "连接正常",
  "api.status.authFailed": "认证失败",
  "api.status.rateLimited": "请求频率限制",
  "api.status.connectionError": "连接异常",
  "api.status.notTested": "未测试",
  "api.status.urlTestDescription": "系统会先测试链接是否可访问，并在支持时尝试通过 API URL 获取模型列表。",

  // 首页相关
  "home.hero.subtitle": "安全、高效地管理您的各种 AI 模型 API 密钥，轻松监控使用情况和余额",
  "home.hero.cta": "立即开始使用",
  "home.features.title": "主要功能",
  "home.features.subtitle": "我们提供全面的 API 密钥管理解决方案",
  "home.features.keyManagement.title": "API 密钥管理",
  "home.features.keyManagement.description": "安全存储和管理多个 AI 服务提供商的 API 密钥",
  "home.features.security.title": "安全加密",
  "home.features.security.description": "使用高级加密技术保护您的 API 密钥安全",
  "home.features.monitoring.title": "余额监控",
  "home.features.monitoring.description": "实时监控 API 密钥的使用情况和余额",
  "home.features.settings.title": "自定义设置",
  "home.features.settings.description": "根据您的需求自定义系统设置和偏好",
  "home.contact.title": "联系我们",
  "home.contact.subtitle": "如有任何问题或建议，请随时联系我们",
  "home.footer.copyright": "保留所有权利",
}

// 英文翻译
export const enUS: Translations = {
  // 通用翻译
  "common.loading": "Loading...",
  "common.refresh": "Refresh",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.add": "Add",
  "common.copy": "Copy",
  "common.copied": "Copied",
  "common.required": "Required",
  "common.optional": "Optional",
  "common.yes": "Yes",
  "common.no": "No",
  "common.close": "Close",
  "common.back": "Back",
  "common.next": "Next",
  "common.submit": "Submit",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.all": "All",
  "common.none": "None",
  "common.default": "Default",
  "common.error": "Error",
  "common.success": "Success",
  "common.warning": "Warning",
  "common.info": "Info",
  "common.name": "Name",
  "common.type": "Type",
  "common.model": "Model",
  "common.date": "Date",
  "common.actions": "Actions",
  "common.key": "Key",
  "common.url": "URL",
  "common.created": "Created",
  "common.updated": "Updated",
  "common.lastUsed": "Last Used",
  "common.settings": "Settings",
  "common.profile": "Profile",
  "common.logout": "Logout",
  "common.login": "Login",
  "common.register": "Register",
  "common.password": "Password",
  "common.confirmPassword": "Confirm Password",
  "common.email": "Email",
  "common.username": "Username",
  "common.dashboard": "Dashboard",
  "common.apiKeys": "API Keys",
  "common.system": "System",
  "common.user": "User",
  "common.security": "Security",
  "common.language": "Language",

  // 应用相关
  "app.title": "API Key Manager",
  "app.description": "Securely manage API keys for various AI models",

  // 登录相关
  "login.title": "Login",
  "login.description": "Enter your credentials to access the system",
  "login.button": "Login",
  "login.error": "Invalid username or password",
  "login.noAccount": "Don't have an account?",

  "auth.enterOtp": "Enter your two-factor authentication code",
  "auth.backToLogin": "Back to login",
  "auth.totpTitle": "Two-Factor Authentication (TOTP)",
  "auth.totpDescription": "Use an authenticator app (e.g., Google Authenticator) to generate verification codes for extra security.",
  "auth.totpSetup": "Set Up Authenticator",
  "auth.totpEnabled": "Two-factor authentication enabled",
  "auth.totpDisabled": "Two-factor authentication disabled",
  "auth.totpEnabledStatus": "Two-factor authentication is enabled. A verification code is required at login.",
  "auth.totpNotEnabled": "Two-factor authentication is not enabled. Once enabled, you'll need both your password and a verification code to log in.",
  "auth.scanQrCode": "Scan the QR code below with your authenticator app",
  "auth.manualEntry": "Or enter the key manually:",
  "auth.verifyAndEnable": "Enter the code to confirm and enable",
  "auth.disableTotp": "Disable Two-Factor Auth",
  "auth.enterDisableCode": "Enter code to disable two-factor authentication",
  "auth.totpSetupFailed": "Failed to generate secret, please try again",
  "auth.totpVerifyFailed": "Invalid verification code",

  // 仪表盘相关
  "dashboard.title": "Dashboard",
  "dashboard.activeKeys": "Active Keys",
  "dashboard.encryptedKeys": "Encrypted Keys",
  "dashboard.comparedToLastMonth": "+1 compared to last month",
  "dashboard.allKeysEncrypted": "All keys are encrypted",
  "dashboard.apiAvailability": "API Availability",
  "dashboard.apiAvailabilityNormal": "All API services are running normally",
  "dashboard.apiAvailabilityDelayed": "Some API services may experience delays",
  "dashboard.apiAvailabilityIssues": "Some API services are unavailable",
  "dashboard.apiAvailabilityHint": "Homepage availability is calculated from the latest status of keys added to dashboard monitoring.",
  "dashboard.recharge": "Recharge",

  // API密钥相关
  "apiKeys.title": "API Key Management",
  "apiKeys.list": "API Key List",
  "apiKeys.add": "Add Key",
  "apiKeys.edit": "Edit Key",
  "apiKeys.delete": "Delete Key",
  "apiKeys.deleteConfirm": "Are you sure you want to delete this key?",
  "apiKeys.addNew": "Add New API Key",
  "apiKeys.addDescription": "Enter the details of the API key. All keys will be securely encrypted.",
  "apiKeys.editDescription": "Modify the API key details.",
  "apiKeys.keyType": "Key Type",
  "apiKeys.apiKey": "API Key",
  "apiKeys.complexKey": "Complex Key (Key + AppID)",
  "apiKeys.appId": "App ID",
  "apiKeys.secretKey": "Secret Key",
  "apiKeys.baseUrl": "API Request URL",
  "apiKeys.baseUrlPlaceholder": "Default: https://api.example.com/v1",
  "apiKeys.baseUrlDescription":
    "Enter the base URL for the API, supporting custom deployed models. Leave blank to use the default value.",
  "apiKeys.namePlaceholder": "e.g., OpenAI GPT-4",
  "apiKeys.keyPlaceholder": "Enter API key",
  "apiKeys.appIdPlaceholder": "Enter App ID",
  "apiKeys.secretKeyPlaceholder": "Enter Secret Key",
  "apiKeys.requestHeader": "Request header format:",
  "apiKeys.customUrlTip":
    "Tip: You can customize the API request URL to support locally deployed models or private API endpoints.",
  "apiKeys.searchLabel": "Search Keys",
  "apiKeys.searchPlaceholder": "Search by name, provider, or URL",
  "apiKeys.providerFilter": "Provider Filter",
  "apiKeys.clearFilters": "Clear Filters",
  "apiKeys.noMatchingResults": "No keys match the current filters.",
  "apiKeys.emptyState": "No API keys have been added yet.",
  "apiKeys.previousPage": "Previous",
  "apiKeys.nextPage": "Next",
  "apiKeys.resultCount": "{count} results",
  "apiKeys.pageIndicator": "Page {current} / {total}",
  "apiKeys.pageSize": "Per Page",
  "apiKeys.pageSizeAll": "All",
  "apiKeys.provider": "Provider",
  "apiKeys.providerPlaceholder": "e.g., Local Deployment",
  "apiKeys.customProviderDescription": "Custom providers are suitable for local deployments or proxy services",
  "apiKeys.rechargeUrl": "Recharge URL",
  "apiKeys.rechargeUrlPlaceholder": "https://example.com",
  "apiKeys.rechargeUrlDescription": "Convenient for recharging balance from the dashboard, please enter complete URL",
  "apiKeys.monitorOnDashboard": "Monitor on Dashboard",
  "apiKeys.monitorOnDashboardDescription": "When enabled, this key will appear in the dashboard connection status monitoring",
  "apiKeys.priority": "Priority",
  "apiKeys.priorityDescription": "Higher values appear first on the dashboard",
  "apiKeys.dashboardMonitoring": "Dashboard Monitoring",
  "apiKeys.monitoringEnabled": "Enabled",
  "apiKeys.monitoringDisabled": "Disabled",
  "apiKeys.tags": "Tags",
  "apiKeys.addTag": "Type a new tag, press Enter to add",
  "apiKeys.tagFilter": "Tag Filter",

  // 设置相关
  "settings.title": "System Settings",
  "settings.systemSettings": "System Settings",
  "settings.systemDescription": "Configure global system settings",
  "settings.defaultKeyType": "Default Key Type",
  "settings.defaultKeyTypeDescription": "Default type when adding new keys",
  "settings.userSettings": "User Settings",
  "settings.userDescription": "Update your personal information and preferences",
  "settings.securitySettings": "Security Settings",
  "settings.securityDescription": "Manage account security and password",
  "settings.currentPassword": "Current Password",
  "settings.newPassword": "New Password",
  "settings.confirmNewPassword": "Confirm New Password",
  "settings.changePassword": "Change Password",
  "settings.saveSystemSettings": "Save System Settings",
  "settings.saveUserSettings": "Save User Settings",
  "settings.settingsSaved": "Settings saved",
  "settings.passwordChanged": "Password updated",
  "settings.languageSettings": "Language Settings",
  "settings.languageDescription": "Select your preferred interface language",
  "settings.selectLanguage": "Select Language",
  "settings.languageChanged": "Language changed",
  "settings.passwordLengthHint": "Password must be at least 6 characters",

  // Passkey
  "passkey.title": "Passkeys",
  "passkey.description": "Sign in quickly and securely using your fingerprint, face, or device PIN — no password needed.",
  "passkey.noPasskeys": "No passkeys registered yet.",
  "passkey.add": "Add Passkey",
  "passkey.delete": "Delete",
  "passkey.registerSuccess": "Passkey registered successfully",
  "passkey.registerFailed": "Passkey registration failed",
  "passkey.deleteSuccess": "Passkey deleted",
  "passkey.deleteFailed": "Failed to delete passkey",
  "passkey.loginButton": "Sign in with Passkey",

  "common.or": "or",

  // 提示相关
  "toast.copied": "Copied",
  "toast.copyDescription": "Content copied to clipboard",
  "toast.addSuccess": "Added successfully",
  "toast.editSuccess": "Edited successfully",
  "toast.deleteSuccess": "Deleted successfully",
  "toast.error": "Operation failed",

  // 错误相关
  "error.required": "This field is required",
  "error.invalidUrl": "Please enter a valid URL",
  "error.loginFailed": "Login failed, please try again",
  "error.connectionFailed": "Connection Failed",
  "error.testFailed": "Test Connection Failed",
  "error.networkError": "Network Error",
  "error.serverConnectionFailed": "Cannot Connect to Server",
  "error.timeout": "Connection Timeout",
  "error.unknownError": "Unknown Error",

  // 添加API状态相关翻译
  "api.status.title": "API Connection Status",
  "api.status.description": "Test API key connection status",
  "api.status.refreshing": "Updating...",
  "api.status.refresh": "Refresh Status",
  "api.status.connectionTest": "Link Access Test",
  "api.status.testDescription": "Check whether the URL is reachable and try to fetch the model list when supported.",
  "api.status.rechargeManage": "Recharge/Manage",
  "api.status.redirecting": "Redirecting",
  "api.status.testing": "Testing",
  "api.status.test": "Test",
  "api.status.recharge": "Recharge",
  "api.status.latency": "Latency",
  "api.status.lastTested": "Last Tested",
  "api.status.noApiKeys": "No API keys found, please add API keys first",
  "api.status.openLink": "Open Link",
  "api.status.loading": "Loading API status...",
  "api.status.autoUpdate":
    "Connection status is automatically updated once a day, click the 'Test' button to immediately test a single API connection",
  "api.status.testButton": "Click the 'Test' button to immediately test a single API connection",
  "api.status.rechargeButton":
    "Click the 'Recharge/Manage' button to go to the corresponding service provider's management page",
  "api.status.modelListAvailable": "Model List Available",
  "api.status.urlReachable": "URL Reachable",
  "api.status.modelAuthFailed": "URL Reachable, Model List Auth Failed",
  "api.status.normal": "Connection Normal",
  "api.status.authFailed": "Authentication Failed",
  "api.status.rateLimited": "Rate Limited",
  "api.status.connectionError": "Connection Error",
  "api.status.notTested": "Not Tested",
  "api.status.urlTestDescription":
    "The system first checks whether the URL is reachable and then tries to fetch the model list through the API URL when supported.",

  // 首页相关
  "home.hero.subtitle": "Securely and efficiently manage your AI model API keys, easily monitor usage and balance",
  "home.hero.cta": "Get Started",
  "home.features.title": "Key Features",
  "home.features.subtitle": "We provide comprehensive API key management solutions",
  "home.features.keyManagement.title": "API Key Management",
  "home.features.keyManagement.description": "Securely store and manage API keys from multiple AI service providers",
  "home.features.security.title": "Security Encryption",
  "home.features.security.description": "Protect your API keys with advanced encryption technology",
  "home.features.monitoring.title": "Balance Monitoring",
  "home.features.monitoring.description": "Monitor API key usage and balance in real-time",
  "home.features.settings.title": "Custom Settings",
  "home.features.settings.description": "Customize system settings and preferences according to your needs",
  "home.contact.title": "Contact Us",
  "home.contact.subtitle": "If you have any questions or suggestions, please feel free to contact us",
  "home.footer.copyright": "All rights reserved",
}

// 获取翻译函数
export function getTranslations(language: Language): Translations {
  switch (language) {
    case "zh-CN":
      return zhCN
    case "en-US":
      return enUS
    default:
      return zhCN
  }
}
