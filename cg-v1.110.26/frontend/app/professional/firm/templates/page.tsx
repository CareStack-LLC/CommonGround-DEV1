"use client";

import { useState, useEffect } from "react";
import { useProfessionalAuth } from "../../layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Plus,
  MoreVertical,
  ArrowLeft,
  Search,
  Copy,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
  FileQuestion,
  MessageSquare,
  Scale,
  Calendar,
  DollarSign,
  History,
} from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TEMPLATE_TYPES = [
  { value: "intake", label: "Intake Form", icon: MessageSquare, description: "Questions for ARIA intake sessions" },
  { value: "agreement", label: "Agreement Template", icon: Scale, description: "Custody agreement sections" },
  { value: "schedule", label: "Schedule Template", icon: Calendar, description: "Parenting schedule presets" },
  { value: "financial", label: "Financial Template", icon: DollarSign, description: "Expense and support templates" },
  { value: "custom", label: "Custom", icon: FileQuestion, description: "Custom document templates" },
];

const TYPE_COLORS: Record<string, string> = {
  intake: "bg-purple-100 text-purple-800",
  agreement: "bg-blue-100 text-blue-800",
  schedule: "bg-green-100 text-green-800",
  financial: "bg-amber-100 text-amber-800",
  custom: "bg-gray-100 text-gray-800",
};

