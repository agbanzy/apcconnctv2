import { useState } from "react";
import { FilterDTO } from "@shared/admin-types";

interface ResourceController {
  filters: FilterDTO;
  setFilters: (filters: FilterDTO) => void;
  updateFilter: (key: string, value: any) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
}

export function useResourceController(
  initialFilters: FilterDTO = {}
): ResourceController {
  const [filters, setFilters] = useState<FilterDTO>({
    page: 1,
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
    ...initialFilters,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const updateFilter = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      // Reset to page 1 when filters change (except page change itself)
      ...(key !== "page" ? { page: 1 } : {}),
    }));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  return {
    filters,
    setFilters,
    updateFilter,
    selectedIds,
    setSelectedIds,
    toggleSelection,
    clearSelection,
  };
}
