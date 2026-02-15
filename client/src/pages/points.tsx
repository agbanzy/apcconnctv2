import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins, TrendingUp, ShoppingCart, Users, Download, Search, Filter } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function PointsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [transactionType, setTransactionType] = useState<string>("all");
  const [source, setSource] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 20;

  const { data: memberData } = useQuery<{ success: boolean; data: any }>({
    queryKey: ["/api/members/me"],
  });

  const memberId = memberData?.data?.id;

  const { data: balanceData, isLoading: isLoadingBalance } = useQuery<{
    success: boolean;
    balance: number;
  }>({
    queryKey: ["/api/points/balance", memberId],
    enabled: !!memberId,
  });

  const { data: transactionsData, isLoading: isLoadingTransactions } = useQuery<{
    success: boolean;
    transactions: any[];
    total: number;
  }>({
    queryKey: [
      "/api/points/transactions", memberId,
      { page, pageSize, transactionType, source },
    ],
    enabled: !!memberId,
  });

  const { data: purchasesData, isLoading: isLoadingPurchases } = useQuery<{
    success: boolean;
    purchases: any[];
  }>({
    queryKey: ["/api/points/purchases", memberId],
    enabled: !!memberId,
  });

  const balance = balanceData?.balance || 0;
  const transactions = transactionsData?.transactions || [];
  const totalTransactions = transactionsData?.total || 0;
  const purchases = purchasesData?.purchases || [];

  const filteredTransactions = transactions.filter((t) => {
    if (searchQuery && !t.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(totalTransactions / pageSize);

  const exportToCSV = () => {
    const headers = ["Date", "Type", "Source", "Amount", "Balance After", "Reference"];
    const rows = transactions.map((t) => [
      format(new Date(t.createdAt), "MMM dd, yyyy HH:mm"),
      t.transactionType,
      t.source,
      t.amount,
      t.balanceAfter,
      t.referenceId || "-",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `points-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Coins className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  {isLoadingBalance ? (
                    <Skeleton className="h-10 w-32" />
                  ) : (
                    <h1
                      className="font-display text-4xl font-bold text-primary"
                      data-testid="text-points-balance"
                    >
                      {balance.toLocaleString()} pts
                    </h1>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/purchase-points">
              <Button className="w-full" data-testid="button-purchase-points">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Purchase Points
              </Button>
            </Link>
            <Link href="/referrals">
              <Button variant="outline" className="w-full" data-testid="button-refer-friends">
                <Users className="h-4 w-4 mr-2" />
                Refer Friends
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" className="w-full" data-testid="button-view-leaderboard">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Leaderboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions" data-testid="tab-transactions">
            Transaction History
          </TabsTrigger>
          <TabsTrigger value="purchases" data-testid="tab-purchases">
            Purchase History
          </TabsTrigger>
        </TabsList>

        {/* Transaction History Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>View all your points transactions</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  data-testid="button-export-csv"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by reference ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-transactions"
                    />
                  </div>
                </div>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger className="w-[150px]" data-testid="select-transaction-type">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="earn">Earn</SelectItem>
                    <SelectItem value="spend">Spend</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="w-[150px]" data-testid="select-source">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="share">Share</SelectItem>
                    <SelectItem value="paystack">Paystack</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              {isLoadingTransactions ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No transactions found
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Balance After</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((transaction) => (
                          <TableRow key={transaction.id} data-testid={`transaction-row-${transaction.id}`}>
                            <TableCell className="font-medium">
                              {format(new Date(transaction.createdAt), "MMM dd, yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  transaction.transactionType === "earn" ||
                                  transaction.transactionType === "purchase"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {transaction.transactionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">{transaction.source}</TableCell>
                            <TableCell
                              className={`text-right font-mono font-semibold ${
                                transaction.amount > 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {transaction.amount > 0 ? "+" : ""}
                              {transaction.amount}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {transaction.balanceAfter}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {transaction.referenceId ? `Ref: ${transaction.referenceId.slice(0, 8)}...` : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {(page - 1) * pageSize + 1} to{" "}
                        {Math.min(page * pageSize, totalTransactions)} of {totalTransactions} transactions
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          data-testid="button-prev-page"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          data-testid="button-next-page"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase History Tab */}
        <TabsContent value="purchases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Purchase History</CardTitle>
              <CardDescription>View all your point purchases via Paystack</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPurchases ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : purchases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No purchases yet</p>
                  <Link href="/purchase-points">
                    <Button className="mt-4" data-testid="button-make-first-purchase">
                      Make Your First Purchase
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead>Points Received</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((purchase) => (
                        <TableRow key={purchase.id} data-testid={`purchase-row-${purchase.id}`}>
                          <TableCell className="font-medium">
                            {format(new Date(purchase.createdAt), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="font-mono">₦{parseFloat(purchase.nairaAmount).toLocaleString()}</TableCell>
                          <TableCell className="font-mono text-primary font-semibold">
                            {purchase.pointsAmount} pts
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                purchase.status === "success"
                                  ? "default"
                                  : purchase.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {purchase.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">
                            {purchase.paystackReference?.slice(0, 12)}...
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
