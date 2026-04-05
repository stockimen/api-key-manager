"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Plus, Pencil, Trash2, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/i18n/language-context"
import { api } from "@/lib/api-client"

interface ApiKey {
  id: number
  userId: number
  name: string
  key: string
  type: "apikey" | "complex"
  provider: string
  rechargeUrl?: string
  appId?: string
  secretKey?: string
  baseUrl: string
  createdAt: string
  lastUsed: string
}

const DEFAULT_API_URLS: Record<string, string> = {
  OpenAI: "https://api.openai.com/v1",
  Anthropic: "https://api.anthropic.com/v1",
  Baidu: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop",
  Google: "https://generativelanguage.googleapis.com/v1",
  Meta: "https://llama-api.meta.com/v1",
  Mistral: "https://api.mistral.ai/v1",
  Cohere: "https://api.cohere.ai/v1",
  Custom: "",
}

type CopyState = { [key: string]: boolean }

export default function ApiKeyList() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({})
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [formErrors, setFormErrors] = useState<{ name?: string; key?: string }>({})
  const [copiedStates, setCopiedStates] = useState<CopyState>({})
  const [newKey, setNewKey] = useState({
    name: "",
    key: "",
    type: "apikey" as "apikey" | "complex",
    provider: "",
    rechargeUrl: "",
    appId: "",
    secretKey: "",
    baseUrl: "",
  })

  // 加载 API 密钥
  const loadKeys = useCallback(async () => {
    try {
      const data = await api.get<{ keys: ApiKey[] }>("/keys")
      setApiKeys(data.keys)
    } catch {
      // api-client 会自动处理 401 跳转
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadKeys()
  }, [loadKeys])

  // 加载默认密钥类型
  useEffect(() => {
    const loadDefaultType = async () => {
      try {
        const data = await api.get<{ settings: { defaultKeyType: "apikey" | "complex" } }>("/settings")
        setNewKey((prev) => ({ ...prev, type: data.settings.defaultKeyType }))
      } catch {
        // use default
      }
    }
    loadDefaultType()
  }, [])

  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const validateForm = (name: string, key: string) => {
    const errors: { name?: string; key?: string } = {}
    if (!name.trim()) errors.name = t("error.required")
    if (!key.trim()) errors.key = t("error.required")
    setFormErrors(errors)
    return !errors.name && !errors.key
  }

  const handleAddKey = async () => {
    if (!validateForm(newKey.name, newKey.key)) return

    try {
      const baseUrl = newKey.baseUrl.trim() || DEFAULT_API_URLS[newKey.provider] || ""
      const data = await api.post<{ key: ApiKey }>("/keys", {
        ...newKey,
        baseUrl,
      })

      setApiKeys((prev) => [...prev, data.key])
      setIsAddDialogOpen(false)

      // 重置表单
      try {
        const settings = await api.get<{ settings: { defaultKeyType: "apikey" | "complex" } }>("/settings")
        setNewKey({
          name: "", key: "", type: settings.settings.defaultKeyType,
          provider: "", rechargeUrl: "", appId: "", secretKey: "", baseUrl: "",
        })
      } catch {
        setNewKey({
          name: "", key: "", type: "apikey",
          provider: "", rechargeUrl: "", appId: "", secretKey: "", baseUrl: "",
        })
      }
      setFormErrors({})
      toast({ title: t("toast.addSuccess"), description: t("toast.addSuccess") })
    } catch {
      toast({ title: t("toast.error"), variant: "destructive" })
    }
  }

  const handleEditKey = (key: ApiKey) => {
    setEditingKey({ ...key })
    setIsEditDialogOpen(true)
    setFormErrors({})
  }

  const saveEditedKey = async () => {
    if (!editingKey || !validateForm(editingKey.name, editingKey.key)) return

    try {
      const data = await api.put<{ key: ApiKey }>(`/keys/${editingKey.id}`, {
        name: editingKey.name,
        key: editingKey.key,
        provider: editingKey.provider,
        appId: editingKey.appId,
        secretKey: editingKey.secretKey,
        baseUrl: editingKey.baseUrl,
        rechargeUrl: editingKey.rechargeUrl,
      })

      setApiKeys((prev) => prev.map((k) => (k.id === editingKey.id ? data.key : k)))
      setIsEditDialogOpen(false)
      setEditingKey(null)
      setFormErrors({})
      toast({ title: t("toast.editSuccess"), description: t("toast.editSuccess") })
    } catch {
      toast({ title: t("toast.error"), variant: "destructive" })
    }
  }

  const handleDeleteKey = async (id: number) => {
    try {
      await api.delete(`/keys/${id}`)
      setApiKeys((prev) => prev.filter((key) => key.id !== id))
      toast({ title: t("toast.deleteSuccess"), description: t("toast.deleteSuccess") })
    } catch {
      toast({ title: t("toast.error"), variant: "destructive" })
    }
  }

  const maskKey = (key: string) => {
    if (!key) return ""
    if (key.length <= 8) return key.substring(0, 2) + "•".repeat(Math.max(1, key.length - 4)) + key.substring(key.length - 2)
    return key.substring(0, 4) + "•".repeat(Math.max(1, Math.min(20, key.length - 8))) + key.substring(key.length - 4)
  }

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text)
    setCopiedStates((prev) => ({ ...prev, [identifier]: true }))
    toast({ title: t("toast.copied"), description: t("toast.copyDescription") })
    setTimeout(() => setCopiedStates((prev) => ({ ...prev, [identifier]: false })), 1500)
  }

  if (loading) {
    return <Card><CardContent className="p-6"><p>{t("common.loading")}</p></CardContent></Card>
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{t("apiKeys.list")}</h2>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                {t("apiKeys.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("apiKeys.addNew")}</DialogTitle>
                <DialogDescription>{t("apiKeys.addDescription")}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">{t("common.type")}</Label>
                  <Select
                    value={newKey.type}
                    onValueChange={(value: "apikey" | "complex") => setNewKey({ ...newKey, type: value })}
                  >
                    <SelectTrigger><SelectValue placeholder={t("common.type")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apikey">{t("apiKeys.apiKey")}</SelectItem>
                      <SelectItem value="complex">{t("apiKeys.complexKey")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="flex items-center">
                        {t("common.name")} <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="name" placeholder={t("apiKeys.namePlaceholder")}
                        value={newKey.name} onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                        className={formErrors.name ? "border-red-500" : ""}
                      />
                      {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="provider">{t("apiKeys.provider")}</Label>
                      <Input
                        id="provider" placeholder={t("apiKeys.providerPlaceholder")}
                        value={newKey.provider} onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">{t("apiKeys.customProviderDescription")}</p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="key" className="flex items-center">
                        {t("common.key")} <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        id="key" placeholder={t("apiKeys.keyPlaceholder")}
                        value={newKey.key} onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                        className={formErrors.key ? "border-red-500" : ""}
                      />
                      {formErrors.key && <p className="text-red-500 text-xs mt-1">{formErrors.key}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="rechargeUrl">{t("apiKeys.rechargeUrl")}</Label>
                      <Input
                        id="rechargeUrl" placeholder="https://example.com"
                        value={newKey.rechargeUrl} onChange={(e) => setNewKey({ ...newKey, rechargeUrl: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">{t("apiKeys.rechargeUrlDescription")}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {newKey.type === "complex" && (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="appId">{t("apiKeys.appId")}</Label>
                          <Input id="appId" placeholder={t("apiKeys.appIdPlaceholder")} value={newKey.appId} onChange={(e) => setNewKey({ ...newKey, appId: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="secretKey">{t("apiKeys.secretKey")}</Label>
                          <Input id="secretKey" placeholder={t("apiKeys.secretKeyPlaceholder")} value={newKey.secretKey} onChange={(e) => setNewKey({ ...newKey, secretKey: e.target.value })} />
                        </div>
                      </>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="baseUrl">{t("apiKeys.baseUrl")}</Label>
                      <Input id="baseUrl" placeholder="https://api.example.com/v1/models" value={newKey.baseUrl} onChange={(e) => setNewKey({ ...newKey, baseUrl: e.target.value })} />
                      <p className="text-xs text-muted-foreground">{t("apiKeys.baseUrlDescription")}</p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setFormErrors({}) }}>{t("common.cancel")}</Button>
                <Button onClick={handleAddKey}>{t("common.add")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* 编辑密钥对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setFormErrors({}) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("apiKeys.edit")}</DialogTitle>
              <DialogDescription>{t("apiKeys.editDescription")}</DialogDescription>
            </DialogHeader>
            {editingKey && (
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>{t("common.type")}</Label>
                  <div className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
                    {editingKey.type === "apikey" ? t("apiKeys.apiKey") : t("apiKeys.complexKey")}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center">{t("common.name")} <span className="text-red-500 ml-1">*</span></Label>
                      <Input value={editingKey.name} onChange={(e) => setEditingKey({ ...editingKey, name: e.target.value })} className={formErrors.name ? "border-red-500" : ""} />
                      {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("apiKeys.provider")}</Label>
                      <Input value={editingKey.provider} onChange={(e) => setEditingKey({ ...editingKey, provider: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label className="flex items-center">{t("common.key")} <span className="text-red-500 ml-1">*</span></Label>
                      <Input value={editingKey.key} onChange={(e) => setEditingKey({ ...editingKey, key: e.target.value })} className={formErrors.key ? "border-red-500" : ""} />
                      {formErrors.key && <p className="text-red-500 text-xs mt-1">{formErrors.key}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>{t("apiKeys.rechargeUrl")}</Label>
                      <Input placeholder="https://example.com" value={editingKey.rechargeUrl || ""} onChange={(e) => setEditingKey({ ...editingKey, rechargeUrl: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {editingKey.type === "complex" && (
                      <>
                        <div className="grid gap-2">
                          <Label>{t("apiKeys.appId")}</Label>
                          <Input value={editingKey.appId || ""} onChange={(e) => setEditingKey({ ...editingKey, appId: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                          <Label>{t("apiKeys.secretKey")}</Label>
                          <Input value={editingKey.secretKey || ""} onChange={(e) => setEditingKey({ ...editingKey, secretKey: e.target.value })} />
                        </div>
                      </>
                    )}
                    <div className="grid gap-2">
                      <Label>{t("apiKeys.baseUrl")}</Label>
                      <Input placeholder="https://api.example.com/v1/models" value={editingKey.baseUrl || ""} onChange={(e) => setEditingKey({ ...editingKey, baseUrl: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setFormErrors({}) }}>{t("common.cancel")}</Button>
              <Button onClick={saveEditedKey}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("apiKeys.provider")}</TableHead>
                <TableHead>{t("common.key")}</TableHead>
                <TableHead>{t("apiKeys.baseUrl")}</TableHead>
                <TableHead>{t("common.created")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">
                    {apiKey.name}
                    {apiKey.type === "complex" && (
                      <Badge variant="outline" className="ml-2">{t("apiKeys.complexKey")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{apiKey.provider}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <code className="bg-muted px-1 py-0.5 rounded text-sm">
                        {visibleKeys[apiKey.id] ? apiKey.key : maskKey(apiKey.key)}
                      </code>
                      <Button variant="ghost" size="icon" onClick={() => toggleKeyVisibility(apiKey.id)}>
                        {visibleKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => copyToClipboard(apiKey.key, `key-${apiKey.id}`)}
                        className={copiedStates[`key-${apiKey.id}`] ? "text-green-500" : ""}
                      >
                        {copiedStates[`key-${apiKey.id}`] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    {apiKey.type === "complex" && apiKey.appId && (
                      <div className="mt-1">
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-muted-foreground">{t("apiKeys.appId")}:</div>
                          <code className="bg-muted px-1 py-0.5 rounded text-sm">{visibleKeys[apiKey.id] ? apiKey.appId : maskKey(apiKey.appId)}</code>
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(apiKey.appId!, `appId-${apiKey.id}`)} className={`h-6 w-6 ${copiedStates[`appId-${apiKey.id}`] ? "text-green-500" : ""}`}>
                            {copiedStates[`appId-${apiKey.id}`] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        {apiKey.secretKey && (
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="text-xs text-muted-foreground">{t("apiKeys.secretKey")}:</div>
                            <code className="bg-muted px-1 py-0.5 rounded text-sm">{visibleKeys[apiKey.id] ? apiKey.secretKey : maskKey(apiKey.secretKey)}</code>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(apiKey.secretKey!, `secretKey-${apiKey.id}`)} className={`h-6 w-6 ${copiedStates[`secretKey-${apiKey.id}`] ? "text-green-500" : ""}`}>
                              {copiedStates[`secretKey-${apiKey.id}`] ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <code className="bg-muted px-1 py-0.5 rounded text-sm truncate max-w-[150px]">{apiKey.baseUrl}</code>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(apiKey.baseUrl, `url-${apiKey.id}`)} className={copiedStates[`url-${apiKey.id}`] ? "text-green-500" : ""}>
                        {copiedStates[`url-${apiKey.id}`] ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{apiKey.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditKey(apiKey)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteKey(apiKey.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>{t("apiKeys.customUrlTip")}</p>
          <p className="mt-1">
            {t("apiKeys.requestHeader")}{" "}
            <code className="bg-muted px-2 py-1 rounded">Authorization: Bearer YOUR_API_KEY</code>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
