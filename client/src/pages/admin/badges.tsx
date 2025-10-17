import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Award, Plus, Trash2, Trophy, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertBadgeSchema } from "@shared/schema";

const badgeFormSchema = insertBadgeSchema.extend({
  criteriaType: z.string(),
  criteriaValue: z.coerce.number().min(1)
});

type BadgeFormData = z.infer<typeof badgeFormSchema>;

const BADGE_ICONS = [
  "star", "check-square", "brain", "calendar", "megaphone", 
  "lightbulb", "trophy", "heart", "zap", "graduation-cap", "award", "shield"
];

const BADGE_CATEGORIES = [
  "tasks", "events", "quizzes", "campaigns", "ideas", "engagement", "points", "special"
];

const CRITERIA_TYPES = [
  { value: "tasks_completed", label: "Tasks Completed" },
  { value: "quizzes_completed", label: "Quizzes Completed" },
  { value: "events_attended", label: "Events Attended" },
  { value: "campaigns_supported", label: "Campaigns Supported" },
  { value: "ideas_submitted", label: "Ideas Submitted" },
  { value: "total_points", label: "Total Points" },
  { value: "joined", label: "Joined Platform" },
];

export default function AdminBadgesPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: badges, isLoading } = useQuery({
    queryKey: ["/api/gamification/badges"]
  });

  const { data: badgeStats } = useQuery({
    queryKey: ["/api/admin/badge-stats"],
    enabled: false
  });

  const form = useForm<BadgeFormData>({
    resolver: zodResolver(badgeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "award",
      category: "engagement",
      points: 0,
      criteriaType: "tasks_completed",
      criteriaValue: 1
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: BadgeFormData) => {
      const { criteriaType, criteriaValue, ...rest } = data;
      return apiRequest("POST", "/api/badges", {
        ...rest,
        criteria: { type: criteriaType, value: criteriaValue }
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Badge created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/badges"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create badge",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (badgeId: string) => apiRequest("DELETE", `/api/badges/${badgeId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Badge deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/gamification/badges"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete badge",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: BadgeFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="admin-badges-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Badge Management</h1>
          <p className="text-muted-foreground">Create and manage badges for member recognition</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-badge">
              <Plus className="mr-2 h-4 w-4" />
              Create Badge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Badge</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Badge Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Task Master" data-testid="input-badge-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe what this badge represents..." 
                          data-testid="input-badge-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="icon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-badge-icon">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BADGE_ICONS.map(icon => (
                              <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-badge-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BADGE_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat} className="capitalize">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Points Reward</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          value={field.value ?? 0}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                          data-testid="input-badge-points"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="criteriaType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirement Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-criteria-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CRITERIA_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="criteriaValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirement Value</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value))}
                            data-testid="input-criteria-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-submit-badge"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Badge"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {(badges as any)?.data?.length || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Points Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {((badges as any)?.data?.reduce((sum: number, b: any) => sum + b.points, 0)) || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {new Set(((badges as any)?.data || []).map((b: any) => b.category).filter(Boolean)).size}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Badges</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((badges as any)?.data || []).map((badge: any) => (
                  <TableRow key={badge.id} data-testid={`badge-row-${badge.id}`}>
                    <TableCell>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Award className="h-4 w-4 text-primary" />
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{badge.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{badge.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {badge.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">+{badge.points}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {badge.criteria?.type}: {badge.criteria?.value}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            data-testid={`button-delete-${badge.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Badge</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{badge.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(badge.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