interface Template {
  id: string;
  firm_id: string;
  created_by: string;
  name: string;
  template_type: string;
  description: string | null;
  content: Record<string, any>;
  version: number;
  is_current: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

interface TemplateVersion {
  version: number;
  created_at: string;
  is_current: boolean;
}

export default function FirmTemplatesPage() {
  const { token, activeFirm, profile } = useProfessionalAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showVersionsDialog, setShowVersionsDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    template_type: "intake",
    description: "",
    content: "{}",
    is_active: true,
  });

  useEffect(() => {
    if (token && activeFirm) {
      fetchTemplates();
    }
  }, [token, activeFirm]);

  const fetchTemplates = async () => {
    if (!activeFirm) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/templates`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!activeFirm || !formData.name) return;
    setIsSubmitting(true);
    try {
      let parsedContent = {};
      try {
        parsedContent = JSON.parse(formData.content);
      } catch {
        toast({
          title: "Invalid JSON",
          description: "Template content must be valid JSON.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            template_type: formData.template_type,
            description: formData.description || null,
            content: parsedContent,
            is_active: formData.is_active,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Template created",
          description: "Your new template has been saved.",
        });
        setShowCreateDialog(false);
        resetForm();
        fetchTemplates();
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create template");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create template.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!activeFirm || !selectedTemplate) return;
    setIsSubmitting(true);
    try {
      let parsedContent = {};
      try {
        parsedContent = JSON.parse(formData.content);
      } catch {
        toast({
          title: "Invalid JSON",
          description: "Template content must be valid JSON.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/templates/${selectedTemplate.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description || null,
            content: parsedContent,
            is_active: formData.is_active,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Template updated",
          description: "Your changes have been saved. A new version was created.",
        });
        setShowEditDialog(false);
        setSelectedTemplate(null);
        resetForm();
        fetchTemplates();
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update template");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update template.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!activeFirm) return;
    if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/templates/${templateId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        toast({ title: "Template deleted" });
        fetchTemplates();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete template.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (template: Template) => {
    if (!activeFirm) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm.id}/templates`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `${template.name} (Copy)`,
            template_type: template.template_type,
            description: template.description,
            content: template.content,
            is_active: false,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Template duplicated",
          description: "A copy of the template has been created.",
        });
        fetchTemplates();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to duplicate template.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      template_type: template.template_type,
      description: template.description || "",
      content: JSON.stringify(template.content, null, 2),
      is_active: template.is_active,
    });
    setShowEditDialog(true);
  };

  const openPreviewDialog = (template: Template) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  const openVersionsDialog = async (template: Template) => {
    setSelectedTemplate(template);
    setShowVersionsDialog(true);
    // Fetch version history
    try {
      const response = await fetch(
        `${API_BASE}/api/v1/professional/firms/${activeFirm?.id}/templates/${template.id}/versions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      }
    } catch (err) {
      console.error("Error fetching versions:", err);
      setVersions([{ version: template.version, created_at: template.updated_at, is_current: true }]);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      template_type: "intake",
      description: "",
      content: "{}",
      is_active: true,
    });
  };

  const filteredTemplates = templates.filter((template) => {
    if (filterType !== "all" && template.template_type !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTypeIcon = (type: string) => {
    const found = TEMPLATE_TYPES.find((t) => t.value === type);
    return found?.icon || FileText;
  };

  if (!activeFirm) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Firm Selected</h2>
            <p className="text-gray-500">Select a firm from the header to manage templates.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/professional/firm" className="hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              Firm Settings
            </Link>
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Templates
          </h1>
          <p className="text-gray-500 mt-1">
            Manage intake forms, agreement templates, and document presets
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="mb-6 bg-purple-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">Template System</h4>
              <p className="text-sm text-purple-700 mt-1">
                Templates customize how ARIA handles intakes and help standardize your firm's
                documentation. Intake templates define the questions ARIA asks, while agreement
                templates provide default language for custody agreements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TEMPLATE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-6 w-32 bg-gray-200 animate-pulse rounded mb-3" />
                <div className="h-4 w-full bg-gray-200 animate-pulse rounded mb-2" />
                <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold mb-2">
              {searchQuery || filterType !== "all" ? "No Matching Templates" : "No Templates Yet"}
            </h2>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterType !== "all"
                ? "Try adjusting your search or filter."
                : "Create your first template to customize ARIA intakes and documents."}
            </p>
            {!searchQuery && filterType === "all" && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const TypeIcon = getTypeIcon(template.template_type);
            return (
              <Card key={template.id} className="hover:shadow-md transition">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${TYPE_COLORS[template.template_type] || "bg-gray-100"}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {TEMPLATE_TYPES.find((t) => t.value === template.template_type)?.label || template.template_type}
                          </Badge>
                          {template.is_current && (
                            <Badge className="text-xs bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Current
                            </Badge>
                          )}
                          {!template.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPreviewDialog(template)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/professional/firm/templates/${template.id}/edit`} className="flex items-center cursor-pointer">
                            <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                            Open Builder
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Quick Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openVersionsDialog(template)}>
                          <History className="h-4 w-4 mr-2" />
                          Version History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {formatDate(template.updated_at)}
                    </span>
                    <span>v{template.version}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Template Type Legend */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-700">Template Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATE_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div key={type.value} className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${TYPE_COLORS[type.value]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a reusable template for your firm's intake sessions or documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Template Name *</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., High-Conflict Custody Intake"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-type">Type *</Label>
                <Select
                  value={formData.template_type}
                  onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Input
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of when to use this template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-content">Template Content (JSON)</Label>
              <Textarea
                id="create-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder='{"questions": [], "sections": []}'
                className="font-mono text-sm"
                rows={10}
              />
              <p className="text-xs text-gray-500">
                Define your template structure in JSON format. For intake templates, use
                questions array. For agreements, use sections array.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1">
                <Label htmlFor="create-active">Active</Label>
                <p className="text-xs text-gray-500">
                  Make this template available for use immediately
                </p>
              </div>
              <Switch
                id="create-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !formData.name}>
              {isSubmitting ? "Creating..." : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Modify the template. A new version will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50 text-gray-600">
                  {TEMPLATE_TYPES.find((t) => t.value === formData.template_type)?.label || formData.template_type}
                </div>
                <p className="text-xs text-gray-500">Type cannot be changed after creation</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Template Content (JSON)</Label>
              <Textarea
                id="edit-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="font-mono text-sm"
                rows={10}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-1">
                <Label htmlFor="edit-active">Active</Label>
                <p className="text-xs text-gray-500">
                  Inactive templates won't appear in selection lists
                </p>
              </div>
              <Switch
                id="edit-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedTemplate(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting || !formData.name}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Preview template structure and content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Badge className={TYPE_COLORS[selectedTemplate?.template_type || ""]}>
                {TEMPLATE_TYPES.find((t) => t.value === selectedTemplate?.template_type)?.label}
              </Badge>
              <span className="text-sm text-gray-500">Version {selectedTemplate?.version}</span>
              {selectedTemplate?.is_active && (
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              )}
            </div>

            {selectedTemplate?.description && (
              <p className="text-gray-600">{selectedTemplate.description}</p>
            )}

            <div className="space-y-2">
              <Label>Template Content</Label>
              <div className="bg-gray-50 border rounded-lg p-4 overflow-auto max-h-[40vh]">
                <pre className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(selectedTemplate?.content, null, 2)}
                </pre>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              Created {selectedTemplate ? formatDate(selectedTemplate.created_at) : ""} |
              Last updated {selectedTemplate ? formatDate(selectedTemplate.updated_at) : ""}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPreviewDialog(false); setSelectedTemplate(null); }}>
              Close
            </Button>
            <Button onClick={() => { setShowPreviewDialog(false); openEditDialog(selectedTemplate!); }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionsDialog} onOpenChange={setShowVersionsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {versions.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Loading versions...</p>
            ) : (
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.version}
                    className={`flex items-center justify-between p-3 rounded-lg border ${version.is_current ? "bg-green-50 border-green-200" : "bg-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-medium text-gray-700">v{version.version}</div>
                      <div className="text-sm text-gray-500">{formatDate(version.created_at)}</div>
                    </div>
                    {version.is_current && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Current
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowVersionsDialog(false); setSelectedTemplate(null); setVersions([]); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
