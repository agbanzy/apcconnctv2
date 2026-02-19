import { useState } from "react";
import { format } from "date-fns";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResourceToolbar } from "@/components/admin/ResourceToolbar";
import { ResourceTable, Column } from "@/components/admin/ResourceTable";
import { useResourceController } from "@/hooks/use-resource-controller";
import { useResourceList } from "@/hooks/use-resource-list";
import { ExportButton } from "@/components/admin/ExportButton";
import { AlertTriangle, Eye } from "lucide-react";

interface AuditLog {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  status: string;
  ipAddress: string | null;
  fraudScore: number;
  suspiciousActivity: boolean;
  details: Record<string, any> | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export default function AdminAuditLogs() {
  const { filters, updateFilter, setFilters } = useResourceController({
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data, isLoading } = useResourceList<AuditLog>("/api/admin/audit-logs", filters);

  const columns: Column<AuditLog>[] = [
    {
      key: "createdAt",
      header: "Timestamp",
      sortable: true,
      render: (log) => (
        <span className="text-sm" data-testid={`text-timestamp-${log.id}`}>
          {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm:ss")}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      sortable: true,
      render: (log) => (
        <Badge variant="outline" data-testid={`badge-action-${log.id}`}>
          {log.action}
        </Badge>
      ),
    },
    {
      key: "user",
      header: "User",
      render: (log) => (
        <div data-testid={`text-user-${log.id}`}>
          {log.user ? (
            <>
              <div className="font-medium">
                {log.user.firstName} {log.user.lastName}
              </div>
              <div className="text-xs text-muted-foreground">{log.user.email}</div>
            </>
          ) : (
            <span className="text-muted-foreground">System</span>
          )}
        </div>
      ),
    },
    {
      key: "resourceType",
      header: "Resource",
      render: (log) => (
        <div className="text-sm" data-testid={`text-resource-${log.id}`}>
          {log.resourceType && (
            <>
              <div className="font-medium">{log.resourceType}</div>
              {log.resourceId && (
                <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {log.resourceId}
                </div>
              )}
            </>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (log) => (
        <Badge
          variant={log.status === "success" ? "default" : "destructive"}
          data-testid={`badge-status-${log.id}`}
        >
          {log.status}
        </Badge>
      ),
    },
    {
      key: "ipAddress",
      header: "IP Address",
      render: (log) => (
        <span className="text-sm font-mono" data-testid={`text-ip-${log.id}`}>
          {log.ipAddress || "N/A"}
        </span>
      ),
    },
    {
      key: "fraudScore",
      header: "Fraud Score",
      sortable: true,
      render: (log) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono" data-testid={`text-fraud-${log.id}`}>
            {log.fraudScore}
          </span>
          {log.suspiciousActivity && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (log) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedLog(log);
            setDetailsOpen(true);
          }}
          data-testid={`button-view-details-${log.id}`}
        >
          <Eye className="h-4 w-4 mr-1" />
          Details
        </Button>
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
          { label: "Audit Logs" },
        ]}
      />

      <div>
        <h1 className="font-display text-3xl font-bold" data-testid="text-page-title">
          Audit Logs
        </h1>
        <p className="text-muted-foreground mt-1">
          Track all system activities and user actions
        </p>
      </div>

      <Card className="p-6">
        <ResourceToolbar
          searchValue={filters.search || ""}
          onSearchChange={(value) => updateFilter("search", value)}
          filterSlot={
            <div className="flex gap-2">
              <Select
                value={filters.action || "all"}
                onValueChange={(value) =>
                  updateFilter("action", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-[180px]" data-testid="select-filter-action">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="vote">Vote</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="admin_action">Admin Action</SelectItem>
                  <SelectItem value="create_quiz">Create Quiz</SelectItem>
                  <SelectItem value="update_quiz">Update Quiz</SelectItem>
                  <SelectItem value="delete_quiz">Delete Quiz</SelectItem>
                </SelectContent>
              </Select>

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
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failure">Failure</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          onExport={() => {}}
          exportLoading={false}
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
            endpoint="/api/admin/audit-logs/export"
            filters={filters}
            filename={`audit_logs_${Date.now()}.csv`}
            label="Export to CSV"
          />
        </div>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete details for audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                  <p className="text-sm">
                    {format(new Date(selectedLog.createdAt), "PPpp")}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Action</p>
                  <p className="text-sm">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User</p>
                  <p className="text-sm">
                    {selectedLog.user
                      ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}`
                      : "System"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge
                    variant={selectedLog.status === "success" ? "default" : "destructive"}
                  >
                    {selectedLog.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                  <p className="text-sm font-mono">{selectedLog.ipAddress || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fraud Score</p>
                  <p className="text-sm">{selectedLog.fraudScore}</p>
                </div>
                {selectedLog.resourceType && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Resource Type
                      </p>
                      <p className="text-sm">{selectedLog.resourceType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Resource ID
                      </p>
                      <p className="text-sm font-mono">{selectedLog.resourceId || "N/A"}</p>
                    </div>
                  </>
                )}
              </div>

              {selectedLog.details && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Additional Details
                  </p>
                  <pre className="bg-muted p-4 rounded-md overflow-x-auto text-xs">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
