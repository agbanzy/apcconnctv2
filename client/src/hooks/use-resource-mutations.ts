import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { BulkAction } from "@shared/admin-types";
import { useToast } from "@/hooks/use-toast";

interface ResourceMutations<T> {
  create: UseMutationResult<any, Error, Partial<T>>;
  update: UseMutationResult<any, Error, { id: string; data: Partial<T> }>;
  remove: UseMutationResult<any, Error, string>;
  bulk: UseMutationResult<any, Error, { ids: string[]; action: BulkAction }>;
}

export function useResourceMutations<T>(endpoint: string): ResourceMutations<T> {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const create = useMutation({
    mutationFn: async (data: Partial<T>) => {
      const response = await apiRequest("POST", endpoint, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({
        title: "Success",
        description: "Item created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create item",
        variant: "destructive",
      });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      const response = await apiRequest("PATCH", `${endpoint}/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `${endpoint}/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const bulk = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: BulkAction }) => {
      const response = await apiRequest("POST", `${endpoint}/bulk`, { ids, action });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      toast({
        title: "Success",
        description: `Bulk action "${variables.action}" completed on ${variables.ids.length} item(s)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete bulk action",
        variant: "destructive",
      });
    },
  });

  return { create, update, remove, bulk };
}
