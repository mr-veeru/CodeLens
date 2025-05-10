import React, { useState, useMemo } from 'react';
import LanguageIcon from './LanguageIcon';
import { 
  ChevronRight, 
  ExpandMore, 
  FolderOutlined, 
  DeleteOutline,
  InsertDriveFileOutlined
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

// Styled components
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

// Virtual file system for organizing files by folders
interface FileSystemNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children: Record<string, FileSystemNode>;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, 
  selectedFile, 
  onFileSelect,
  onRemoveFile
}) => {
  const [expanded, setExpanded] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  
  // Determine language from file extension
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
  
  // Create a virtual file system
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
  
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };
  
  // Recursive function to render file system nodes
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
            dense
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              {language ? 
                <LanguageIcon language={language} size={18} /> : 
                <InsertDriveFileOutlined fontSize="small" />
              }
            </ListItemIcon>
            <ListItemText 
              primary={<Typography variant="body2" noWrap>{node.name}</Typography>}
              sx={{ m: 0 }}
            />
          </ListItemButton>
        </ListItem>
      );
    }
    
    // Special case for root node - just render its children
    return (
      <React.Fragment key={node.path || 'root'}>
        {Object.values(node.children)
          .sort((a, b) => {
            // Folders first, then files
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map(childNode => renderFileSystemNode(childNode, depth))
        }
      </React.Fragment>
    );
  };
  
  return (
    <StyledPaper>
      <Header onClick={() => setExpanded(!expanded)}>
        <Box display="flex" alignItems="center" gap={1}>
          {expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
          <Typography variant="subtitle2" fontWeight={500}>EXPLORER</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </Typography>
      </Header>
      
      {expanded && (
        <Box sx={{ 
          p: 0.5, 
          maxHeight: 'calc(100vh - 300px)', 
          overflow: 'auto',
          bgcolor: 'background.paper'
        }}>
          {files.length === 0 ? (
            <Box p={1}>
              <Typography variant="body2" color="text.secondary">
              No files uploaded yet
              </Typography>
            </Box>
          ) : (
            <List dense component="nav" disablePadding>
              {renderFileSystemNode(fileSystem)}
            </List>
          )}
        </Box>
      )}
    </StyledPaper>
  );
};

export default FileExplorer; 