"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCourtAuth } from "../../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Upload {
  id: string;
  filename: string;
  document_type: string;
  form_type: string | null;
  extraction_status: string;
  custody_order_id: string | null;
  extraction_confidence: number | null;
  requires_review: boolean;
  uploaded_at: string;
}

interface CustodyOrder {
  id: string;
  form_type: string;
  form_state: string;
  physical_custody: string;
  legal_custody: string;
  visitation_type: string;
  has_abuse_allegations: boolean;
  has_substance_abuse_allegations: boolean;
  abduction_risk: boolean;
  mediation_required: boolean;
  travel_restriction_state: boolean;
  is_court_ordered: boolean;
  requires_review: boolean;
  extraction_confidence: number | null;
  children_count: number;
  created_at: string;
  extracted_at: string | null;
}

interface CustodyOrderDetail {
  order: {
    id: string;
    case_id: string;
    form_type: string;
    form_state: string;
    court_case_number: string | null;
    physical_custody: string;
    legal_custody: string;
    visitation_type: string;
    has_abuse_allegations: boolean;
    abuse_alleged_against: string | null;
    has_substance_abuse_allegations: boolean;
    substance_abuse_alleged_against: string | null;
    abuse_allegation_details: string | null;
    travel_restriction_state: boolean;
    travel_restriction_counties: string[] | null;
    travel_restriction_other: string | null;
    requires_written_permission: boolean;
    abduction_risk: boolean;
    abduction_prevention_orders: string | null;
    mediation_required: boolean;
    mediation_location: string | null;
    other_provisions: string | null;
    is_court_ordered: boolean;
    order_date: string | null;
    effective_date: string | null;
    extraction_confidence: number | null;
    extraction_notes: string | null;
    requires_review: boolean;
    reviewed_at: string | null;
  };
  children: Array<{
    id: string;
    child_name: string;
    birth_date: string | null;
    age_at_filing: number | null;
    physical_custody: string | null;
    legal_custody: string | null;
  }>;
  visitation_schedules: Array<{
    id: string;
    parent_type: string;
    schedule_type: string;
    weekend_number: string | null;
    start_day: string | null;
    end_day: string | null;
    start_time: string | null;
    end_time: string | null;
    is_virtual: boolean;
    notes: string | null;
  }>;
  holiday_schedule: Array<{
    id: string;
    holiday_name: string;
    holiday_type: string;
    assigned_to: string;
    odd_years_to: string | null;
    even_years_to: string | null;
    notes: string | null;
  }>;
  supervised_visitation: {
    supervised_parent: string;
    supervisor_name: string | null;
    supervisor_type: string;
    frequency: string | null;
    hours_per_visit: number | null;
  } | null;
  exchange_rules: {
    exchange_start_address: string | null;
    exchange_end_address: string | null;
    curbside_exchange: boolean;
  } | null;
}

