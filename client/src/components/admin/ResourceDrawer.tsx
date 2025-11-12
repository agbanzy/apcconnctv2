import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ResourceDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function ResourceDrawer({
  open,
  onClose,
  title,
  description,
  children,
}: ResourceDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl overflow-y-auto" data-testid="drawer-resource">
        <SheetHeader>
          <SheetTitle data-testid="text-drawer-title">{title}</SheetTitle>
          {description && (
            <SheetDescription data-testid="text-drawer-description">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="mt-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
