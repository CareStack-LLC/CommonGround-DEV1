"use client";

import { Card, Metric, Text, Flex, BadgeDelta, Grid } from "@tremor/react";
import {
  FolderOpen,
  MessageSquare,
  Clock,
  Shield,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Gavel,
} from "lucide-react";
import Link from "next/link";

interface KPIData {
  title: string;
  metric: number | string;
  delta?: number;
  deltaType?: "increase" | "decrease" | "unchanged";
  target?: number;
  icon: React.ReactNode;
  href: string;
  color: "teal" | "amber" | "blue" | "purple" | "emerald";
  suffix?: string;
}

interface KPICardsProps {
  caseCount: number;
  pendingIntakes: number;
  unreadMessages: number;
  pendingApprovals: number;
  avgCompliance?: number;
  complianceTrend?: number;
  upcomingCourtDates?: number;
}

export function KPICards({
  caseCount,
  pendingIntakes,
  unreadMessages,
  pendingApprovals,
  avgCompliance = 0,
  complianceTrend = 0,
  upcomingCourtDates = 0,
}: KPICardsProps) {
  const kpiData: KPIData[] = [
    {
      title: "Active Cases",
      metric: caseCount,
      delta: 2,
      deltaType: "increase",
      icon: <FolderOpen className="h-5 w-5" />,
      href: "/professional/cases",
      color: "teal",
    },
    {
      title: "New Leads",
      metric: pendingIntakes,
      icon: <UserPlus className="h-5 w-5" />,
      href: "/professional/intake?tab=aria&status=pending",
      color: "amber",
    },
    {
      title: "Court Dates",
      metric: upcomingCourtDates,
      icon: <Gavel className="h-5 w-5" />,
      href: "/professional/calendar",
      color: "purple",
    },
    {
      title: "Unread Messages",
      metric: unreadMessages,
      icon: <MessageSquare className="h-5 w-5" />,
      href: "/professional/messages?filter=unread",
      color: "blue",
    },
    {
      title: "Avg Compliance",
      metric: avgCompliance,
      delta: complianceTrend,
      deltaType: complianceTrend >= 0 ? "increase" : "decrease",
      target: 80,
      icon: <Shield className="h-5 w-5" />,
      href: "/professional/cases?sort=compliance",
      color: "emerald",
      suffix: "%",
    },
  ];

  return (
    <Grid numItemsSm={2} numItemsLg={5} className="gap-4">
      {kpiData.map((item, index) => (
        <Link key={index} href={item.href}>
          <Card
            className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-slate-200/60"
            decoration="top"
            decorationColor={item.color}
          >
            <Flex justifyContent="start" className="space-x-3">
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${getGradient(item.color)} text-white shadow-md group-hover:scale-110 transition-transform`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider truncate">
                  {item.title}
                </Text>
                <Flex
                  justifyContent="start"
                  alignItems="baseline"
                  className="space-x-2 truncate"
                >
                  <Metric className="text-slate-900 dark:text-slate-50 truncate">
                    {item.suffix
                      ? `${item.metric}${item.suffix}`
                      : item.metric}
                  </Metric>
                  {item.delta !== undefined && item.delta !== 0 && (
                    <BadgeDelta
                      deltaType={item.deltaType}
                      size="xs"
                      className="flex items-center gap-0.5"
                    >
                      {item.deltaType === "increase" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(item.delta)}
                      {item.suffix || ""}
                    </BadgeDelta>
                  )}
                </Flex>
                {item.target && (
                  <Text className="text-[10px] text-slate-400 mt-0.5">
                    Target: {item.target}%
                  </Text>
                )}
              </div>
            </Flex>
          </Card>
        </Link>
      ))}
    </Grid>
  );
}

function getGradient(color: string): string {
  const gradients: Record<string, string> = {
    teal: "from-teal-500 to-cyan-600",
    amber: "from-amber-500 to-orange-600",
    blue: "from-blue-500 to-indigo-600",
    purple: "from-purple-500 to-pink-600",
    emerald: "from-emerald-500 to-teal-600",
  };
  return gradients[color] || gradients.teal;
}
