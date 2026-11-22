import type { ReactNode } from "react";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SidebarTabsProps {
  /** Folder name, or the file name when a single file is open. */
  title: string;
  files: ReactNode;
  outline: ReactNode;
}

/** Files and Outline tabs. Hidden while the sidebar is collapsed to icons. */
export function SidebarTabs({ title, files, outline }: SidebarTabsProps) {
  return (
    <Tabs defaultValue="files" className="gap-0 group-data-[collapsible=icon]:hidden">
      <div className="px-2 pt-2">
        <TabsList className="w-full">
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="outline">Outline</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="files">
        <SidebarGroup>
          <SidebarGroupLabel>{title}</SidebarGroupLabel>
          <SidebarGroupContent>{files}</SidebarGroupContent>
        </SidebarGroup>
      </TabsContent>
      <TabsContent value="outline">
        <SidebarGroup>
          <SidebarGroupContent>{outline}</SidebarGroupContent>
        </SidebarGroup>
      </TabsContent>
    </Tabs>
  );
}
