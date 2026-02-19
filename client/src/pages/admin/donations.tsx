import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResourceToolbar } from "@/components/admin/ResourceToolbar";
import { ResourceTable, Column } from "@/components/admin/ResourceTable";
import { useResourceController } from "@/hooks/use-resource-controller";
import { useResourceList } from "@/hooks/use-resource-list";
import { ExportButton } from "@/components/admin/ExportButton";
import { DollarSign, TrendingUp, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Donation {
  id: string;
  amount: number;
  purpose: string;
  status: "pending" | "completed" | "failed";
  date: string;
  donor?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface DonationStats {
  totalAmount: number;
  totalDonations: number;
  averageDonation: number;
  monthlyData: Array<{ month: string; amount: number; count: number }>;
}

export default function AdminDonations() {
  const { filters, updateFilter, setFilters } = useResourceController({
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const { data, isLoading } = useResourceList<Donation>("/api/admin/donations-list", filters);
  
  const { data: stats } = useQuery<DonationStats>({
    queryKey: ["/api/admin/donations/stats"],
  });

  const columns: Column<Donation>[] = [
    {
      key: "donor",
      header: "Donor",
      render: (donation) => (
        <span className="text-sm" data-testid={`text-donor-${donation.id}`}>
          {donation.donor
            ? `${donation.donor.firstName} ${donation.donor.lastName}`
            : "Anonymous"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      render: (donation) => (
        <span className="text-sm font-mono font-semibold" data-testid={`text-amount-${donation.id}`}>
          ₦{donation.amount.toLocaleString()}
        </span>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      render: (donation) => (
        <span className="text-sm" data-testid={`text-purpose-${donation.id}`}>
          {donation.purpose}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (donation) => (
        <Badge
          variant={
            donation.status === "completed"
              ? "default"
              : donation.status === "pending"
              ? "outline"
              : "destructive"
          }
          data-testid={`badge-status-${donation.id}`}
        >
          {donation.status}
        </Badge>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (donation) => (
        <span className="text-sm" data-testid={`text-date-${donation.id}`}>
          {format(new Date(donation.date), "MMM d, yyyy h:mm a")}
        </span>
      ),
    },
  ];

  const handleSort = (column: string) => {
    const newSortOrder =
      filters.sortBy === column && filters.sortOrder === "desc" ? "asc" : "desc";
    setFilters({ ...filters, sortBy: column, sortOrder: newSortOrder });
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Donation Management" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
            Donation Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze donation activity
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-amount">
              ₦{(stats?.totalAmount || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time contributions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Count</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-count">
              {stats?.totalDonations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Number of donations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-average-donation">
              ₦{(stats?.averageDonation || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-month-amount">
              ₦
              {(
                stats?.monthlyData?.[stats.monthlyData.length - 1]?.amount || 0
              ).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month total
            </p>
          </CardContent>
        </Card>
      </div>

      {stats?.monthlyData && stats.monthlyData.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Monthly Donation Trends</h2>
              <p className="text-sm text-muted-foreground">
                Donation amounts over the past months
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `₦${value.toLocaleString()}`}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="p-6">
        <ResourceToolbar
          searchValue={filters.search || ""}
          onSearchChange={(value) => updateFilter("search", value)}
          filterSlot={
            <div className="flex gap-2">
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  updateFilter("status", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.purpose || "all"}
                onValueChange={(value) =>
                  updateFilter("purpose", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[180px]" data-testid="select-filter-purpose">
                  <SelectValue placeholder="Filter by purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purposes</SelectItem>
                  <SelectItem value="General Support">General Support</SelectItem>
                  <SelectItem value="Campaign">Campaign</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        <div className="mt-6">
          <ResourceTable
            columns={columns}
            data={data?.data || []}
            isLoading={isLoading}
            currentPage={filters.page}
            totalPages={data?.totalPages || 1}
            onPageChange={(page) => updateFilter("page", page)}
            onSort={handleSort}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder as "asc" | "desc"}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <ExportButton
            endpoint="/api/admin/donations/export"
            filters={filters}
            filename={`donations_${Date.now()}.csv`}
            label="Export to CSV"
          />
        </div>
      </Card>
    </div>
  );
}
