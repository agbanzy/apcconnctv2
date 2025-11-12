import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Coins, Settings, Smartphone } from "lucide-react";

const CARRIERS = ["MTN", "Airtel", "Glo", "9Mobile"];

const conversionSettingSchema = z.object({
  productType: z.enum(["airtime", "data"]),
  baseRate: z.number().min(0.1).max(1000),
  minPoints: z.number().min(1).max(10000),
  maxPoints: z.number().min(1).max(100000),
  carrierOverrides: z.record(z.number()).optional(),
  isActive: z.boolean(),
});

type ConversionSettingFormData = z.infer<typeof conversionSettingSchema>;

export default function RewardsSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"airtime" | "data">("airtime");

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["/api/admin/conversion-settings"]
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: ConversionSettingFormData) => 
      apiRequest("POST", "/api/admin/conversion-settings", data),
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Conversion settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/conversion-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/conversion-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    }
  });

  const settings = (settingsData as any)?.data || [];
  const airtimeSetting = settings.find((s: any) => s.productType === "airtime");
  const dataSetting = settings.find((s: any) => s.productType === "data");

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="rewards-settings-loading">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="rewards-settings-page">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-12 w-12 bg-primary rounded-md">
          <Settings className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Rewards Settings</h1>
          <p className="text-muted-foreground">Configure point-to-airtime/data conversion rates</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Airtime Status</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-airtime-status">
              {airtimeSetting?.isActive ? "Active" : "Inactive"}
            </div>
            <p className="text-xs text-muted-foreground">
              Base Rate: {airtimeSetting?.baseRate || "Not set"} pts/NGN
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Status</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-data-status">
              {dataSetting?.isActive ? "Active" : "Inactive"}
            </div>
            <p className="text-xs text-muted-foreground">
              Base Rate: {dataSetting?.baseRate || "Not set"} pts/NGN
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carriers</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{CARRIERS.length}</div>
            <p className="text-xs text-muted-foreground">
              Supported networks in Nigeria
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "airtime" | "data")}>
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="airtime" data-testid="tab-airtime">
            Airtime Settings
          </TabsTrigger>
          <TabsTrigger value="data" data-testid="tab-data">
            Data Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="airtime">
          <ConversionSettingForm
            productType="airtime"
            initialData={airtimeSetting}
            onSubmit={updateSettingsMutation.mutate}
            isPending={updateSettingsMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="data">
          <ConversionSettingForm
            productType="data"
            initialData={dataSetting}
            onSubmit={updateSettingsMutation.mutate}
            isPending={updateSettingsMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ConversionSettingFormProps {
  productType: "airtime" | "data";
  initialData?: any;
  onSubmit: (data: ConversionSettingFormData) => void;
  isPending: boolean;
}

function ConversionSettingForm({ productType, initialData, onSubmit, isPending }: ConversionSettingFormProps) {
  const form = useForm<ConversionSettingFormData>({
    resolver: zodResolver(conversionSettingSchema),
    defaultValues: {
      productType,
      baseRate: initialData?.baseRate ? parseFloat(initialData.baseRate) : 10,
      minPoints: initialData?.minPoints || 100,
      maxPoints: initialData?.maxPoints || 10000,
      carrierOverrides: initialData?.carrierOverrides || {},
      isActive: initialData?.isActive ?? true,
    },
  });

  const handleSubmit = (data: ConversionSettingFormData) => {
    onSubmit(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="capitalize">{productType} Conversion Settings</CardTitle>
        <CardDescription>
          Configure how points convert to {productType} value in Naira
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base" data-testid={`label-${productType}-active`}>
                      Enable {productType.charAt(0).toUpperCase() + productType.slice(1)} Redemption
                    </FormLabel>
                    <FormDescription>
                      Allow users to redeem points for {productType}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid={`switch-${productType}-active`}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid={`label-${productType}-base-rate`}>
                    Base Conversion Rate (Points per 1 NGN)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="10"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      data-testid={`input-${productType}-base-rate`}
                    />
                  </FormControl>
                  <FormDescription>
                    How many points equal 1 Naira (e.g., 10 points = 1 NGN)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="minPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid={`label-${productType}-min-points`}>
                      Minimum Points
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid={`input-${productType}-min-points`}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum points required for redemption
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid={`label-${productType}-max-points`}>
                      Maximum Points
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10000"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid={`input-${productType}-max-points`}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum points allowed per redemption
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base">Carrier-Specific Overrides (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Set different rates for specific carriers. Leave empty to use base rate.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {CARRIERS.map((carrier) => (
                  <FormField
                    key={carrier}
                    control={form.control}
                    name={`carrierOverrides.${carrier}` as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid={`label-${productType}-carrier-${carrier.toLowerCase()}`}>
                          {carrier} Rate
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder={`Use base rate (${form.watch("baseRate")})`}
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : undefined;
                              form.setValue(`carrierOverrides.${carrier}` as any, value as any);
                            }}
                            data-testid={`input-${productType}-carrier-${carrier.toLowerCase()}`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isPending}
              data-testid={`button-save-${productType}-settings`}
            >
              {isPending ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
