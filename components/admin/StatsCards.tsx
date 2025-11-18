"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatsCardsProps {
  totalUnconverted: number;
  contacted: number;
  pending: number;
}

export function StatsCards({ totalUnconverted, contacted, pending }: StatsCardsProps) {
  const conversionRate = totalUnconverted > 0
    ? ((contacted / totalUnconverted) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      {/* Total Unconverted */}
      <Card className="p-6">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Total Unconverted
            </p>
            <Badge variant="secondary">{totalUnconverted}</Badge>
          </div>
          <p className="text-2xl font-bold">{totalUnconverted}</p>
          <p className="text-xs text-muted-foreground">
            Users who generated but didn't mint
          </p>
        </div>
      </Card>

      {/* Contacted */}
      <Card className="p-6 border-green-200 bg-green-50/50">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Contacted
            </p>
            <Badge variant="default" className="bg-green-600">{contacted}</Badge>
          </div>
          <p className="text-2xl font-bold text-green-700">{contacted}</p>
          <p className="text-xs text-muted-foreground">
            {conversionRate}% contact rate
          </p>
        </div>
      </Card>

      {/* Pending */}
      <Card className="p-6 border-orange-200 bg-orange-50/50">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Pending Contact
            </p>
            <Badge variant="default" className="bg-orange-600">{pending}</Badge>
          </div>
          <p className="text-2xl font-bold text-orange-700">{pending}</p>
          <p className="text-xs text-muted-foreground">
            Not yet contacted
          </p>
        </div>
      </Card>
    </div>
  );
}
