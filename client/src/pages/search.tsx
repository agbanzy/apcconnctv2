import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Newspaper, Calendar, Target, Book, Lightbulb } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["/api/search", { q: activeQuery, category: selectedCategory === "all" ? undefined : selectedCategory }],
    enabled: activeQuery.length >= 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      setActiveQuery(searchQuery.trim());
    }
  };

  const results = searchResults?.data?.results || {};
  const total = searchResults?.data?.results?.total || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold mb-2">Search</h1>
        <p className="text-muted-foreground">
          Search across news, events, campaigns, knowledge base, and ideas
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for news, events, campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Button type="submit" disabled={searchQuery.length < 2} data-testid="button-search">
          Search
        </Button>
      </form>

      {/* Results */}
      {activeQuery && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                "Searching..."
              ) : (
                `Found ${total} result${total !== 1 ? 's' : ''} for "${activeQuery}"`
              )}
            </p>
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all" data-testid="tab-all">
                All ({total})
              </TabsTrigger>
              <TabsTrigger value="news" data-testid="tab-news">
                News ({results.news?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events">
                Events ({results.events?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="campaigns" data-testid="tab-campaigns">
                Campaigns ({results.campaigns?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="knowledge" data-testid="tab-knowledge">
                KB ({results.knowledgeBase?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="ideas" data-testid="tab-ideas">
                Ideas ({results.ideas?.length || 0})
              </TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="space-y-4 mt-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
            ) : (
              <>
                <TabsContent value="all" className="space-y-6 mt-6">
                  {/* All Results */}
                  {total === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">
                        No results found for "{activeQuery}"
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {results.news?.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Newspaper className="h-5 w-5" />
                            News ({results.news.length})
                          </h3>
                          <div className="space-y-3">
                            {results.news.map((item: any) => (
                              <Link key={item.id} href={`/news/${item.id}`}>
                                <Card className="hover-elevate cursor-pointer">
                                  <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                      <CardTitle className="text-lg">{item.title}</CardTitle>
                                      <Badge variant="secondary">{item.category}</Badge>
                                    </div>
                                    <CardDescription>{item.excerpt}</CardDescription>
                                  </CardHeader>
                                </Card>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {results.events?.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Events ({results.events.length})
                          </h3>
                          <div className="space-y-3">
                            {results.events.map((item: any) => (
                              <Card key={item.id} className="hover-elevate">
                                <CardHeader>
                                  <CardTitle className="text-lg">{item.title}</CardTitle>
                                  <CardDescription>
                                    {format(new Date(item.date), "PPP")} • {item.location}
                                  </CardDescription>
                                </CardHeader>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {results.campaigns?.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Campaigns ({results.campaigns.length})
                          </h3>
                          <div className="space-y-3">
                            {results.campaigns.map((item: any) => (
                              <Link key={item.id} href="/campaigns">
                                <Card className="hover-elevate cursor-pointer">
                                  <CardHeader>
                                    <CardTitle className="text-lg">{item.title}</CardTitle>
                                    <CardDescription>{item.description}</CardDescription>
                                  </CardHeader>
                                </Card>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {results.knowledgeBase?.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Book className="h-5 w-5" />
                            Knowledge Base ({results.knowledgeBase.length})
                          </h3>
                          <div className="space-y-3">
                            {results.knowledgeBase.map((item: any) => (
                              <Link key={item.id} href={`/knowledge-base/article/${item.slug}`}>
                                <Card className="hover-elevate cursor-pointer">
                                  <CardHeader>
                                    <CardTitle className="text-lg">{item.title}</CardTitle>
                                    <CardDescription>
                                      {item.category} • {item.views || 0} views
                                    </CardDescription>
                                  </CardHeader>
                                </Card>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {results.ideas?.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Lightbulb className="h-5 w-5" />
                            Ideas ({results.ideas.length})
                          </h3>
                          <div className="space-y-3">
                            {results.ideas.map((item: any) => (
                              <Link key={item.id} href="/ideas">
                                <Card className="hover-elevate cursor-pointer">
                                  <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                      <CardTitle className="text-lg">{item.title}</CardTitle>
                                      <Badge>{item.status}</Badge>
                                    </div>
                                    <CardDescription>{item.description}</CardDescription>
                                  </CardHeader>
                                </Card>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* Category-specific tabs would show filtered results */}
                {["news", "events", "campaigns", "knowledge", "ideas"].map((category) => (
                  <TabsContent key={category} value={category} className="space-y-3 mt-6">
                    {results[category === "knowledge" ? "knowledgeBase" : category]?.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          No {category} found for "{activeQuery}"
                        </CardContent>
                      </Card>
                    ) : (
                      results[category === "knowledge" ? "knowledgeBase" : category]?.map((item: any) => (
                        <Card key={item.id} className="hover-elevate">
                          <CardHeader>
                            <CardTitle>{item.title}</CardTitle>
                            <CardDescription>
                              {item.excerpt || item.description || item.category}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                ))}
              </>
            )}
          </Tabs>
        </>
      )}

      {!activeQuery && (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Search APC Connect</h3>
            <p className="text-muted-foreground">
              Enter at least 2 characters to search across all content
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
