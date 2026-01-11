"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCourtAuth } from "../../../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Obligation {
  id: string;
  title: string;
  purpose_category: string;
  total_amount: string;
  petitioner_share: string;
  respondent_share: string;
  status: string;
  amount_funded: string;
  amount_verified: string;
  due_date: string | null;
  is_overdue: boolean;
  verification_required: boolean;
  receipt_required: boolean;
  created_by: string;
  created_at: string;
}

interface BalanceSummary {
  case_id: string;
  petitioner_id: string;
  respondent_id: string;
  petitioner_balance: string;
  respondent_balance: string;
  petitioner_owes_respondent: string;
  respondent_owes_petitioner: string;
  net_balance: string;
  total_obligations_open: number;
  total_obligations_funded: number;
  total_obligations_completed: number;
  total_this_month: string;
  total_overdue: string;
}

interface LedgerEntry {
  id: string;
  entry_type: string;
  obligor_id: string;
  obligee_id: string;
  amount: string;
  running_balance: string;
  obligation_id: string | null;
  description: string;
  effective_date: string;
  is_reconciled: boolean;
  created_at: string;
}

interface ObligationMetrics {
  total_open: number;
  total_pending_funding: number;
  total_funded: number;
  total_verified: number;
  total_completed: number;
  total_overdue: number;
  total_cancelled: number;
}