export default function AgreementUploadPage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, activeGrant, isLoading } = useCourtAuth();
  const caseId = params.id as string;

  const [uploads, setUploads] = useState<Upload[]>([]);
  const [custodyOrders, setCustodyOrders] = useState<CustodyOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<CustodyOrderDetail | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "orders">("upload");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formType, setFormType] = useState("FL-311");
  const [formState, setFormState] = useState("CA");

  // Polling for extraction status
  const [pollingUploadId, setPollingUploadId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && caseId && activeGrant) {
      loadData();
    }
  }, [professional, caseId, activeGrant]);

  // Poll for extraction status
  useEffect(() => {
    if (!pollingUploadId || !token || !activeGrant) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/court/agreements/upload/${pollingUploadId}/status?professional_id=${activeGrant.professional_id}&grant_id=${activeGrant.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (response.ok) {
          const status = await response.json();
          if (status.status === "completed" || status.status === "failed") {
            setPollingUploadId(null);
            setUploadProgress(null);
            loadData();
          } else {
            setUploadProgress(`Extracting... ${status.progress_percent || 0}%`);
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingUploadId, token, activeGrant]);

  const loadData = async () => {
    if (!activeGrant || !token) return;

    try {
      setIsLoadingData(true);
      setError(null);

      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      const params = `professional_id=${activeGrant.professional_id}&grant_id=${activeGrant.id}`;

      const [uploadsRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/court/agreements/uploads/case/${caseId}?${params}`, { headers }),
        fetch(`${API_BASE}/court/custody-orders/case/${caseId}?${params}`, { headers }),
      ]);

      if (uploadsRes.ok) {
        const data = await uploadsRes.json();
        setUploads(data.uploads || []);
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setCustodyOrders(data.custody_orders || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load agreement data");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setError("Only PDF files are supported");
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !activeGrant || !token) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress("Uploading...");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const params = new URLSearchParams({
        professional_id: activeGrant.professional_id,
        grant_id: activeGrant.id,
        document_type: "custody_order",
        form_type: formType,
        state: formState,
      });

      const response = await fetch(
        `${API_BASE}/court/agreements/upload/${caseId}?${params}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPollingUploadId(data.id);
        setUploadProgress("Processing PDF with AI extraction...");
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById("file-upload") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Upload failed");
        setUploadProgress(null);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Upload failed. Please try again.");
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

  const loadOrderDetails = async (orderId: string) => {
    if (!activeGrant || !token) return;

    try {
      const params = `professional_id=${activeGrant.professional_id}&grant_id=${activeGrant.id}`;
      const response = await fetch(
        `${API_BASE}/court/custody-orders/${orderId}?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(data);
      }
    } catch (err) {
      console.error("Failed to load order details:", err);
    }
  };

  const handleReview = async (orderId: string) => {
    if (!activeGrant || !token) return;

    try {
      const params = `professional_id=${activeGrant.professional_id}&grant_id=${activeGrant.id}`;
      const response = await fetch(
        `${API_BASE}/court/custody-orders/${orderId}/review?${params}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ approved: true }),
        }
      );

      if (response.ok) {
        loadData();
        if (selectedOrder?.order.id === orderId) {
          loadOrderDetails(orderId);
        }
      }
    } catch (err) {
      console.error("Failed to mark as reviewed:", err);
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      processing: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      needs_review: "bg-orange-100 text-orange-700",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status] || colors.pending}`}>
        {status.toUpperCase().replace("_", " ")}
      </span>
    );
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return null;
    const percent = Math.round(confidence * 100);
    const color = percent >= 80 ? "text-green-600" : percent >= 60 ? "text-yellow-600" : "text-red-600";
    return <span className={`text-sm font-medium ${color}`}>{percent}% confidence</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/court-portal/cases/${params.id}`}
              className="text-slate-500 hover:text-slate-700"
            >
              &larr; Back to Case
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Custody Agreement Upload</h1>
          <p className="text-slate-600">
            Upload existing custody orders for AI-powered extraction
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("upload")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "upload"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Upload Agreement
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "orders"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Extracted Orders ({custodyOrders.length})
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Custody Document</CardTitle>
              <CardDescription>
                Upload a custody agreement PDF (FL-311 or similar) for AI extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-type">Form Type</Label>
                <select
                  id="form-type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="FL-311">FL-311 (CA Child Custody & Visitation)</option>
                  <option value="FL-341">FL-341 (CA Child Custody & Visitation Order)</option>
                  <option value="FL-341(C)">FL-341(C) (Children's Holiday Schedule)</option>
                  <option value="FL-341(D)">FL-341(D) (Additional Custody Provisions)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-state">State</Label>
                <select
                  id="form-state"
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="CA">California</option>
                  <option value="TX">Texas</option>
                  <option value="FL">Florida</option>
                  <option value="NY">New York</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload">PDF Document</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
                {selectedFile && (
                  <p className="text-sm text-slate-500">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {uploadProgress && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                  {uploadProgress}
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading || !!pollingUploadId}
                className="w-full"
              >
                {isUploading ? "Uploading..." : pollingUploadId ? "Processing..." : "Upload & Extract"}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Uploads */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
              <CardDescription>
                Status of uploaded documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {uploads.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <span className="text-4xl">📄</span>
                  <p className="mt-4">No uploads yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="border rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm truncate flex-1 mr-2">
                          {upload.filename}
                        </span>
                        {getStatusBadge(upload.extraction_status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{upload.form_type || "Unknown form"}</span>
                        {upload.extraction_confidence && getConfidenceBadge(upload.extraction_confidence)}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(upload.uploaded_at).toLocaleString()}
                      </div>
                      {upload.custody_order_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => {
                            setActiveTab("orders");
                            loadOrderDetails(upload.custody_order_id!);
                          }}
                        >
                          View Extracted Data
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Order List */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Custody Orders</CardTitle>
              <CardDescription>
                Extracted from uploaded documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {custodyOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <span className="text-4xl">📋</span>
                  <p className="mt-4">No extracted orders</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {custodyOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => loadOrderDetails(order.id)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        selectedOrder?.order.id === order.id
                          ? "border-slate-900 bg-slate-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {order.form_type} ({order.form_state})
                        </span>
                        {order.requires_review && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                            Review
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.children_count} child(ren) &bull; {order.physical_custody} custody
                      </div>
                      {order.extraction_confidence && (
                        <div className="mt-1">
                          {getConfidenceBadge(order.extraction_confidence)}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Extracted Details</CardTitle>
              <CardDescription>
                Review and verify extracted custody order data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedOrder ? (
                <div className="text-center py-12 text-slate-500">
                  <span className="text-4xl">👈</span>
                  <p className="mt-4">Select an order to view details</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedOrder.order.form_type} ({selectedOrder.order.form_state})
                      </h3>
                      {selectedOrder.order.court_case_number && (
                        <p className="text-sm text-slate-500">
                          Case #{selectedOrder.order.court_case_number}
                        </p>
                      )}
                    </div>
                    {selectedOrder.order.requires_review ? (
                      <Button onClick={() => handleReview(selectedOrder.order.id)}>
                        Mark as Reviewed
                      </Button>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded">
                        Reviewed
                      </span>
                    )}
                  </div>

                  {/* Custody Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 uppercase">Physical Custody</div>
                      <div className="font-medium capitalize">{selectedOrder.order.physical_custody}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 uppercase">Legal Custody</div>
                      <div className="font-medium capitalize">{selectedOrder.order.legal_custody}</div>
                    </div>
                  </div>

                  {/* Children */}
                  {selectedOrder.children.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Children</h4>
                      <div className="space-y-2">
                        {selectedOrder.children.map((child) => (
                          <div key={child.id} className="bg-slate-50 rounded-lg p-3">
                            <div className="font-medium">{child.child_name}</div>
                            <div className="text-sm text-slate-500">
                              {child.birth_date && `Born: ${child.birth_date}`}
                              {child.age_at_filing && ` (Age ${child.age_at_filing})`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visitation Schedule */}
                  {selectedOrder.visitation_schedules.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Visitation Schedule</h4>
                      <div className="space-y-2">
                        {selectedOrder.visitation_schedules.map((schedule) => (
                          <div key={schedule.id} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium capitalize">
                                {schedule.parent_type} - {schedule.schedule_type}
                              </span>
                              {schedule.is_virtual && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                  Virtual
                                </span>
                              )}
                            </div>
                            {schedule.weekend_number && (
                              <div className="text-sm text-slate-600">
                                {schedule.weekend_number} weekend
                              </div>
                            )}
                            {schedule.start_day && (
                              <div className="text-sm text-slate-500">
                                {schedule.start_day}
                                {schedule.start_time && ` at ${schedule.start_time}`}
                                {schedule.end_day && ` to ${schedule.end_day}`}
                                {schedule.end_time && ` at ${schedule.end_time}`}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Holiday Schedule */}
                  {selectedOrder.holiday_schedule.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Holiday Schedule</h4>
                      <div className="space-y-2">
                        {selectedOrder.holiday_schedule.map((holiday) => (
                          <div key={holiday.id} className="bg-slate-50 rounded-lg p-3 flex justify-between">
                            <div>
                              <span className="font-medium">{holiday.holiday_name}</span>
                              <span className="text-xs text-slate-500 ml-2">({holiday.holiday_type})</span>
                            </div>
                            <span className="capitalize text-sm">
                              {holiday.assigned_to === "alternate"
                                ? `Alternating (Odd: ${holiday.odd_years_to}, Even: ${holiday.even_years_to})`
                                : holiday.assigned_to}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flags */}
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.order.has_abuse_allegations && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                        Abuse Allegations
                      </span>
                    )}
                    {selectedOrder.order.has_substance_abuse_allegations && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                        Substance Abuse Allegations
                      </span>
                    )}
                    {selectedOrder.order.abduction_risk && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                        Abduction Risk
                      </span>
                    )}
                    {selectedOrder.order.travel_restriction_state && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                        Travel Restricted
                      </span>
                    )}
                    {selectedOrder.order.mediation_required && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        Mediation Required
                      </span>
                    )}
                    {selectedOrder.supervised_visitation && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                        Supervised Visitation
                      </span>
                    )}
                  </div>

                  {/* Exchange Rules */}
                  {selectedOrder.exchange_rules && (
                    <div>
                      <h4 className="font-medium mb-2">Exchange Rules</h4>
                      <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                        {selectedOrder.exchange_rules.exchange_start_address && (
                          <div>
                            <span className="text-slate-500">Pickup:</span>{" "}
                            {selectedOrder.exchange_rules.exchange_start_address}
                          </div>
                        )}
                        {selectedOrder.exchange_rules.exchange_end_address && (
                          <div>
                            <span className="text-slate-500">Dropoff:</span>{" "}
                            {selectedOrder.exchange_rules.exchange_end_address}
                          </div>
                        )}
                        {selectedOrder.exchange_rules.curbside_exchange && (
                          <div className="text-slate-500">Curbside exchange required</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Extraction Notes */}
                  {selectedOrder.order.extraction_notes && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-xs text-yellow-700 font-medium uppercase mb-1">
                        Extraction Notes
                      </div>
                      <div className="text-sm text-yellow-800">
                        {selectedOrder.order.extraction_notes}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info */}
      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <span className="text-xl">ℹ️</span>
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700">About Agreement Extraction</p>
              <p className="mt-1">
                Upload existing custody agreements (like CA FL-311) and our AI will extract
                structured data including custody arrangements, visitation schedules, holiday
                schedules, and special provisions. All extracted data should be reviewed
                before being applied to the case.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
