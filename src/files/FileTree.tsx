import type { TreeNode } from "./tree";

interface FileTreeProps {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function FileTree({ nodes, selectedPath, onSelect }: FileTreeProps) {
  return (
    <ul className="file-tree" role="tree">
      {nodes.map((node) => (
        <TreeItem key={node.path} node={node} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </ul>
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
      <li role="treeitem" aria-expanded>
        <details open>
          <summary className="file-tree-folder">{node.name}</summary>
          <ul role="group">
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </details>
      </li>
    );
  }

  const selected = node.path === selectedPath;
  return (
    <li role="treeitem" aria-selected={selected}>
      <button
        type="button"
        className={selected ? "file-tree-file selected" : "file-tree-file"}
        title={node.path}
        onClick={() => onSelect(node.path)}
      >
        {node.name}
      </button>
    </li>
  );
}
