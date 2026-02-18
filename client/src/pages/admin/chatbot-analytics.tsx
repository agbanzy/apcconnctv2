import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Users, TrendingUp, Calendar, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AdminChatbotAnalytics() {
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [userTypeFilter, setUserTypeFilter] = useState("all");

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/chatbot/stats"],
  });

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["/api/admin/chatbot/conversations", { userType: userTypeFilter }],
  });

  const { data: conversationDetails } = useQuery({
    queryKey: ["/api/chatbot/conversations", selectedConversation?.id],
    enabled: !!selectedConversation,
  });

  const last30Days = conversations
    .filter((c: any) => {
      const date = new Date(c.createdAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    })
    .reduce((acc: any, c: any) => {
      const date = format(new Date(c.createdAt), "MMM d");
      const existing = acc.find((item: any) => item.date === date);
      if (existing) {
        existing.conversations += 1;
        existing.messages += c.messagesCount || 0;
      } else {
        acc.push({ date, conversations: 1, messages: c.messagesCount || 0 });
      }
      return acc;
    }, []);

  const userTypeData = [
    { name: "Members", value: stats?.memberConversations || 0 },
    { name: "Anonymous", value: stats?.anonymousConversations || 0 },
  ];

  const COLORS = ["#22c55e", "#3b82f6"];

  const handleExportConversation = () => {
    if (!conversationDetails) return;
    
    const text = conversationDetails.messages
      .map((m: any) => `[${format(new Date(m.createdAt), "yyyy-MM-dd HH:mm:ss")}] ${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${conversationDetails.id}.txt`;
    a.click();
  };

  const filteredConversations = conversations.filter((c: any) => {
    if (userTypeFilter === "member" && !c.memberId) return false;
    if (userTypeFilter === "anonymous" && c.memberId) return false;
    return true;
  });

  const extractKeywords = (conversations: any[]) => {
    const allMessages = conversations.flatMap((c: any) => c.messages || []);
    const userMessages = allMessages.filter((m: any) => m.role === "user");
    
    const wordCounts: Record<string, number> = {};
    userMessages.forEach((m: any) => {
      const words = m.content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
      words.forEach((word) => {
        if (!["what", "when", "where", "which", "would", "could", "should", "about", "with", "from", "this", "that", "have", "they"].includes(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  };

  const keywords = extractKeywords(conversations);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chatbot Analytics</h1>
        <p className="text-muted-foreground">Monitor AI chatbot performance and conversations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-conversations">
              {stats?.totalConversations || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-messages">
              {stats?.totalMessages || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-messages">
              {stats?.avgMessagesPerConversation || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Conversations</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-conversations-today">
              {stats?.conversationsToday || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Activity Over Time (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={last30Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="conversations" stroke="#22c55e" name="Conversations" />
                <Line type="monotone" dataKey="messages" stroke="#3b82f6" name="Messages" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={userTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {userTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Common Keywords & Topics</CardTitle>
          <CardDescription>Most frequently mentioned terms in user messages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {keywords.map((item) => (
              <Card key={item.word}>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{item.count}</div>
                    <div className="text-sm text-muted-foreground capitalize">{item.word}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>View and analyze chatbot conversations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-user-type">
                  <SelectValue placeholder="User Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="member">Members</SelectItem>
                  <SelectItem value="anonymous">Anonymous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Last Message</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredConversations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No conversations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredConversations.map((conv: any) => (
                        <TableRow key={conv.id}>
                          <TableCell className="font-mono text-sm">{conv.id.slice(0, 8)}...</TableCell>
                          <TableCell>
                            {conv.member ? (
                              <div>
                                <div className="font-medium">
                                  {conv.member?.user?.firstName || "Unknown"} {conv.member?.user?.lastName || ""}
                                </div>
                                <Badge variant="secondary" className="mt-1">Member</Badge>
                              </div>
                            ) : (
                              <Badge variant="outline">Anonymous</Badge>
                            )}
                          </TableCell>
                          <TableCell>{conv.messagesCount || 0}</TableCell>
                          <TableCell>{format(new Date(conv.createdAt), "MMM d, yyyy")}</TableCell>
                          <TableCell>{format(new Date(conv.lastMessageAt || conv.createdAt), "MMM d, h:mm a")}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedConversation(conv)}
                              data-testid={`button-view-conversation-${conv.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto" data-testid="sheet-conversation-details">
          <SheetHeader>
            <SheetTitle>Conversation Details</SheetTitle>
            <SheetDescription>
              {selectedConversation?.member ? (
                <>
                  {selectedConversation.member?.user?.firstName || "Unknown"} {selectedConversation.member?.user?.lastName || ""} •{" "}
                  {format(new Date(selectedConversation.createdAt), "MMM d, yyyy 'at' h:mm a")}
                </>
              ) : (
                <>Anonymous • {selectedConversation && format(new Date(selectedConversation.createdAt), "MMM d, yyyy 'at' h:mm a")}</>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-6 mt-6">
            {selectedConversation?.member && (
              <div>
                <h3 className="font-semibold mb-2">User Information</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span>{selectedConversation.member?.user?.firstName || "Unknown"} {selectedConversation.member?.user?.lastName || ""}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member ID:</span>
                    <span className="font-mono">{selectedConversation.member.memberId}</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Messages ({conversationDetails?.messages?.length || 0})</h3>
                <Button variant="outline" size="sm" onClick={handleExportConversation} data-testid="button-export-conversation">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
              <div className="space-y-3">
                {conversationDetails?.messages?.map((msg: any, idx: number) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary/10 ml-8"
                        : "bg-muted mr-8"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={msg.role === "user" ? "default" : "secondary"}>
                        {msg.role === "user" ? "User" : "AI"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}
                {!conversationDetails?.messages?.length && (
                  <p className="text-sm text-muted-foreground">No messages in this conversation</p>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
