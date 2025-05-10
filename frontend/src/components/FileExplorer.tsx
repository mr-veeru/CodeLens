/**
 * FileExplorer Component
 * A hierarchical file explorer that displays uploaded files in a tree structure.
 * Supports file selection, removal, and language detection based on file extensions.
 */

import React, { useState, useMemo } from 'react';
import LanguageIcon from './LanguageIcon';
import { 
  ChevronRight, 
  ExpandMore, 
  FolderOutlined, 
  DeleteOutline
} from '@mui/icons-material';
import { 
  Box, 
  Typography, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Paper, 
  Collapse, 
  Tooltip,
  alpha
} from '@mui/material';
import { styled } from '@mui/material/styles';

/**
 * Styled components for the file explorer UI
 */
const StyledPaper = styled(Paper)(({ theme }) => ({
  height: '100%',
  width: '100%',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
}));

const Header = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 1.5),
  backgroundColor: theme.palette.grey[900],
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
}));

/**
 * Interface definitions for component props and data structures
 */
interface FileItem {
  name: string;
  content: string;
}

interface FileExplorerProps {
  files: FileItem[];
  selectedFile: string | null;
  onFileSelect: (fileName: string) => void;
  onRemoveFile: (fileName: string) => void;
}

/**
 * Represents a node in the virtual file system tree
 */
interface FileSystemNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children: Record<string, FileSystemNode>;
}

/**
 * FileExplorer Component
 * Renders a hierarchical file explorer with support for:
 * - File/folder tree visualization
 * - File selection and removal
 * - Language detection
 * - Collapsible folders
 * 
 * @param files - Array of files to display
 * @param selectedFile - Currently selected file path
 * @param onFileSelect - Callback when a file is selected
 * @param onRemoveFile - Callback when a file is removed
 */
const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  selectedFile, 
  onFileSelect,
  onRemoveFile
}) => {
  const [expanded, setExpanded] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  /**
   * Determines the programming language based on file extension
   * @param filename - Name of the file to analyze
   * @returns Detected programming language
   */
  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    const extensionMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript React',
      'ts': 'TypeScript',
      'tsx': 'TypeScript React',
      'py': 'Python',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'html': 'HTML',
      'css': 'CSS',
      'md': 'Markdown',
      'json': 'JSON',
      'yml': 'YAML',
      'yaml': 'YAML',
      'xml': 'XML',
      'sql': 'SQL',
      'sh': 'Shell',
      'bash': 'Bash',
      'txt': 'Plain Text'
    };
    
    return extensionMap[ext] || 'Plain Text';
  };
  
  /**
   * Creates a virtual file system tree from the flat file list
   * @returns Root node of the file system tree
   */
  const fileSystem = useMemo(() => {
    const root: FileSystemNode = {
      name: 'root',
      path: '',
      type: 'folder',
      children: {}
    };
    
    // Process files and organize them into a tree structure
    files.forEach(file => {
      const parts = file.name.split('/');
      let currentNode = root;
      let currentPath = '';
      
      // Process each path segment except the last one (filename)
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!currentNode.children[part]) {
          currentNode.children[part] = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: {}
          };
        }
        
        currentNode = currentNode.children[part];
      }
      
      // Add the file to the current folder
      const fileName = parts[parts.length - 1];
      currentNode.children[fileName] = {
        name: fileName,
        path: file.name,
        type: 'file',
        content: file.content,
        children: {}
      };
    });
    
    return root;
  }, [files]);
  
  /**
   * Toggles the expanded state of a folder
   * @param path - Path of the folder to toggle
   */
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };
  
  /**
   * Recursively renders a file system node and its children
   * @param node - Current node to render
   * @param depth - Current depth in the tree
   * @returns React node representing the file system node
   */
  const renderFileSystemNode = (node: FileSystemNode, depth = 0): React.ReactNode => {
    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders[node.path] !== false; // Default to expanded
    const language = isFolder ? '' : getLanguageFromFilename(node.name);
    const isSelected = selectedFile === node.path;
    const paddingLeft = depth * 12;
    
    if (isFolder && node.name !== 'root') {
      return (
        <React.Fragment key={node.path}>
          <ListItem 
            disablePadding 
            sx={{ display: 'block' }}
          >
            <ListItemButton
              onClick={() => toggleFolder(node.path)}
              sx={{ pl: 1 + paddingLeft/8, pr: 1 }}
              dense
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                {isExpanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Box display="flex" alignItems="center">
                    <FolderOutlined fontSize="small" sx={{ mr: 1, color: 'primary.light' }} />
                    <Typography variant="body2" noWrap>{node.name}</Typography>
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>
          
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {Object.values(node.children)
                .sort((a, b) => {
                  // Folders first, then files
                  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                  return a.name.localeCompare(b.name);
                })
                .map(childNode => renderFileSystemNode(childNode, depth + 1))
              }
            </List>
          </Collapse>
        </React.Fragment>
      );
    } else if (node.type === 'file') {
      return (
        <ListItem
          key={node.path}
          disablePadding
          secondaryAction={
            <Tooltip title="Remove file">
              <IconButton 
                edge="end" 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFile(node.path);
                }}
                sx={{ 
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  '&:hover': { opacity: 1, color: 'error.main' },
                  '.MuiListItemButton-root:hover &': { opacity: 0.7 }
                }}
              >
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          }
          sx={{ '.MuiListItemSecondaryAction-root': { right: 4 } }}
        >
          <ListItemButton
            selected={isSelected}
            onClick={() => onFileSelect(node.path)}
            sx={{ 
              pl: 1 + paddingLeft/8, 
              pr: 6,
              '&.Mui-selected': {
                bgcolor: theme => alpha(theme.palette.primary.main, 0.15),
                '&:hover': {
                  bgcolor: theme => alpha(theme.palette.primary.main, 0.25),
                }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <LanguageIcon language={language} size={16} />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography variant="body2" noWrap>
                  {node.name}
                </Typography>
              }
            />
          </ListItemButton>
        </ListItem>
      );
    }
    
    return null;
  };

  return (
    <StyledPaper elevation={0}>
      <Header onClick={() => setExpanded(!expanded)}>
        <Typography variant="subtitle2" color="text.secondary">
          Files
        </Typography>
      </Header>
      
      <Collapse in={expanded}>
        <List
          component="nav"
          sx={{
            width: '100%',
            maxHeight: 'calc(100vh - 200px)',
            overflow: 'auto',
            py: 0
          }}
        >
          {Object.values(fileSystem.children)
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map(node => renderFileSystemNode(node))
          }
        </List>
      </Collapse>
    </StyledPaper>
  );
};

export default FileExplorer; 