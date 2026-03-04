"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCourtAuth } from "../../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, MapPin, Calendar, Camera, ArrowLeftRight } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CubbieItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  estimated_value?: string;
  serial_number?: string;
  current_location: string;
  photo_url?: string;
  is_active: boolean;
  added_at?: string;
  last_location_update?: string;
}

interface ChildItems {
  child_id: string;
  child_name: string;
  items: CubbieItem[];
  item_count: number;
  total_value: string;
}

interface ItemsData {
  children: ChildItems[];
  total_items: number;
  total_value: string;
}

interface ItemTransfer {
  exchange_id: string;
  exchange_date?: string;
  item_id: string;
  item_name: string;
  item_category?: string;
  sent_by: string;
  sent_at?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  condition_sent?: string;
  condition_received?: string;
  condition_changed: boolean;
  condition_notes?: string;
  is_disputed: boolean;
  dispute_notes?: string;
  photo_sent_url?: string;
  photo_received_url?: string;
}

interface ExchangesData {
  exchanges: ItemTransfer[];
  total_transfers: number;
  disputed_count: number;
}

interface SummaryData {
  total_items: number;
  active_items: number;
  total_value: string;
  by_category: Record<string, number>;
  by_location: Record<string, number>;
  total_transfers: number;
  disputed_items: number;
  condition_issues: number;
}

