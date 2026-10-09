import { ChevronRight, FileText, Folder } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import type { TreeNode } from "./tree";

interface FileTreeProps {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function FileTree({ nodes, selectedPath, onSelect }: FileTreeProps) {
  return (
    <SidebarMenu>
      {nodes.map((node) => (
        <TreeItem key={node.path} node={node} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </SidebarMenu>
  );
}

interface TreeItemProps {
  node: TreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function TreeItem({ node, selectedPath, onSelect }: TreeItemProps) {
  if (node.kind === "directory") {
    return (
      <SidebarMenuItem>
        <Collapsible defaultOpen className="group/collapsible">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton>
              <ChevronRight className="transition-transform group-data-[state=open]/collapsible:rotate-90" />
              <Folder />
              <span>{node.name}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="mr-0 pr-0">
              {node.children.map((child) => (
                <TreeItem
                  key={child.path}
                  node={child}
                  selectedPath={selectedPath}
                  onSelect={onSelect}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  }

  const selected = node.path === selectedPath;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={selected}
        aria-current={selected ? "page" : undefined}
        title={node.path}
        onClick={() => onSelect(node.path)}
      >
        <FileText />
        <span>{node.name}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
