/**
 * CodeSummaryCard Component
 * Displays a comprehensive summary of analyzed code, including:
 * - Language detection and ML framework identification
 * - Code structure statistics
 * - Code density metrics
 * - ML-specific information (if applicable)
 */

import React from 'react';
import LanguageIcon from './LanguageIcon';
import { FiCpu, FiCode, FiFileText } from 'react-icons/fi';
import { Paper, Box, Typography, Chip, Divider, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';

/**
 * Styled components for the code summary card UI
 */
const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[5],
}));

const Header = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  backgroundColor: theme.palette.grey[900],
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

const Content = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const StatsCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.grey[800],
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1),
}));

/**
 * Props interface for the CodeSummaryCard component
 */
interface CodeSummaryCardProps {
  /** Detected programming language */
  language: string;
  /** AI-generated explanation of the code */
  explanation: string;
  /** Flag indicating if the code contains ML-related code */
  isMlCode?: boolean;
  /** List of detected ML frameworks */
  mlFrameworks?: string[];
  /** List of detected ML operations */
  mlOperations?: string[];
  /** Code structure analysis results */
  structure: {
    total_lines: number;
    empty_lines: number;
    comment_lines: number;
    import_statements: number;
    function_definitions: number;
    class_definitions: number;
    variable_declarations: number;
    loops: number;
    conditionals: number;
  };
}

/**
 * CodeSummaryCard Component
 * Renders a detailed summary of analyzed code with statistics and metrics
 * 
 * @param language - Detected programming language
 * @param explanation - AI-generated code explanation
 * @param isMlCode - Whether the code contains ML-related code
 * @param mlFrameworks - List of detected ML frameworks
 * @param mlOperations - List of detected ML operations
 * @param structure - Code structure analysis results
 */
const CodeSummaryCard: React.FC<CodeSummaryCardProps> = ({
  language,
  explanation,
  isMlCode = false,
  mlFrameworks = [],
  mlOperations = [],
  structure
}) => {
  // Calculate code density as percentage of non-empty, non-comment lines
  const codeDensity = structure.total_lines > 0 
    ? Math.round(((structure.total_lines - structure.empty_lines - structure.comment_lines) / structure.total_lines) * 100) 
    : 0;

  return (
    <StyledPaper>
      <Header>
        <Box display="flex" alignItems="center" gap={1}>
          <LanguageIcon language={language} size={20} />
          <Typography variant="subtitle1" fontWeight={600}>
            {language} Code Summary
          </Typography>
        </Box>
        {isMlCode && (
          <Chip
            size="small"
            icon={<FiCpu style={{ fontSize: 12 }} />}
            label="ML Code"
            color="primary"
            variant="filled"
            sx={{ 
              bgcolor: 'rgba(79, 70, 229, 0.2)', 
              color: 'rgb(199, 210, 254)', 
              '.MuiChip-icon': { color: 'rgb(199, 210, 254)' } 
            }}
          />
        )}
      </Header>
      
      <Content>
        <Box mb={2}>
          <Typography 
            variant="subtitle2" 
            color="text.secondary" 
            sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
          >
            <FiFileText style={{ marginRight: 8, fontSize: 14 }} />
            Summary
          </Typography>
          <Typography variant="body2">{explanation}</Typography>
        </Box>
        
        {isMlCode && (
          <Box mb={2}>
            <Typography 
              variant="subtitle2" 
              color="text.secondary" 
              sx={{ display: 'flex', alignItems: 'center', mb: 1 }}
            >
              <FiCpu style={{ marginRight: 8, fontSize: 14 }} />
              Machine Learning
            </Typography>
            
            {mlFrameworks.length > 0 && (
              <Box mb={1.5}>
                <Typography variant="caption" color="text.secondary">Frameworks:</Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                  {mlFrameworks.map(framework => (
                    <Chip 
                      key={framework}
                      label={framework}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        borderColor: 'rgba(79, 70, 229, 0.3)',
                        fontSize: '0.7rem',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {mlOperations.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary">Operations:</Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mt={0.5}>
                  {mlOperations.map(operation => (
                    <Chip 
                      key={operation}
                      label={operation}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        borderColor: 'rgba(79, 70, 229, 0.3)',
                        fontSize: '0.7rem',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
        
        <Divider sx={{ my: 2 }} />
        
        <Box>
          <Typography 
            variant="subtitle2" 
            color="text.secondary" 
            sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}
          >
            <FiCode style={{ marginRight: 8, fontSize: 14 }} />
            Code Stats
          </Typography>
          
          <Grid container spacing={1.5}>
            <Grid item xs={6} sm={4}>
              <StatsCard>
                <Typography variant="caption" color="text.secondary">Lines of Code</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{structure.total_lines}</Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatsCard>
                <Typography variant="caption" color="text.secondary">Functions</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{structure.function_definitions}</Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatsCard>
                <Typography variant="caption" color="text.secondary">Classes</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{structure.class_definitions}</Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatsCard>
                <Typography variant="caption" color="text.secondary">Imports</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{structure.import_statements}</Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatsCard>
                <Typography variant="caption" color="text.secondary">Conditionals</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{structure.conditionals}</Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatsCard>
                <Typography variant="caption" color="text.secondary">Loops</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{structure.loops}</Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatsCard>
                <Typography variant="caption" color="text.secondary">Variables</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{structure.variable_declarations}</Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatsCard>
                <Typography variant="caption" color="text.secondary">Comments</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{structure.comment_lines}</Typography>
              </StatsCard>
            </Grid>
            <Grid item xs={6} sm={4}>
              <StatsCard>
                <Typography variant="caption" color="text.secondary">Code Density</Typography>
                <Typography variant="subtitle2" fontWeight={600}>{codeDensity}%</Typography>
              </StatsCard>
            </Grid>
          </Grid>
        </Box>
      </Content>
    </StyledPaper>
  );
};

export default CodeSummaryCard; 