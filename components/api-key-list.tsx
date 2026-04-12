"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { Plus, Pencil, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/i18n/language-context"
import { api } from "@/lib/api-client"
import type { ApiKey } from "@/lib/kv"

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

const PAGE_SIZE_STORAGE_KEY = "api-key-list-page-size"
const PAGE_SIZE_OPTIONS = ["20", "50", "100", "all"] as const
type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number]
const DEFAULT_PAGE_SIZE: PageSizeOption = "20"

function parsePageSizeOption(value: string | null): PageSizeOption {
  if (value === "20" || value === "50" || value === "100" || value === "all") {
    return value
  }

  return DEFAULT_PAGE_SIZE
}

type CopyState = { [key: string]: boolean }

export default function ApiKeyList() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null)
  const [formErrors, setFormErrors] = useState<{ name?: string; key?: string }>({})
  const [copiedStates, setCopiedStates] = useState<CopyState>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [providerFilter, setProviderFilter] = useState("all")
  const [tagFilter, setTagFilter] = useState("all")
  const [pageSize, setPageSize] = useState<PageSizeOption>(DEFAULT_PAGE_SIZE)
  const [pageSizeLoaded, setPageSizeLoaded] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [newKey, setNewKey] = useState({
    name: "",
    key: "",
    type: "apikey" as "apikey" | "complex",
    provider: "",
    rechargeUrl: "",
    appId: "",
    secretKey: "",
    baseUrl: "",
    monitorOnDashboard: false,
    priority: 0,
    tags: [] as string[],
  })

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    setPageSize(parsePageSizeOption(localStorage.getItem(PAGE_SIZE_STORAGE_KEY)))
    setPageSizeLoaded(true)
  }, [])

  useEffect(() => {
    if (!pageSizeLoaded || typeof window === "undefined") {
      return
    }

    localStorage.setItem(PAGE_SIZE_STORAGE_KEY, pageSize)
  }, [pageSize, pageSizeLoaded])

  const providerOptions = useMemo(() => {
    return Array.from(new Set(apiKeys.map((key) => key.provider.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [apiKeys])

  const tagOptions = useMemo(() => {
    return Array.from(new Set(apiKeys.flatMap((key) => key.tags || []))).sort((a, b) => a.localeCompare(b))
  }, [apiKeys])

  const filteredKeys = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return apiKeys.filter((apiKey) => {
      const matchesProvider = providerFilter === "all" || apiKey.provider.trim() === providerFilter
      if (!matchesProvider) return false

      const matchesTag = tagFilter === "all" || (apiKey.tags || []).includes(tagFilter)
      if (!matchesTag) return false

      if (!normalizedQuery) return true

      return [apiKey.name, apiKey.provider, apiKey.baseUrl].some((value) => value.toLowerCase().includes(normalizedQuery))
    })
  }, [apiKeys, providerFilter, tagFilter, searchQuery])

  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredKeys.length / Number(pageSize)))

  useEffect(() => {
    setCurrentPage(1)
  }, [providerFilter, tagFilter, searchQuery, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedKeys = useMemo(() => {
    if (pageSize === "all") {
      return filteredKeys
    }

    const pageSizeValue = Number(pageSize)
    const startIndex = (currentPage - 1) * pageSizeValue
    return filteredKeys.slice(startIndex, startIndex + pageSizeValue)
  }, [currentPage, filteredKeys, pageSize])

  const showPagination = filteredKeys.length > 0 && totalPages > 1

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
        priority: newKey.priority,
      })

      setApiKeys((prev) => [...prev, data.key])
      setIsAddDialogOpen(false)
      loadKeys()

      try {
        const settings = await api.get<{ settings: { defaultKeyType: "apikey" | "complex" } }>("/settings")
        setNewKey({
          name: "", key: "", type: settings.settings.defaultKeyType,
          provider: "", rechargeUrl: "", appId: "", secretKey: "", baseUrl: "",
          monitorOnDashboard: false, priority: 0, tags: [],
        })
      } catch {
        setNewKey({
          name: "", key: "", type: "apikey",
          provider: "", rechargeUrl: "", appId: "", secretKey: "", baseUrl: "",
          monitorOnDashboard: false, priority: 0, tags: [],
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
        monitorOnDashboard: editingKey.monitorOnDashboard,
        priority: editingKey.priority,
        tags: editingKey.tags || [],
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

  const toggleMonitoring = async (apiKey: ApiKey) => {
    const newValue = !apiKey.monitorOnDashboard
    try {
      const data = await api.put<{ key: ApiKey }>(`/keys/${apiKey.id}`, {
        name: apiKey.name,
        key: apiKey.key,
        provider: apiKey.provider,
        appId: apiKey.appId,
        secretKey: apiKey.secretKey,
        baseUrl: apiKey.baseUrl,
        rechargeUrl: apiKey.rechargeUrl,
        monitorOnDashboard: newValue,
        priority: apiKey.priority,
        tags: apiKey.tags || [],
      })
      setApiKeys((prev) => prev.map((k) => (k.id === apiKey.id ? data.key : k)))
    } catch {
      toast({ title: t("toast.error"), variant: "destructive" })
    }
  }

  const maskKey = (key: string) => {
    if (!key) return ""
    if (key.length <= 8) return key.substring(0, 2) + "•••" + key.substring(key.length - 2)
    return key.substring(0, 4) + "•••" + key.substring(key.length - 4)
  }

  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text)
    setCopiedStates((prev) => ({ ...prev, [identifier]: true }))
    toast({ title: t("toast.copied"), description: t("toast.copyDescription") })
    setTimeout(() => setCopiedStates((prev) => ({ ...prev, [identifier]: false })), 1500)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setProviderFilter("all")
    setTagFilter("all")
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
                <div className="grid gap-4 py-4 sm:grid-cols-2">
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
                      <Label>{t("apiKeys.tags")}</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {tagOptions.map((tag) => (
                          <Badge
                            key={tag}
                            variant={(newKey.tags || []).includes(tag) ? "default" : "outline"}
                            className="cursor-pointer select-none"
                            onClick={() => {
                              const current = newKey.tags || []
                              setNewKey({
                                ...newKey,
                                tags: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
                              })
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder={t("apiKeys.addTag")}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              const val = (e.target as HTMLInputElement).value.trim()
                              if (val && !(newKey.tags || []).includes(val)) {
                                setNewKey({ ...newKey, tags: [...(newKey.tags || []), val] })
                                ;(e.target as HTMLInputElement).value = ""
                              }
                            }
                          }}
                        />
                      </div>
                      {(newKey.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {newKey.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1">
                              {tag}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => setNewKey({ ...newKey, tags: newKey.tags.filter((t) => t !== tag) })} />
                            </Badge>
                          ))}
                        </div>
                      )}
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
                    <div className="grid gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="monitor-add"
                          checked={newKey.monitorOnDashboard}
                          onCheckedChange={(checked) => setNewKey({ ...newKey, monitorOnDashboard: checked })}
                        />
                        <Label htmlFor="monitor-add" className="cursor-pointer">{t("apiKeys.monitorOnDashboard")}</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("apiKeys.monitorOnDashboardDescription")}</p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="priority-add">{t("apiKeys.priority")}</Label>
                      <Input id="priority-add" type="number" min="0" value={newKey.priority} onChange={(e) => setNewKey({ ...newKey, priority: parseInt(e.target.value) || 0 })} />
                      <p className="text-xs text-muted-foreground">{t("apiKeys.priorityDescription")}</p>
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
                      <Label>{t("apiKeys.tags")}</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {tagOptions.map((tag) => (
                          <Badge
                            key={tag}
                            variant={(editingKey.tags || []).includes(tag) ? "default" : "outline"}
                            className="cursor-pointer select-none"
                            onClick={() => {
                              const current = editingKey.tags || []
                              setEditingKey({
                                ...editingKey,
                                tags: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
                              })
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder={t("apiKeys.addTag")}
                          className="h-8 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              const val = (e.target as HTMLInputElement).value.trim()
                              if (val && !(editingKey.tags || []).includes(val)) {
                                setEditingKey({ ...editingKey, tags: [...(editingKey.tags || []), val] })
                                ;(e.target as HTMLInputElement).value = ""
                              }
                            }
                          }}
                        />
                      </div>
                      {(editingKey.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {editingKey.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1">
                              {tag}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => setEditingKey({ ...editingKey, tags: editingKey.tags.filter((t) => t !== tag) })} />
                            </Badge>
                          ))}
                        </div>
                      )}
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
                    <div className="grid gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="monitor-edit"
                          checked={editingKey.monitorOnDashboard}
                          onCheckedChange={(checked) => setEditingKey({ ...editingKey, monitorOnDashboard: checked })}
                        />
                        <Label htmlFor="monitor-edit" className="cursor-pointer">{t("apiKeys.monitorOnDashboard")}</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">{t("apiKeys.monitorOnDashboardDescription")}</p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="priority-edit">{t("apiKeys.priority")}</Label>
                      <Input id="priority-edit" type="number" min="0" value={editingKey.priority ?? 0} onChange={(e) => setEditingKey({ ...editingKey, priority: parseInt(e.target.value) || 0 })} />
                      <p className="text-xs text-muted-foreground">{t("apiKeys.priorityDescription")}</p>
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

        <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px_160px_auto] md:items-end">
          <div className="grid gap-2">
            <Label htmlFor="key-search">{t("apiKeys.searchLabel")}</Label>
            <Input
              id="key-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("apiKeys.searchPlaceholder")}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-filter">{t("apiKeys.providerFilter")}</Label>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger id="provider-filter">
                <SelectValue placeholder={t("common.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {providerOptions.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tag-filter">{t("apiKeys.tagFilter")}</Label>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger id="tag-filter">
                <SelectValue placeholder={t("common.all")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {tagOptions.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="page-size">{t("apiKeys.pageSize")}</Label>
            <Select value={pageSize} onValueChange={(value) => setPageSize(parsePageSizeOption(value))}>
              <SelectTrigger id="page-size">
                <SelectValue placeholder={t("apiKeys.pageSize")} />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all" ? t("apiKeys.pageSizeAll") : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <Button variant="outline" onClick={clearFilters} disabled={!searchQuery && providerFilter === "all" && tagFilter === "all"}>
              {t("apiKeys.clearFilters")}
            </Button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("apiKeys.resultCount", { count: filteredKeys.length })}</span>
          {showPagination && <span>{t("apiKeys.pageIndicator", { current: currentPage, total: totalPages })}</span>}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("apiKeys.provider")}</TableHead>
                <TableHead>{t("apiKeys.tags")}</TableHead>
                <TableHead>{t("common.key")}</TableHead>
                <TableHead>{t("apiKeys.baseUrl")}</TableHead>
                <TableHead>{t("common.created")}</TableHead>
                <TableHead>{t("apiKeys.dashboardMonitoring")}</TableHead>
                <TableHead>{t("apiKeys.priority")}</TableHead>
                <TableHead className="text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">
                    <span
                      className={apiKey.rechargeUrl ? "cursor-pointer hover:underline" : ""}
                      onClick={() => apiKey.rechargeUrl && window.open(apiKey.rechargeUrl, "_blank")}
                    >
                      {apiKey.name}
                    </span>
                    {apiKey.type === "complex" && (
                      <Badge variant="outline" className="ml-2">{t("apiKeys.complexKey")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{apiKey.provider}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(apiKey.tags || []).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <code
                        className="bg-muted px-1 py-0.5 rounded text-sm cursor-pointer select-none hover:bg-muted/80 transition-colors"
                        onClick={() => copyToClipboard(apiKey.key, `key-${apiKey.id}`)}
                        title={t("common.copy")}
                      >
                        {copiedStates[`key-${apiKey.id}`] ? "✓" : maskKey(apiKey.key)}
                      </code>
                      {apiKey.type === "complex" && apiKey.appId && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">{t("apiKeys.appId")}:</span>
                          <code
                            className="bg-muted px-1 py-0.5 rounded text-xs cursor-pointer select-none hover:bg-muted/80 transition-colors"
                            onClick={() => copyToClipboard(apiKey.appId!, `appId-${apiKey.id}`)}
                            title={t("common.copy")}
                          >
                            {copiedStates[`appId-${apiKey.id}`] ? "✓" : maskKey(apiKey.appId)}
                          </code>
                        </div>
                      )}
                      {apiKey.type === "complex" && apiKey.secretKey && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">{t("apiKeys.secretKey")}:</span>
                          <code
                            className="bg-muted px-1 py-0.5 rounded text-xs cursor-pointer select-none hover:bg-muted/80 transition-colors"
                            onClick={() => copyToClipboard(apiKey.secretKey!, `secretKey-${apiKey.id}`)}
                            title={t("common.copy")}
                          >
                            {copiedStates[`secretKey-${apiKey.id}`] ? "✓" : maskKey(apiKey.secretKey)}
                          </code>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code
                      className="bg-muted px-1 py-0.5 rounded text-sm cursor-pointer select-none truncate max-w-[150px] inline-block hover:bg-muted/80 transition-colors"
                      onClick={() => copyToClipboard(apiKey.baseUrl, `url-${apiKey.id}`)}
                      title={t("common.copy")}
                    >
                      {apiKey.baseUrl}
                    </code>
                  </TableCell>
                  <TableCell>{apiKey.createdAt}</TableCell>
                  <TableCell>
                    <Button
                      variant={apiKey.monitorOnDashboard ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => toggleMonitoring(apiKey)}
                    >
                      {apiKey.monitorOnDashboard ? t("apiKeys.monitoringEnabled") : t("apiKeys.monitoringDisabled")}
                    </Button>
                  </TableCell>
                  <TableCell>{apiKey.priority ?? 0}</TableCell>
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

        {!apiKeys.length && (
          <div className="py-6 text-center text-sm text-muted-foreground">{t("apiKeys.emptyState")}</div>
        )}

        {apiKeys.length > 0 && filteredKeys.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>{t("apiKeys.noMatchingResults")}</p>
            <Button variant="link" className="mt-1 h-auto p-0" onClick={clearFilters}>
              {t("apiKeys.clearFilters")}
            </Button>
          </div>
        )}

        {showPagination && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}>
              {t("apiKeys.previousPage")}
            </Button>
            <span className="text-sm text-muted-foreground">{t("apiKeys.pageIndicator", { current: currentPage, total: totalPages })}</span>
            <Button variant="outline" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
              {t("apiKeys.nextPage")}
            </Button>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          <p>{t("apiKeys.customUrlTip")}</p>
          <p className="mt-1">
            {t("apiKeys.requestHeader")} {" "}
            <code className="bg-muted px-2 py-1 rounded">Authorization: Bearer YOUR_API_KEY</code>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
