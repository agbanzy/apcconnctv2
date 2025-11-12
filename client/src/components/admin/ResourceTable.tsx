import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface ResourceTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  getRowId?: (row: T) => string;
  onSort?: (column: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
}

export function ResourceTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId = (row) => row.id,
  onSort,
  sortBy,
  sortOrder = 'desc',
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
}: ResourceTableProps<T>) {
  const allIds = data.map(getRowId);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.includes(id));
  const someSelected = allIds.some(id => selectedIds.includes(id)) && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.(selectedIds.filter(id => !allIds.includes(id)));
    } else {
      onSelectionChange?.([...new Set([...selectedIds, ...allIds])]);
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter(rowId => rowId !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    data-testid="checkbox-select-all"
                    className={someSelected ? "data-[state=checked]:bg-primary" : ""}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.key}>
                  {column.sortable && onSort ? (
                    <Button
                      variant="ghost"
                      onClick={() => onSort(column.key)}
                      className="hover-elevate h-8 px-2"
                      data-testid={`button-sort-${column.key}`}
                    >
                      {column.header}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="h-24 text-center"
                >
                  <p className="text-muted-foreground" data-testid="text-no-results">
                    No results found
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedIds.includes(rowId);

                return (
                  <TableRow
                    key={rowId}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? "cursor-pointer" : ""}
                    data-testid={`row-${rowId}`}
                  >
                    {selectable && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectRow(rowId)}
                          aria-label={`Select row ${rowId}`}
                          data-testid={`checkbox-${rowId}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.key} data-testid={`cell-${column.key}-${rowId}`}>
                        {column.render ? column.render(row) : row[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              data-testid="button-first-page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              data-testid="button-last-page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
