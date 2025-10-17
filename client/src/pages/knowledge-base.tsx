import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, Eye, ThumbsUp, ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  viewsCount: number;
  helpfulCount: number;
  category: Category;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  categoryId: string | null;
}

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery<{ success: boolean; data: Category[] }>({
    queryKey: ["/api/knowledge/categories"],
  });

  const { data: articlesData, isLoading: articlesLoading } = useQuery<{ success: boolean; data: Article[] }>({
    queryKey: ["/api/knowledge/articles"],
  });

  const { data: faqsData } = useQuery<{ success: boolean; data: FAQ[] }>({
    queryKey: ["/api/knowledge/faqs"],
  });

  const categories = categoriesData?.data || [];
  const articles = articlesData?.data || [];
  const faqs = faqsData?.data || [];

  const filteredArticles = articles
    .filter(article => {
      const matchesSearch = searchQuery === "" || 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.summary?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || article.category.id === selectedCategory;
      return matchesSearch && matchesCategory;
    });

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticles = articles
    .sort((a, b) => b.viewsCount - a.viewsCount)
    .slice(0, 4);

  const getCategoryArticleCount = (categoryId: string) => {
    return articles.filter(a => a.category.id === categoryId).length;
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-lg p-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-4xl font-bold mb-3" data-testid="text-page-title">
            Political Literacy Hub
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Build your political knowledge with our comprehensive articles and resources
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search articles and FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-kb"
            />
          </div>
        </div>
      </div>

      {!searchQuery && (
        <>
          <div>
            <h2 className="font-display text-2xl font-bold mb-6">Browse by Category</h2>
            {categoriesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => setSelectedCategory(category.id)}
                    data-testid={`card-category-${category.slug}`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <Badge variant="secondary">{getCategoryArticleCount(category.id)}</Badge>
                      </div>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold mb-6">Featured Articles</h2>
            {articlesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featuredArticles.map((article) => (
                  <Link key={article.id} href={`/knowledge-base/article/${article.slug}`}>
                    <Card className="h-full hover-elevate" data-testid={`card-featured-${article.slug}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg">{article.title}</CardTitle>
                          <Badge variant="secondary">{article.category.name}</Badge>
                        </div>
                        <CardDescription className="line-clamp-3">
                          {article.summary}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{article.viewsCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{article.helpfulCount}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold">
            {selectedCategory ? "Filtered Articles" : "All Articles"}
          </h2>
          {selectedCategory && (
            <Button variant="ghost" onClick={() => setSelectedCategory(null)}>
              Clear Filter
            </Button>
          )}
        </div>
        {articlesLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <Link key={article.id} href={`/knowledge-base/article/${article.slug}`}>
                <Card className="hover-elevate" data-testid={`card-article-${article.slug}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{article.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {article.summary}
                        </CardDescription>
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{article.viewsCount} views</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{article.helpfulCount} helpful</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary">{article.category.name}</Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
            {filteredArticles.length === 0 && (
              <Card className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No articles found</p>
              </Card>
            )}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        {filteredFaqs.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No FAQs found</p>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem key={faq.id} value={`item-${index}`} data-testid={`faq-item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
