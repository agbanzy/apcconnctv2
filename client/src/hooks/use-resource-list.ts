import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { PaginatedResponse, FilterDTO } from "@shared/admin-types";

export function useResourceList<T>(
  endpoint: string,
  filters: FilterDTO
): UseQueryResult<PaginatedResponse<T>> {
  const queryParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

  return useQuery<PaginatedResponse<T>>({
    queryKey: [endpoint, filters],
    queryFn: async () => {
      const response = await fetch(fullEndpoint, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      // Unwrap { success, data } format used by admin endpoints
      if (json.success !== undefined && json.data !== undefined) {
        return json.data;
      }
      return json;
    },
  });
}
