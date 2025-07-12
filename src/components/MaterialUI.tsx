'use client';

import React, { ReactNode } from 'react';
import { 
  Button as MuiButton, 
  ButtonProps,
  TextField as MuiTextField,
  TextFieldProps,
  Card as MuiCard,
  CardProps,
  CardContent,
  Typography,
  Box,
  IconButton,
  CircularProgress,
  Paper,
  Divider,
  Alert,
  AlertProps,
  Snackbar,
  SnackbarProps,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Tab,
  Tabs,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Switch,
  SwitchProps,
  Tooltip,
  TooltipProps,
} from '@mui/material';
import { SxProps } from '@mui/system';
import { useTheme } from '@/contexts/ThemeContext';

// 按钮组件
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'contained', color = 'primary', ...props }, ref) => {
    return (
      <MuiButton ref={ref} variant={variant} color={color} {...props}>
        {children}
      </MuiButton>
    );
  }
);
Button.displayName = 'Button';

// 文本输入框
export const TextField = React.forwardRef<HTMLDivElement, TextFieldProps>(
  ({ variant = 'outlined', ...props }, ref) => {
    return <MuiTextField ref={ref} variant={variant} fullWidth {...props} />;
  }
);
TextField.displayName = 'TextField';

// 卡片组件
export const Card = React.forwardRef<HTMLDivElement, CardProps & { title?: string; actions?: ReactNode }>(
  ({ children, title, actions, ...props }, ref) => {
    return (
      <MuiCard ref={ref} {...props}>
        {title && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
            <Typography variant="h6">{title}</Typography>
            {actions && <Box>{actions}</Box>}
          </Box>
        )}
        <CardContent>{children}</CardContent>
      </MuiCard>
    );
  }
);
Card.displayName = 'Card';

// 加载中指示器
export const Loading = ({ size = 40, sx = {} }: { size?: number; sx?: SxProps }) => {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" sx={sx}>
      <CircularProgress size={size} />
    </Box>
  );
};

// 警告提示
export const AlertMessage = ({ 
  severity = 'info', 
  children, 
  ...props 
}: AlertProps & { children: ReactNode }) => {
  return (
    <Alert severity={severity} {...props}>
      {children}
    </Alert>
  );
};

// 消息通知
export const Toast = ({ 
  open, 
  message, 
  onClose, 
  severity = 'info',
  autoHideDuration = 6000,
  ...props 
}: SnackbarProps & { 
  message: string; 
  severity?: 'success' | 'info' | 'warning' | 'error' 
}) => {
  return (
    <Snackbar open={open} autoHideDuration={autoHideDuration} onClose={onClose} {...props}>
      <Alert onClose={onClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

// 主题切换开关
export const ThemeToggle = ({ sx = {} }: { sx?: SxProps }) => {
  const { mode, toggleTheme } = useTheme();
  
  return (
    <Tooltip title={`切换为${mode === 'light' ? '暗色' : '亮色'}主题`}>
      <Switch
        checked={mode === 'dark'}
        onChange={toggleTheme}
        color="default"
        sx={sx}
      />
    </Tooltip>
  );
};

// 对话框组件
export const DialogModal = ({
  open,
  onClose,
  title,
  content,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  content: ReactNode;
  actions: ReactNode;
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <DialogTitle id="dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="dialog-description">{content}</DialogContentText>
      </DialogContent>
      <DialogActions>{actions}</DialogActions>
    </Dialog>
  );
};

// 容器组件
export const Container = ({ 
  children, 
  maxWidth = 'md',
  sx = {} 
}: { 
  children: ReactNode; 
  maxWidth?: string | number;
  sx?: SxProps;
}) => {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth,
        mx: 'auto',
        px: 2,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}; 