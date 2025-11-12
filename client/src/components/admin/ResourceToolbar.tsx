import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkActionOption {
  value: string;
  label: string;
}

interface ResourceToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onExport?: () => void;
  exportLoading?: boolean;
  filterSlot?: React.ReactNode;
  bulkActions?: BulkActionOption[];
  selectedCount?: number;
  onBulkAction?: (action: string) => void;
  bulkActionLoading?: boolean;
}

export function ResourceToolbar({
  searchValue = "",
  onSearchChange,
  onExport,
  exportLoading = false,
  filterSlot,
  bulkActions,
  selectedCount = 0,
  onBulkAction,
  bulkActionLoading = false,
}: ResourceToolbarProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
        {onSearchChange && (
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        )}
        {filterSlot}
      </div>

      <div className="flex items-center gap-2">
        {bulkActions && selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCount} selected
            </span>
            <Select onValueChange={onBulkAction} disabled={bulkActionLoading}>
              <SelectTrigger className="w-[180px]" data-testid="select-bulk-action">
                <SelectValue placeholder="Bulk actions" />
              </SelectTrigger>
              <SelectContent>
                {bulkActions.map((action) => (
                  <SelectItem
                    key={action.value}
                    value={action.value}
                    data-testid={`option-bulk-${action.value}`}
                  >
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {onExport && (
          <Button
            variant="outline"
            onClick={onExport}
            disabled={exportLoading}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            {exportLoading ? "Exporting..." : "Export"}
          </Button>
        )}
      </div>
    </div>
  );
}
