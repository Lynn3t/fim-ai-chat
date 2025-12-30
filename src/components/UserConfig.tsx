'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Stack,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  AlertTitle
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Key as KeyIcon,
  SmartToy as SmartToyIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserConfig } from '@/hooks/useUserConfig';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function UserConfig() {
  const {
    user,
    tokenStats,
    accessCodes,
    inviteCodes,
    availableModels,
    recentModels,
    selectedDefaultModel,
    createAccessCode,
    createInviteCode,
    deleteInviteCode,
    deleteAccessCode,
    setDefaultModel,
    clearRecentModels,
    copyToClipboard,
  } = useUserConfig();

  const { mode } = useTheme();

  // UI State
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [showDeleteInviteDialog, setShowDeleteInviteDialog] = useState(false);
  const [deletingInvite, setDeletingInvite] = useState<{ id: string; code: string } | null>(null);

  // Handlers
  const openDeleteInviteDialog = (codeId: string, code: string) => {
    setDeletingInvite({ id: codeId, code });
    setShowDeleteInviteDialog(true);
  };

  const handleDeleteInviteCode = async () => {
    if (deletingInvite) {
      await deleteInviteCode(deletingInvite.id);
      setShowDeleteInviteDialog(false);
    }
  };

  const handleCreateAccessCode = async () => {
    const success = await createAccessCode(selectedModelIds);
    if (success) {
      setCreateDialogOpen(false);
      setSelectedModelIds([]);
    }
  };

  if (!user || user.role === 'GUEST') {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          访客用户无法访问配置页面
        </Typography>
        <Button component={Link} href="/chat" color="primary">
          返回聊天
        </Button>
      </Box>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
      {/* 标签页导航 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<DashboardIcon />} label="仪表板" />
          <Tab icon={<KeyIcon />} label="访问码管理" />
          <Tab icon={<SmartToyIcon />} label="模型权限" />
          <Tab icon={<SmartToyIcon />} label="默认模型" />
        </Tabs>
      </Box>

      {/* 仪表板标签页 */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ px: 3 }}>
          <Typography variant="h6" gutterBottom>
            使用统计
          </Typography>

          {/* 用户信息卡片 */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              bgcolor: mode === 'light' ? 'primary.50' : 'primary.900',
              borderRadius: 2
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                mb: 2,
                color: mode === 'light' ? 'primary.900' : 'primary.100',
                fontWeight: 500
              }}
            >
              账户信息
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">用户名：</Typography>
                <Typography variant="body1">{user.username}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">角色：</Typography>
                <Typography variant="body1">
                  {user.role === 'ADMIN' ? '管理员' : '普通用户'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Token统计卡片 */}
          {tokenStats ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card elevation={1} sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      总计使用
                    </Typography>
                    <Typography variant="h3" color="primary" gutterBottom>
                      {tokenStats?.totalTokens?.toLocaleString() || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tokens
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          输入 Tokens:
                        </Typography>
                        <Typography variant="body1">
                          {tokenStats?.promptTokens?.toLocaleString() || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          输出 Tokens:
                        </Typography>
                        <Typography variant="body1">
                          {tokenStats?.completionTokens?.toLocaleString() || '0'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card elevation={1} sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      今日使用
                    </Typography>
                    <Typography variant="h3" color="secondary" gutterBottom>
                      {tokenStats?.todayTokens?.toLocaleString() || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tokens
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          估算成本:
                        </Typography>
                        <Typography variant="body1">
                          ${tokenStats?.todayCost?.toFixed(4) || '0.0000'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          总成本:
                        </Typography>
                        <Typography variant="body1">
                          ${tokenStats?.totalCost?.toFixed(4) || '0.0000'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </Box>
      </TabPanel>

      {/* 访问码管理标签页 */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ px: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              访问码管理
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              创建访问码
            </Button>
          </Box>

          {/* 访问码列表 */}
          <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <List>
              {accessCodes.length > 0 ? (
                accessCodes.map((code) => (
                  <React.Fragment key={code.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body1" sx={{ mr: 1 }}>
                              {code.code}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(code.code)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              使用次数: {code.currentUses} / {code.maxUses || '无限'}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              {code.allowedModelIds?.length > 0 ? (
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  {Array.isArray(code.allowedModelIds)
                                    ? code.allowedModelIds.map(modelId => {
                                        const model = availableModels.find(m => m.id === modelId);
                                        return (
                                          <Chip
                                            key={modelId}
                                            label={model?.name || modelId}
                                            size="small"
                                            sx={{ mb: 1 }}
                                          />
                                        );
                                      })
                                    : (code.allowedModelIds as unknown as string).split(',').map(modelId => {
                                        const model = availableModels.find(m => m.id === modelId);
                                        return (
                                          <Chip
                                            key={modelId}
                                            label={model?.name || modelId}
                                            size="small"
                                            sx={{ mb: 1 }}
                                          />
                                        );
                                      })
                                  }
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  允许所有模型
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => deleteAccessCode(code.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="暂无访问码"
                    secondary="点击右上角按钮创建新的访问码"
                  />
                </ListItem>
              )}
            </List>
          </Paper>

          {/* 邀请码部分 */}
          <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              邀请码
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={createInviteCode}
            >
              创建邀请码
            </Button>
          </Box>

          {/* 邀请码列表 */}
          <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <List>
              {inviteCodes.length > 0 ? (
                inviteCodes.map((code) => (
                  <React.Fragment key={code.id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body1" sx={{ mr: 1 }}>
                              {code.code}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(code.code)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                            {code.isUsed && (
                              <Chip
                                label="已使用"
                                color="default"
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            创建时间: {new Date(code.createdAt).toLocaleString()}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          edge="end"
                          onClick={() => openDeleteInviteDialog(code.id, code.code)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="暂无邀请码"
                    secondary="点击右上角按钮创建新的邀请码"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Box>
      </TabPanel>

      {/* 模型权限标签页 */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ px: 3 }}>
          <Typography variant="h6" gutterBottom>
            可用模型
          </Typography>

          {availableModels.length > 0 ? (
            <Grid container spacing={2}>
              {availableModels.map((model) => (
                <Grid item xs={12} sm={6} md={4} key={model.id}>
                  <Card elevation={1} sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {model.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        模型ID: {model.modelId}
                      </Typography>
                      <Chip
                        label={model.provider.name}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">
              您没有可用的模型权限，请联系管理员。
            </Alert>
          )}
        </Box>
      </TabPanel>

      {/* 默认模型标签页 */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ px: 3 }}>
          <Typography variant="h6" gutterBottom>
            默认模型设置
          </Typography>

          <Paper elevation={1} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
              选择默认模型
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              选择您想要在每次开始聊天时默认使用的模型
            </Typography>

            <FormControl fullWidth sx={{ mb: 4 }}>
              <InputLabel>默认模型</InputLabel>
              <Select
                value={selectedDefaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                label="默认模型"
              >
                <MenuItem value="">
                  <em>无默认模型</em>
                </MenuItem>
                {availableModels.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.provider.name} - {model.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {selectedDefaultModel ? '当前默认模型已设置' : '未设置默认模型，将使用系统默认模型'}
              </FormHelperText>
            </FormControl>

            <Divider sx={{ my: 4 }} />

            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
              最近使用的模型
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              您最近使用过的模型将显示在这里，点击可设为默认模型
            </Typography>

            {recentModels.length > 0 ? (
              <Box sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {recentModels.map((modelId) => {
                    const model = availableModels.find(m => m.id === modelId);
                    return (
                      <Chip
                        key={modelId}
                        label={model ? `${model.provider.name} - ${model.name}` : modelId}
                        onClick={() => setDefaultModel(modelId)}
                        color={selectedDefaultModel === modelId ? "primary" : "default"}
                        sx={{ mb: 1, mr: 1 }}
                      />
                    );
                  })}
                </Stack>
                <Button
                  size="small"
                  onClick={clearRecentModels}
                  sx={{ mt: 2 }}
                  startIcon={<DeleteIcon />}
                >
                  清除记录
                </Button>
              </Box>
            ) : (
              <Alert severity="info">
                尚无记录。使用模型后会自动记录在这里。
              </Alert>
            )}
          </Paper>

          <Box sx={{ mt: 4 }}>
            <Alert severity="info">
              <AlertTitle>关于默认模型</AlertTitle>
              <Typography variant="body2">
                • 默认模型将在每次新聊天时自动选择<br />
                • 您可以随时在聊天界面更改使用的模型<br />
                • 系统可能会记住您最近使用的模型作为下次的默认选择
              </Typography>
            </Alert>
          </Box>
        </Box>
      </TabPanel>

      {/* 邀请码删除确认对话框 */}
      <Dialog
        open={showDeleteInviteDialog}
        onClose={() => setShowDeleteInviteDialog(false)}
        aria-labelledby="delete-invite-dialog-title"
      >
        <DialogTitle id="delete-invite-dialog-title">
          确认删除邀请码
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            您确定要删除邀请码 <b>{deletingInvite?.code}</b> 吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteInviteDialog(false)} color="primary">
            取消
          </Button>
          <Button
            onClick={handleDeleteInviteCode}
            color="error"
            variant="contained"
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建访问码对话框 */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>创建访问码</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            选择允许访问的模型（不选择则允许所有可用模型）
          </Typography>

          <Grid container spacing={1}>
            {availableModels.map((model) => (
              <Grid item xs={12} sm={6} key={model.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedModelIds.includes(model.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedModelIds([...selectedModelIds, model.id]);
                        } else {
                          setSelectedModelIds(selectedModelIds.filter(id => id !== model.id));
                        }
                      }}
                    />
                  }
                  label={`${model.name} (${model.provider.name})`}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAccessCode}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
