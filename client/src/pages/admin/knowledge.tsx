import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus, Trash2, Edit, Eye, Search, ChevronUp, ChevronDown } from "lucide-react";
import { format } from "date-fns";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().default(0),
});

const articleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  categoryId: z.string().min(1, "Category is required"),
  summary: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  published: z.boolean().default(false),
});

const faqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  categoryId: z.string().optional(),
  order: z.number().default(0),
  published: z.boolean().default(true),
});

export default function AdminKnowledge() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("categories");
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [articleDialog, setArticleDialog] = useState(false);
  const [faqDialog, setFaqDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [publishedFilter, setPublishedFilter] = useState("all");

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/knowledge/categories"],
    select: (data: any) => data.data || [],
  });

  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["/api/knowledge/articles"],
    select: (data: any) => data.data || [],
  });

  const { data: faqs = [], isLoading: faqsLoading } = useQuery({
    queryKey: ["/api/knowledge/faqs"],
    select: (data: any) => data.data || [],
  });

  const categoryForm = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      icon: "BookOpen",
      order: 0,
    },
  });

  const articleForm = useForm({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      slug: "",
      categoryId: "",
      summary: "",
      content: "",
      published: false,
    },
  });

  const faqForm = useForm({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question: "",
      answer: "",
      categoryId: "",
      order: 0,
      published: true,
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof categorySchema>) => {
      return apiRequest("POST", "/api/knowledge/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/categories"] });
      setCategoryDialog(false);
      categoryForm.reset();
      toast({ title: "Category created successfully" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest("PATCH", `/api/knowledge/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/categories"] });
      setCategoryDialog(false);
      setEditingItem(null);
      toast({ title: "Category updated successfully" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/knowledge/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/categories"] });
      setDeleteConfirm(null);
      toast({ title: "Category deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to delete category", variant: "destructive" });
    },
  });

  const createArticleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof articleSchema>) => {
      return apiRequest("POST", "/api/knowledge/articles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/articles"] });
      setArticleDialog(false);
      articleForm.reset();
      toast({ title: "Article created successfully" });
    },
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest("PATCH", `/api/knowledge/articles/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/articles"] });
      setArticleDialog(false);
      setEditingItem(null);
      toast({ title: "Article updated successfully" });
    },
  });

  const deleteArticleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/knowledge/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/articles"] });
      setDeleteConfirm(null);
      toast({ title: "Article deleted successfully" });
    },
  });

  const createFaqMutation = useMutation({
    mutationFn: async (data: z.infer<typeof faqSchema>) => {
      return apiRequest("POST", "/api/knowledge/faqs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/faqs"] });
      setFaqDialog(false);
      faqForm.reset();
      toast({ title: "FAQ created successfully" });
    },
  });

  const updateFaqMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest("PATCH", `/api/knowledge/faqs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/faqs"] });
      setFaqDialog(false);
      setEditingItem(null);
      toast({ title: "FAQ updated successfully" });
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/knowledge/faqs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge/faqs"] });
      setDeleteConfirm(null);
      toast({ title: "FAQ deleted successfully" });
    },
  });

  const handleEditCategory = (category: any) => {
    setEditingItem(category);
    categoryForm.reset(category);
    setCategoryDialog(true);
  };

  const handleEditArticle = (article: any) => {
    setEditingItem(article);
    articleForm.reset(article);
    setArticleDialog(true);
  };

  const handleEditFaq = (faq: any) => {
    setEditingItem(faq);
    faqForm.reset(faq);
    setFaqDialog(true);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const filteredArticles = articles.filter((article: any) => {
    if (searchQuery && !article.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== "all" && article.categoryId !== categoryFilter) return false;
    if (publishedFilter !== "all" && article.published !== (publishedFilter === "true")) return false;
    return true;
  });

  const filteredFaqs = faqs.filter((faq: any) => {
    if (searchQuery && !faq.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== "all" && faq.categoryId !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base Management</h1>
        <p className="text-muted-foreground">Manage categories, articles, and FAQs</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
          <TabsTrigger value="articles" data-testid="tab-articles">Articles</TabsTrigger>
          <TabsTrigger value="faqs" data-testid="tab-faqs">FAQs</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Manage knowledge base categories</CardDescription>
              </div>
              <Button onClick={() => { setEditingItem(null); categoryForm.reset(); setCategoryDialog(true); }} data-testid="button-create-category">
                <Plus className="h-4 w-4 mr-2" />
                Create Category
              </Button>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Icon</TableHead>
                        <TableHead>Articles</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No categories found
                          </TableCell>
                        </TableRow>
                      ) : (
                        categories.map((category: any) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                            <TableCell>{category.icon || "—"}</TableCell>
                            <TableCell>
                              {articles.filter((a: any) => a.categoryId === category.id).length}
                            </TableCell>
                            <TableCell>{category.order}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditCategory(category)}
                                  data-testid={`button-edit-category-${category.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteConfirm({ type: "category", id: category.id })}
                                  data-testid={`button-delete-category-${category.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="articles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Articles</CardTitle>
                <CardDescription>Manage knowledge base articles</CardDescription>
              </div>
              <Button onClick={() => { setEditingItem(null); articleForm.reset(); setArticleDialog(true); }} data-testid="button-create-article">
                <Plus className="h-4 w-4 mr-2" />
                Create Article
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                      data-testid="input-search-articles"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[180px]" data-testid="select-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={publishedFilter} onValueChange={setPublishedFilter}>
                    <SelectTrigger className="w-full md:w-[180px]" data-testid="select-published">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="true">Published</SelectItem>
                      <SelectItem value="false">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {articlesLoading ? (
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
                          <TableHead>Title</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Author</TableHead>
                          <TableHead>Published</TableHead>
                          <TableHead>Views</TableHead>
                          <TableHead>Helpful</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredArticles.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              No articles found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredArticles.map((article: any) => (
                            <TableRow key={article.id}>
                              <TableCell className="font-medium">{article.title}</TableCell>
                              <TableCell>{article.category?.name}</TableCell>
                              <TableCell>
                                {article.author?.firstName} {article.author?.lastName}
                              </TableCell>
                              <TableCell>
                                <Badge variant={article.published ? "default" : "secondary"}>
                                  {article.published ? "Published" : "Draft"}
                                </Badge>
                              </TableCell>
                              <TableCell>{article.viewsCount || 0}</TableCell>
                              <TableCell>{article.helpfulCount || 0}</TableCell>
                              <TableCell>{format(new Date(article.createdAt), "MMM d, yyyy")}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditArticle(article)}
                                    data-testid={`button-edit-article-${article.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteConfirm({ type: "article", id: article.id })}
                                    data-testid={`button-delete-article-${article.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
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
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>FAQs</CardTitle>
                <CardDescription>Manage frequently asked questions</CardDescription>
              </div>
              <Button onClick={() => { setEditingItem(null); faqForm.reset(); setFaqDialog(true); }} data-testid="button-create-faq">
                <Plus className="h-4 w-4 mr-2" />
                Create FAQ
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search FAQs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                      data-testid="input-search-faqs"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]" data-testid="select-faq-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {faqsLoading ? (
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
                          <TableHead>Question</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Published</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFaqs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No FAQs found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredFaqs.map((faq: any) => (
                            <TableRow key={faq.id}>
                              <TableCell className="font-medium">{faq.question}</TableCell>
                              <TableCell>{faq.category?.name || "—"}</TableCell>
                              <TableCell>{faq.order}</TableCell>
                              <TableCell>
                                <Badge variant={faq.published ? "default" : "secondary"}>
                                  {faq.published ? "Published" : "Draft"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditFaq(faq)}
                                    data-testid={`button-edit-faq-${faq.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteConfirm({ type: "faq", id: faq.id })}
                                    data-testid={`button-delete-faq-${faq.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
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
        </TabsContent>
      </Tabs>

      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent data-testid="dialog-category-form">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Category" : "Create Category"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update category details" : "Add a new knowledge base category"}
            </DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit((data) => {
              if (editingItem) {
                updateCategoryMutation.mutate({ id: editingItem.id, ...data });
              } else {
                createCategoryMutation.mutate(data);
              }
            })} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!editingItem) {
                            categoryForm.setValue("slug", generateSlug(e.target.value));
                          }
                        }}
                        data-testid="input-category-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-category-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-category-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="BookOpen" data-testid="input-category-icon" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-category-order"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" data-testid="button-save-category">
                  {editingItem ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={articleDialog} onOpenChange={setArticleDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-article-form">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Article" : "Create Article"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update article details" : "Add a new knowledge base article"}
            </DialogDescription>
          </DialogHeader>
          <Form {...articleForm}>
            <form onSubmit={articleForm.handleSubmit((data) => {
              if (editingItem) {
                updateArticleMutation.mutate({ id: editingItem.id, ...data });
              } else {
                createArticleMutation.mutate(data);
              }
            })} className="space-y-4">
              <FormField
                control={articleForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!editingItem) {
                            articleForm.setValue("slug", generateSlug(e.target.value));
                          }
                        }}
                        data-testid="input-article-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={articleForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-article-slug" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={articleForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-article-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={articleForm.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-article-summary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={articleForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (Markdown)</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={10} data-testid="textarea-article-content" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={articleForm.control}
                name="published"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-article-published"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Published</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" data-testid="button-save-article">
                  {editingItem ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={faqDialog} onOpenChange={setFaqDialog}>
        <DialogContent data-testid="dialog-faq-form">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit FAQ" : "Create FAQ"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Update FAQ details" : "Add a new frequently asked question"}
            </DialogDescription>
          </DialogHeader>
          <Form {...faqForm}>
            <form onSubmit={faqForm.handleSubmit((data) => {
              const submitData = { ...data, categoryId: data.categoryId === "none" ? null : data.categoryId };
              if (editingItem) {
                updateFaqMutation.mutate({ id: editingItem.id, ...submitData });
              } else {
                createFaqMutation.mutate(submitData);
              }
            })} className="space-y-4">
              <FormField
                control={faqForm.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-faq-question" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={faqForm.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={5} data-testid="textarea-faq-answer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={faqForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-faq-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={faqForm.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-faq-order"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={faqForm.control}
                name="published"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-faq-published"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Published</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" data-testid="button-save-faq">
                  {editingItem ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteConfirm?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteConfirm) return;
                if (deleteConfirm.type === "category") {
                  deleteCategoryMutation.mutate(deleteConfirm.id);
                } else if (deleteConfirm.type === "article") {
                  deleteArticleMutation.mutate(deleteConfirm.id);
                } else if (deleteConfirm.type === "faq") {
                  deleteFaqMutation.mutate(deleteConfirm.id);
                }
              }}
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