export default function PaymentsPage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, isLoading } = useCourtAuth();
  const caseId = params.id as string;

  const [activeTab, setActiveTab] = useState<"overview" | "obligations" | "ledger">("overview");
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [metrics, setMetrics] = useState<ObligationMetrics | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push("/court-portal/login");
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && caseId) {
      loadPaymentData();
    }
  }, [professional, caseId]);

  const loadPaymentData = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      // Load obligations, balance, metrics, and ledger in parallel using court endpoints
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const [obligationsRes, balanceRes, metricsRes, ledgerRes] = await Promise.all([
        fetch(`${API_BASE}/court/clearfund/obligations/${caseId}?page=1&page_size=50`, { headers }),
        fetch(`${API_BASE}/court/clearfund/balance/${caseId}`, { headers }),
        fetch(`${API_BASE}/court/clearfund/metrics/${caseId}`, { headers }),
        fetch(`${API_BASE}/court/clearfund/ledger/${caseId}?page=1&page_size=50`, { headers }),
      ]);

      if (obligationsRes.ok) {
        const data = await obligationsRes.json();
        setObligations(data.items || []);
      }

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(data);
      }

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }

      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setLedger(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load payment data:", err);
      setError("Failed to load payment data");
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading payment data...</div>
      </div>
    );
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      medical: "🏥",
      education: "📚",
      sports: "🏃",
      extracurricular: "🎨",
      device: "📱",
      camp: "🏕️",
      clothing: "👕",
      transportation: "🚗",
      childcare: "👶",
      child_support: "💰",
      other: "📋",
    };
    return icons[category] || "📋";
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (isOverdue) {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
          OVERDUE
        </span>
      );
    }
    const colors: Record<string, string> = {
      open: "bg-yellow-100 text-yellow-700",
      partially_funded: "bg-blue-100 text-blue-700",
      funded: "bg-green-100 text-green-700",
      verified: "bg-purple-100 text-purple-700",
      completed: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status] || colors.open}`}>
        {status.toUpperCase().replace("_", " ")}
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

  const overdueObligations = obligations.filter(o => o.is_overdue);
  const pendingObligations = obligations.filter(o => o.status === "open" || o.status === "partially_funded");
  const completedObligations = obligations.filter(o => o.status === "completed");

  // Calculate compliance rate
  const totalObligations = obligations.length;
  const completedOnTime = obligations.filter(o => o.status === "completed" && !o.is_overdue).length;
  const complianceRate = totalObligations > 0 ? Math.round((completedOnTime / totalObligations) * 100) : 100;

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
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Financial Compliance</h1>
          <p className="text-slate-600">
            ClearFund obligation tracking and payment ledger
          </p>
        </div>
        <Button variant="outline" onClick={() => loadPaymentData()}>
          Refresh Data
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "overview"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("obligations")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "obligations"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Obligations ({obligations.length})
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === "ledger"
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Transaction Ledger ({ledger.length})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${complianceRate >= 80 ? "text-green-600" : complianceRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                  {complianceRate}%
                </div>
                <div className="text-xs text-slate-500">Compliance Rate</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{overdueObligations.length}</div>
                <div className="text-xs text-slate-500">Overdue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{pendingObligations.length}</div>
                <div className="text-xs text-slate-500">Pending Funding</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{completedObligations.length}</div>
                <div className="text-xs text-slate-500">Completed</div>
              </CardContent>
            </Card>
          </div>

          {/* Balance Summary */}
          {balance && (
            <Card>
              <CardHeader>
                <CardTitle>Balance Summary</CardTitle>
                <CardDescription>Current financial standing between parents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">Petitioner Balance</div>
                    <div className={`text-2xl font-bold mt-1 ${parseFloat(balance.petitioner_balance) >= 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(balance.petitioner_balance)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {parseFloat(balance.petitioner_balance) >= 0 ? "Owes" : "Owed"}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm text-purple-600 font-medium">Respondent Balance</div>
                    <div className={`text-2xl font-bold mt-1 ${parseFloat(balance.respondent_balance) >= 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(balance.respondent_balance)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {parseFloat(balance.respondent_balance) >= 0 ? "Owes" : "Owed"}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 font-medium">Net Balance</div>
                    <div className="text-2xl font-bold mt-1 text-slate-900">
                      {formatCurrency(balance.net_balance)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Overall</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-sm text-slate-500">This Month</div>
                    <div className="font-semibold">{formatCurrency(balance.total_this_month)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Total Overdue</div>
                    <div className="font-semibold text-red-600">{formatCurrency(balance.total_overdue)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Open Obligations</div>
                    <div className="font-semibold">{balance.total_obligations_open}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Completed</div>
                    <div className="font-semibold">{balance.total_obligations_completed}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overdue Obligations Alert */}
          {overdueObligations.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700">Overdue Obligations</CardTitle>
                <CardDescription className="text-red-600">
                  These obligations have passed their due date without completion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overdueObligations.map((ob) => (
                    <div key={ob.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-red-200">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getCategoryIcon(ob.purpose_category)}</span>
                        <div>
                          <div className="font-medium text-slate-900">{ob.title}</div>
                          <div className="text-sm text-slate-500">
                            Due: {ob.due_date ? new Date(ob.due_date).toLocaleDateString() : "No due date"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-red-700">{formatCurrency(ob.total_amount)}</div>
                        <div className="text-xs text-slate-500">
                          Funded: {formatCurrency(ob.amount_funded)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metrics by Status */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Obligation Metrics</CardTitle>
                <CardDescription>Breakdown by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{metrics.total_open}</div>
                    <div className="text-xs text-slate-500">Open</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metrics.total_pending_funding}</div>
                    <div className="text-xs text-slate-500">Pending</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{metrics.total_funded}</div>
                    <div className="text-xs text-slate-500">Funded</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{metrics.total_verified}</div>
                    <div className="text-xs text-slate-500">Verified</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{metrics.total_completed}</div>
                    <div className="text-xs text-slate-500">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{metrics.total_overdue}</div>
                    <div className="text-xs text-slate-500">Overdue</div>
                  </div>
                  <div className="text-center p-3 bg-slate-100 rounded-lg">
                    <div className="text-2xl font-bold text-slate-600">{metrics.total_cancelled}</div>
                    <div className="text-xs text-slate-500">Cancelled</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Obligations Tab */}
      {activeTab === "obligations" && (
        <Card>
          <CardHeader>
            <CardTitle>All Obligations</CardTitle>
            <CardDescription>Complete list of financial obligations for this case</CardDescription>
          </CardHeader>
          <CardContent>
            {obligations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <span className="text-4xl">💰</span>
                <p className="mt-4">No obligations found for this case</p>
              </div>
            ) : (
              <div className="space-y-4">
                {obligations.map((ob) => (
                  <div key={ob.id} className={`border rounded-lg p-4 ${ob.is_overdue ? "border-red-200 bg-red-50" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{getCategoryIcon(ob.purpose_category)}</span>
                        <div>
                          <div className="font-medium text-slate-900">{ob.title}</div>
                          <div className="text-sm text-slate-500 capitalize">
                            {ob.purpose_category.replace("_", " ")}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(ob.status, ob.is_overdue)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-slate-500">Total Amount</div>
                        <div className="font-semibold">{formatCurrency(ob.total_amount)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Petitioner Share</div>
                        <div className="font-semibold">{formatCurrency(ob.petitioner_share)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Respondent Share</div>
                        <div className="font-semibold">{formatCurrency(ob.respondent_share)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Amount Funded</div>
                        <div className="font-semibold text-green-600">{formatCurrency(ob.amount_funded)}</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-4">
                        {ob.due_date && (
                          <span>Due: {new Date(ob.due_date).toLocaleDateString()}</span>
                        )}
                        {ob.verification_required && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Verification Required</span>
                        )}
                        {ob.receipt_required && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Receipt Required</span>
                        )}
                      </div>
                      <span>Created: {new Date(ob.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Funding Progress Bar */}
                    {ob.status !== "completed" && ob.status !== "cancelled" && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Funding Progress</span>
                          <span>{Math.round((parseFloat(ob.amount_funded) / parseFloat(ob.total_amount)) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((parseFloat(ob.amount_funded) / parseFloat(ob.total_amount)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ledger Tab */}
      {activeTab === "ledger" && (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Ledger</CardTitle>
            <CardDescription>Immutable record of all financial transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {ledger.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <span className="text-4xl">📒</span>
                <p className="mt-4">No transactions recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Description</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Amount</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Balance</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(entry.effective_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            entry.entry_type === "funding" ? "bg-green-100 text-green-700" :
                            entry.entry_type === "obligation" ? "bg-blue-100 text-blue-700" :
                            entry.entry_type === "prepayment" ? "bg-purple-100 text-purple-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {entry.entry_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">{entry.description}</td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          parseFloat(entry.amount) >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600">
                          {formatCurrency(entry.running_balance)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {entry.is_reconciled ? (
                            <span className="text-green-600">Reconciled</span>
                          ) : (
                            <span className="text-yellow-600">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card className="bg-slate-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <span className="text-xl">ℹ️</span>
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700">About ClearFund Financial Tracking</p>
              <p className="mt-1">
                ClearFund provides purpose-locked financial obligations with court-ready records.
                All obligations are tracked from creation through completion, with verification
                requirements and receipt tracking. The transaction ledger provides an immutable
                record of all financial activity for court documentation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