export default function ItemsPage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();
  const caseId = params.id as string;

  const [activeTab, setActiveTab] = useState<"overview" | "items" | "transfers" | "disputes">("overview");
  const [itemsData, setItemsData] = useState<ItemsData | null>(null);
  const [exchangesData, setExchangesData] = useState<ExchangesData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && caseId) {
      loadItemsData();
    }
  }, [professional, caseId]);

  const loadItemsData = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [itemsRes, exchangesRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/court/cubbie/items/${caseId}`, { headers }),
        fetch(`${API_BASE}/court/cubbie/exchanges/${caseId}`, { headers }),
        fetch(`${API_BASE}/court/cubbie/summary/${caseId}`, { headers }),
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItemsData(data);
      }

      if (exchangesRes.ok) {
        const data = await exchangesRes.json();
        setExchangesData(data);
      }

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to load items data:", err);
      setError("Failed to load items data");
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading items data...</div>
      </div>
    );
  }

  const CATEGORY_ICONS: Record<string, string> = {
    electronics: "📱",
    school: "📚",
    sports: "⚽",
    medical: "🏥",
    musical: "🎸",
    other: "📦",
  };

  const LOCATION_LABELS: Record<string, string> = {
    parent_a: "Parent A",
    parent_b: "Parent B",
    child_traveling: "With Child",
    unknown: "Unknown",
  };

  const getLocationBadge = (location: string) => {
    const colors: Record<string, string> = {
      parent_a: "bg-blue-100 text-blue-700",
      parent_b: "bg-purple-100 text-purple-700",
      child_traveling: "bg-green-100 text-green-700",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[location] || "bg-gray-100 text-gray-700"}`}>
        {LOCATION_LABELS[location] || location}
      </span>
    );
  };

  const getConditionBadge = (condition: string) => {
    const colors: Record<string, string> = {
      excellent: "bg-green-100 text-green-700",
      good: "bg-blue-100 text-blue-700",
      fair: "bg-yellow-100 text-yellow-700",
      poor: "bg-orange-100 text-orange-700",
      damaged: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[condition] || "bg-gray-100 text-gray-700"}`}>
        {condition?.toUpperCase() || "N/A"}
      </span>
    );
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  const disputedTransfers = exchangesData?.exchanges.filter(e => e.is_disputed) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <Link
              href={`/court-portal/cases/${params.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              &larr; Back to Case
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-2">KidsCubbie Items</h1>
          <p className="text-muted-foreground">
            High-value item tracking and transfer history
          </p>
        </div>
        <Button variant="outline" onClick={() => loadItemsData()}>
          Refresh Data
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("items")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "items"
              ? "bg-indigo-600 text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          All Items ({summary?.total_items || 0})
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "transfers"
              ? "bg-indigo-600 text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          Transfer History ({exchangesData?.total_transfers || 0})
        </button>
        <button
          onClick={() => setActiveTab("disputes")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            activeTab === "disputes"
              ? "bg-indigo-600 text-white"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          }`}
        >
          Disputes
          {disputedTransfers.length > 0 && (
            <Badge variant="error" size="sm">{disputedTransfers.length}</Badge>
          )}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{summary?.total_items || 0}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Package className="h-3.5 w-3.5" />
                  Total Items
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.total_value || "0")}</div>
                <div className="text-xs text-muted-foreground">Total Value</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{exchangesData?.total_transfers || 0}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Transfers
                </div>
              </CardContent>
            </Card>
            <Card className={disputedTransfers.length > 0 ? "border-destructive/30 bg-destructive/5" : ""}>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${disputedTransfers.length > 0 ? "text-destructive" : "text-foreground"}`}>
                  {disputedTransfers.length}
                </div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Disputed
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          {summary?.by_category && Object.keys(summary.by_category).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items by Category</CardTitle>
                <CardDescription>Breakdown of registered high-value items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(summary.by_category).map(([category, count]) => (
                    <div key={category} className="text-center p-4 bg-secondary/50 rounded-lg">
                      <div className="text-2xl mb-1">{CATEGORY_ICONS[category] || "📦"}</div>
                      <div className="text-xl font-bold text-foreground">{count}</div>
                      <div className="text-xs text-muted-foreground capitalize">{category}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Breakdown */}
          {summary?.by_location && Object.keys(summary.by_location).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  Current Locations
                </CardTitle>
                <CardDescription>Where items are currently located</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(summary.by_location).map(([location, count]) => (
                    <div key={location} className="text-center p-4 bg-secondary/50 rounded-lg">
                      <div className="text-xl font-bold text-foreground">{count}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {LOCATION_LABELS[location] || location}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disputes Alert */}
          {disputedTransfers.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Item Disputes
                </CardTitle>
                <CardDescription className="text-destructive/80">
                  These items have unresolved condition disputes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {disputedTransfers.slice(0, 3).map((transfer) => (
                    <div key={transfer.exchange_id + transfer.item_id} className="flex items-center justify-between bg-background p-3 rounded-lg border border-destructive/20">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{CATEGORY_ICONS[transfer.item_category || "other"]}</span>
                        <div>
                          <div className="font-medium text-foreground">{transfer.item_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(transfer.exchange_date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {getConditionBadge(transfer.condition_sent || "")}
                          <span className="text-muted-foreground">→</span>
                          {getConditionBadge(transfer.condition_received || "")}
                        </div>
                      </div>
                    </div>
                  ))}
                  {disputedTransfers.length > 3 && (
                    <Button variant="outline" className="w-full" onClick={() => setActiveTab("disputes")}>
                      View All {disputedTransfers.length} Disputes
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Items State */}
          {(!summary || summary.total_items === 0) && (
            <Card className="bg-secondary/30">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">No Items Registered</h3>
                <p className="mt-2 text-muted-foreground">
                  No high-value items have been registered in KidsCubbie for this case.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Items Tab */}
      {activeTab === "items" && (
        <div className="space-y-6">
          {itemsData?.children.map((child) => (
            <Card key={child.child_id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{child.child_name}'s Items</CardTitle>
                    <CardDescription>
                      {child.item_count} items - Total value: {formatCurrency(child.total_value)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {child.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items registered for this child
                  </div>
                ) : (
                  <div className="space-y-4">
                    {child.items.map((item) => (
                      <div key={item.id} className={`border rounded-lg p-4 ${!item.is_active ? "opacity-50" : ""}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{CATEGORY_ICONS[item.category] || "📦"}</span>
                            <div>
                              <div className="font-medium text-foreground flex items-center gap-2">
                                {item.name}
                                {!item.is_active && (
                                  <Badge variant="secondary" size="sm">Inactive</Badge>
                                )}
                              </div>
                              {item.description && (
                                <div className="text-sm text-muted-foreground mt-0.5">{item.description}</div>
                              )}
                              <div className="text-sm text-muted-foreground capitalize mt-1">
                                {item.category}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {getLocationBadge(item.current_location)}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Estimated Value</div>
                            <div className="font-semibold">{item.estimated_value ? formatCurrency(item.estimated_value) : "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Serial Number</div>
                            <div className="font-semibold font-mono text-xs">{item.serial_number || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Added</div>
                            <div className="font-semibold">{formatDate(item.added_at)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Last Location Update</div>
                            <div className="font-semibold">{formatDate(item.last_location_update)}</div>
                          </div>
                        </div>

                        {item.photo_url && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
                            <Camera className="h-4 w-4" />
                            <a href={item.photo_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                              View Photo
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {(!itemsData || itemsData.children.length === 0) && (
            <Card className="bg-secondary/30">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">No Items Found</h3>
                <p className="mt-2 text-muted-foreground">
                  No children or items found for this case.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Transfers Tab */}
      {activeTab === "transfers" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-indigo-600" />
              Transfer History
            </CardTitle>
            <CardDescription>Record of all item transfers between parents</CardDescription>
          </CardHeader>
          <CardContent>
            {(!exchangesData || exchangesData.exchanges.length === 0) ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowLeftRight className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="mt-4">No item transfers recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {exchangesData.exchanges.map((transfer, idx) => (
                  <div
                    key={`${transfer.exchange_id}-${transfer.item_id}-${idx}`}
                    className={`border rounded-lg p-4 ${transfer.is_disputed ? "border-destructive/30 bg-destructive/5" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{CATEGORY_ICONS[transfer.item_category || "other"]}</span>
                        <div>
                          <div className="font-medium text-foreground flex items-center gap-2">
                            {transfer.item_name}
                            {transfer.is_disputed && (
                              <Badge variant="error" size="sm">Disputed</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(transfer.exchange_date)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        {transfer.condition_changed && (
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-cg-warning" />
                            <span className="text-cg-warning">Condition Changed</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {getConditionBadge(transfer.condition_sent || "")}
                          <span className="text-muted-foreground">→</span>
                          {getConditionBadge(transfer.condition_received || "")}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Sent By</div>
                        <div className="font-semibold">{transfer.sent_by}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(transfer.sent_at)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Acknowledged By</div>
                        <div className="font-semibold">{transfer.acknowledged_by || "Pending"}</div>
                        {transfer.acknowledged_at && (
                          <div className="text-xs text-muted-foreground">{formatDate(transfer.acknowledged_at)}</div>
                        )}
                      </div>
                      {transfer.condition_notes && (
                        <div className="col-span-2">
                          <div className="text-muted-foreground">Notes</div>
                          <div className="text-sm">{transfer.condition_notes}</div>
                        </div>
                      )}
                    </div>

                    {transfer.is_disputed && transfer.dispute_notes && (
                      <div className="mt-3 pt-3 border-t border-destructive/20">
                        <div className="text-sm font-medium text-destructive">Dispute Notes:</div>
                        <div className="text-sm text-muted-foreground mt-1">{transfer.dispute_notes}</div>
                      </div>
                    )}

                    {(transfer.photo_sent_url || transfer.photo_received_url) && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-4 text-sm text-muted-foreground">
                        <Camera className="h-4 w-4" />
                        {transfer.photo_sent_url && (
                          <a href={transfer.photo_sent_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            Photo (Sent)
                          </a>
                        )}
                        {transfer.photo_received_url && (
                          <a href={transfer.photo_received_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            Photo (Received)
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disputes Tab */}
      {activeTab === "disputes" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Disputed Item Transfers
            </CardTitle>
            <CardDescription>
              Items where condition disputes were reported
            </CardDescription>
          </CardHeader>
          <CardContent>
            {disputedTransfers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium text-foreground">No Disputes</p>
                <p className="mt-1">No item disputes have been filed for this case.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {disputedTransfers.map((transfer, idx) => (
                  <div
                    key={`dispute-${transfer.exchange_id}-${transfer.item_id}-${idx}`}
                    className="border border-destructive/30 bg-destructive/5 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{CATEGORY_ICONS[transfer.item_category || "other"]}</span>
                        <div>
                          <div className="font-medium text-foreground">{transfer.item_name}</div>
                          <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(transfer.exchange_date)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="error">DISPUTED</Badge>
                    </div>

                    <div className="mt-4 p-3 bg-background rounded-lg">
                      <div className="text-sm font-medium text-destructive mb-2">Condition Dispute</div>
                      <div className="flex items-center gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Sent as:</span>{" "}
                          {getConditionBadge(transfer.condition_sent || "")}
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <div>
                          <span className="text-muted-foreground">Received as:</span>{" "}
                          {getConditionBadge(transfer.condition_received || "")}
                        </div>
                      </div>
                      {transfer.dispute_notes && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-sm text-muted-foreground">Dispute Notes:</div>
                          <div className="text-sm mt-1">{transfer.dispute_notes}</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Sent By</div>
                        <div className="font-semibold">{transfer.sent_by}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Acknowledged By</div>
                        <div className="font-semibold">{transfer.acknowledged_by || "Pending"}</div>
                      </div>
                    </div>

                    {(transfer.photo_sent_url || transfer.photo_received_url) && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-4 text-sm">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Evidence Photos:</span>
                        {transfer.photo_sent_url && (
                          <a href={transfer.photo_sent_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            Before Transfer
                          </a>
                        )}
                        {transfer.photo_received_url && (
                          <a href={transfer.photo_received_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                            After Transfer
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="bg-secondary/30">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <span className="text-xl">ℹ️</span>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">About KidsCubbie Tracking</p>
              <p className="mt-1">
                KidsCubbie tracks high-value items that travel with children between homes.
                Parents register valuable items (electronics, sports equipment, etc.) and document
                their condition during exchanges. Photo evidence and condition reports create an
                auditable trail for court review when items are lost, damaged, or disputed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
