import React, { useState, useEffect, useContext } from 'react'
import {
  Box,
  Typography,
  Paper,
  Tab,
  Tabs,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  InputAdornment,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress,
  Chip,
  TablePagination,
  Alert,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

interface ModelPricing {
  id: string
  modelId: string
  pricingType: 'token' | 'usage'
  inputPrice: number
  outputPrice: number
  usagePrice: number | null
  model: {
    id: string
    modelId: string
    name: string
    providerId: string
    provider: {
      id: string
      name: string
      displayName: string
    }
  }
}

interface UserLimit {
  id: string
  userId: string
  limitType: 'none' | 'token' | 'cost'
  limitPeriod: 'daily' | 'monthly' | 'quarterly' | 'yearly'
  tokenLimit: number | null
  costLimit: number | null
  tokenUsed: number
  lastResetAt: string
  user: {
    id: string
    username: string
    email: string
    role: string
    isActive: boolean
  }
}

interface ModelUsageStats {
  modelId: string
  modelName: string
  providerName: string
  totalTokens: number
  totalCost: number
  messageCount: number
  userCount: number
}

interface UserUsageStats {
  userId: string
  username: string
  role: string
  totalTokens: number
  totalCost: number
  messageCount: number
}

export default function TokenStatsAdmin() {
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<string>('pricing')
  const [isLoading, setIsLoading] = useState<boolean>(true) // 设为true，表示初始加载状态
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modelPricingList, setModelPricingList] = useState<ModelPricing[]>([])
  const [userLimitsList, setUserLimitsList] = useState<UserLimit[]>([])
  const [modelStats, setModelStats] = useState<ModelUsageStats[]>([])
  const [userStats, setUserStats] = useState<UserUsageStats[]>([])
  
  // 日期过滤
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  
  // 编辑对话框状态
  const [editPricingDialog, setEditPricingDialog] = useState<boolean>(false)
  const [editLimitDialog, setEditLimitDialog] = useState<boolean>(false)
  const [currentModel, setCurrentModel] = useState<ModelPricing | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserLimit | null>(null)
  
  // 编辑表单数据
  const [pricingForm, setPricingForm] = useState({
    pricingType: 'token',
    inputPrice: 2.0,
    outputPrice: 8.0,
    usagePrice: 0.0,
  })
  
  const [limitForm, setLimitForm] = useState({
    limitType: 'none',
    limitPeriod: 'monthly',
    tokenLimit: 0,
    costLimit: 0,
    resetUsage: false,
  })

  // 分页
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // 加载数据
  useEffect(() => {
    console.log('TokenStatsAdmin: useEffect triggered. currentUser:', currentUser)
    if (currentUser) {
      loadData()
    } else {
      console.log('TokenStatsAdmin: Waiting for currentUser...')
    }
  }, [currentUser, activeTab])
  
  // 日期过滤变化时重新加载数据
  useEffect(() => {
    if (activeTab === 'models' || activeTab === 'users') {
      loadStatsData()
    }
  }, [startDate, endDate, activeTab])

  const loadData = async () => {
    if (!currentUser || !currentUser.id) return
    setIsLoading(true)
    setLoadError(null)
    
    try {
      if (activeTab === 'pricing') {
        await loadPricingData()
      } else if (activeTab === 'limits') {
        await loadLimitsData()
      } else {
        await loadStatsData()
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('加载数据失败')
      setLoadError('加载数据失败，请刷新重试')
    } finally {
      setIsLoading(false)
    }
  }
  
  const loadPricingData = async () => {
    if (!currentUser || !currentUser.id) return
    
    try {
      console.log('TokenStatsAdmin: Loading pricing data...')
      const response = await fetch(`/api/admin/token-stats?adminUserId=${currentUser.id}&action=pricing`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('TokenStatsAdmin: Pricing data loaded:', data)
        setModelPricingList(data)
        setLoadError(null)
      } else {
        const errorText = await response.text()
        console.error('TokenStatsAdmin: Failed to load pricing data:', response.status, errorText)
        toast.error('加载模型价格数据失败')
        setLoadError(`加载模型价格数据失败 (${response.status}): ${errorText}`)
      }
    } catch (error) {
      console.error('Error loading pricing data:', error)
      toast.error('加载模型价格数据失败')
      setLoadError('加载模型价格数据失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }
  
  const loadLimitsData = async () => {
    if (!currentUser || !currentUser.id) return
    
    try {
      console.log('TokenStatsAdmin: Loading user limits data...')
      const response = await fetch(`/api/admin/token-stats?adminUserId=${currentUser.id}&action=user-limits`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('TokenStatsAdmin: User limits data loaded:', data)
        setUserLimitsList(data)
      } else {
        const errorText = await response.text()
        console.error('TokenStatsAdmin: Failed to load user limits data:', response.status, errorText)
        toast.error('加载用户限制数据失败')
      }
    } catch (error) {
      console.error('Error loading user limits data:', error)
      toast.error('加载用户限制数据失败')
    }
  }
  
  const loadStatsData = async () => {
    if (!currentUser || !currentUser.id) return
    
    try {
      console.log('TokenStatsAdmin: Loading stats data for tab:', activeTab)
      const dateParams = new URLSearchParams()
      if (startDate) dateParams.append('startDate', startDate.toISOString())
      if (endDate) dateParams.append('endDate', endDate.toISOString())
      
      const action = activeTab === 'models' ? 'models' : 'users'
      const url = `/api/admin/token-stats?adminUserId=${currentUser.id}&action=${action}&${dateParams.toString()}`
      console.log('TokenStatsAdmin: Fetching from URL:', url)
      
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`${action} stats data loaded:`, data)
        if (action === 'models') {
          setModelStats(data)
        } else {
          setUserStats(data)
        }
      } else {
        const errorText = await response.text()
        console.error('TokenStatsAdmin: Failed to load stats data:', response.status, errorText)
        toast.error('加载统计数据失败')
      }
    } catch (error) {
      console.error('TokenStatsAdmin: Error loading stats data:', error)
      toast.error('加载统计数据失败')
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue)
  }
  
  const handleEditPricing = (model: ModelPricing) => {
    setCurrentModel(model)
    setPricingForm({
      pricingType: model.pricingType,
      inputPrice: model.inputPrice,
      outputPrice: model.outputPrice,
      usagePrice: model.usagePrice || 0,
    })
    setEditPricingDialog(true)
  }
  
  const handleSavePricing = async () => {
    if (!currentUser || !currentUser.id || !currentModel) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/models/${currentModel.modelId}/pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          ...pricingForm,
        }),
      })
      
      if (response.ok) {
        toast.success('价格设置已保存')
        setEditPricingDialog(false)
        loadPricingData()
      } else {
        const error = await response.json()
        toast.error(`保存失败: ${error.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Error saving pricing:', error)
      toast.error('保存价格设置失败')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleEditLimit = (user: UserLimit | null, userId?: string) => {
    if (user) {
      setSelectedUser(user)
      setLimitForm({
        limitType: user.limitType || 'none',
        limitPeriod: user.limitPeriod || 'monthly',
        tokenLimit: user.tokenLimit || 0,
        costLimit: user.costLimit || 0,
        resetUsage: false,
      })
    } else if (userId) {
      setSelectedUser({ userId } as UserLimit)
      setLimitForm({
        limitType: 'none',
        limitPeriod: 'monthly',
        tokenLimit: 0,
        costLimit: 0,
        resetUsage: false,
      })
    }
    setEditLimitDialog(true)
  }
  
  const handleSaveLimit = async () => {
    if (!currentUser || !currentUser.id || !selectedUser) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.userId}/limits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminUserId: currentUser.id,
          ...limitForm,
        }),
      });
      
      if (response.ok) {
        toast.success('用户限制已保存')
        setEditLimitDialog(false)
        loadLimitsData()
      } else {
        const error = await response.json()
        toast.error(`保存失败: ${error.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Error saving user limits:', error)
      toast.error('保存用户限制失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }
  
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          Token 统计与价格设置
        </Typography>
        
        <Paper sx={{ mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab value="pricing" label="模型价格设置" />
            <Tab value="limits" label="用户使用限制" />
            <Tab value="models" label="模型使用统计" />
            <Tab value="users" label="用户使用统计" />
          </Tabs>
        </Paper>
        
        <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {(activeTab === 'models' || activeTab === 'users') && (
              <>
                <DatePicker
                  label="开始日期"
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  slotProps={{ textField: { size: 'small' } }}
                />
                <DatePicker
                  label="结束日期"
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  slotProps={{ textField: { size: 'small' } }}
                />
              </>
            )}
          </Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={loadData}
            disabled={isLoading}
          >
            {isLoading ? '加载中...' : '刷新数据'}
          </Button>
        </Paper>
        
        {loadError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {loadError}
          </Alert>
        )}
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* 模型价格设置 */}
            {activeTab === 'pricing' && (
              <>
                {modelPricingList.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    没有找到模型价格数据。
                  </Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>提供商</TableCell>
                          <TableCell>模型</TableCell>
                          <TableCell>计价类型</TableCell>
                          <TableCell>输入价格</TableCell>
                          <TableCell>输出价格</TableCell>
                          <TableCell>操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {modelPricingList.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.model.provider.displayName}</TableCell>
                            <TableCell>{item.model.name}</TableCell>
                            <TableCell>
                              {item.pricingType === 'token' ? '按Token计费' : '按次计费'}
                            </TableCell>
                            <TableCell>
                              {item.pricingType === 'token' 
                                ? `$${item.inputPrice.toFixed(2)}/1M` 
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {item.pricingType === 'token' 
                                ? `$${item.outputPrice.toFixed(2)}/1M` 
                                : `$${item.usagePrice?.toFixed(4)}/次`}
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditPricing(item)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
            
            {/* 用户使用限制 */}
            {activeTab === 'limits' && (
              <>
                {userLimitsList.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    没有找到用户限制数据。
                  </Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>用户名</TableCell>
                          <TableCell>角色</TableCell>
                          <TableCell>限制类型</TableCell>
                          <TableCell>限制周期</TableCell>
                          <TableCell>Token限制</TableCell>
                          <TableCell>成本限制</TableCell>
                          <TableCell>已使用</TableCell>
                          <TableCell>上次重置</TableCell>
                          <TableCell>操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {userLimitsList.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.user.username}</TableCell>
                            <TableCell>{item.user.role}</TableCell>
                            <TableCell>
                              {item.limitType === 'token' ? 'Token限制' : 
                               item.limitType === 'cost' ? '成本限制' : '无限制'}
                            </TableCell>
                            <TableCell>
                              {item.limitPeriod === 'daily' ? '每日' :
                               item.limitPeriod === 'monthly' ? '每月' :
                               item.limitPeriod === 'quarterly' ? '每季度' : '每年'}
                            </TableCell>
                            <TableCell>
                              {item.limitType === 'token' ? 
                                item.tokenLimit?.toLocaleString() : '-'}
                            </TableCell>
                            <TableCell>
                              {item.limitType === 'cost' ? 
                                `$${item.costLimit?.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>
                              {item.limitType === 'token' ? 
                                `${item.tokenUsed.toLocaleString()} tokens` : 
                                '-'}
                            </TableCell>
                            <TableCell>
                              {new Date(item.lastResetAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditLimit(item)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
            
            {/* 模型使用统计 */}
            {activeTab === 'models' && (
              <>
                {modelStats.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    在选定时间范围内没有模型使用数据。
                  </Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>提供商</TableCell>
                          <TableCell>模型</TableCell>
                          <TableCell align="right">使用量 (tokens)</TableCell>
                          <TableCell align="right">成本 (USD)</TableCell>
                          <TableCell align="right">消息数</TableCell>
                          <TableCell align="right">用户数</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {modelStats
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((item) => (
                            <TableRow key={item.modelId}>
                              <TableCell>{item.providerName}</TableCell>
                              <TableCell>{item.modelName}</TableCell>
                              <TableCell align="right">{item.totalTokens.toLocaleString()}</TableCell>
                              <TableCell align="right">${item.totalCost.toFixed(4)}</TableCell>
                              <TableCell align="right">{item.messageCount.toLocaleString()}</TableCell>
                              <TableCell align="right">{item.userCount}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25, 50]}
                      component="div"
                      count={modelStats.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                  </TableContainer>
                )}
              </>
            )}
            
            {/* 用户使用统计 */}
            {activeTab === 'users' && (
              <>
                {userStats.length === 0 ? (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    在选定时间范围内没有用户使用数据。
                  </Alert>
                ) : (
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>用户名</TableCell>
                          <TableCell>角色</TableCell>
                          <TableCell align="right">使用量 (tokens)</TableCell>
                          <TableCell align="right">成本 (USD)</TableCell>
                          <TableCell align="right">消息数</TableCell>
                          <TableCell>操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {userStats
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((item) => (
                            <TableRow key={item.userId}>
                              <TableCell>{item.username}</TableCell>
                              <TableCell>{item.role}</TableCell>
                              <TableCell align="right">{item.totalTokens.toLocaleString()}</TableCell>
                              <TableCell align="right">${item.totalCost.toFixed(4)}</TableCell>
                              <TableCell align="right">{item.messageCount.toLocaleString()}</TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleEditLimit(null, item.userId)}
                                >
                                  设置限制
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 25, 50]}
                      component="div"
                      count={userStats.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                  </TableContainer>
                )}
              </>
            )}
          </>
        )}
        
        {/* 编辑模型价格对话框 */}
        <Dialog
          open={editPricingDialog}
          onClose={() => setEditPricingDialog(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {currentModel ? `编辑价格: ${currentModel.model.name}` : '添加模型价格'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <RadioGroup
                  name="pricingType"
                  value={pricingForm.pricingType}
                  onChange={(e) => setPricingForm({...pricingForm, pricingType: e.target.value as 'token' | 'usage'})}
                  row
                >
                  <FormControlLabel value="token" control={<Radio />} label="按Token计费" />
                  <FormControlLabel value="usage" control={<Radio />} label="按次计费" />
                </RadioGroup>
              </FormControl>
              
              {pricingForm.pricingType === 'token' ? (
                <>
                  <TextField
                    fullWidth
                    margin="dense"
                    label="输入价格 (USD/1M tokens)"
                    type="number"
                    value={pricingForm.inputPrice}
                    onChange={(e) => setPricingForm({...pricingForm, inputPrice: parseFloat(e.target.value)})}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    sx={{ mb: 2 }}
                  />
                  
                  <TextField
                    fullWidth
                    margin="dense"
                    label="输出价格 (USD/1M tokens)"
                    type="number"
                    value={pricingForm.outputPrice}
                    onChange={(e) => setPricingForm({...pricingForm, outputPrice: parseFloat(e.target.value)})}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </>
              ) : (
                <TextField
                  fullWidth
                  margin="dense"
                  label="使用价格 (每次调用)"
                  type="number"
                  value={pricingForm.usagePrice}
                  onChange={(e) => setPricingForm({...pricingForm, usagePrice: parseFloat(e.target.value)})}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditPricingDialog(false)}>取消</Button>
            <Button 
              onClick={handleSavePricing} 
              variant="contained" 
              color="primary"
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : '保存'}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* 编辑用户限制对话框 */}
        <Dialog
          open={editLimitDialog}
          onClose={() => setEditLimitDialog(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            编辑用户限制
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>限制类型</InputLabel>
                <Select
                  value={limitForm.limitType}
                  label="限制类型"
                  onChange={(e) => setLimitForm({...limitForm, limitType: e.target.value as 'none' | 'token' | 'cost'})}
                >
                  <MenuItem value="none">无限制</MenuItem>
                  <MenuItem value="token">按Token限制</MenuItem>
                  <MenuItem value="cost">按成本限制</MenuItem>
                </Select>
              </FormControl>
              
              {limitForm.limitType !== 'none' && (
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>限制周期</InputLabel>
                  <Select
                    value={limitForm.limitPeriod}
                    label="限制周期"
                    onChange={(e) => setLimitForm({...limitForm, limitPeriod: e.target.value as 'daily' | 'monthly' | 'quarterly' | 'yearly'})}
                  >
                    <MenuItem value="daily">每日</MenuItem>
                    <MenuItem value="monthly">每月</MenuItem>
                    <MenuItem value="quarterly">每季度</MenuItem>
                    <MenuItem value="yearly">每年</MenuItem>
                  </Select>
                </FormControl>
              )}
              
              {limitForm.limitType === 'token' && (
                <TextField
                  fullWidth
                  margin="dense"
                  label="Token限制"
                  type="number"
                  value={limitForm.tokenLimit}
                  onChange={(e) => setLimitForm({...limitForm, tokenLimit: parseInt(e.target.value)})}
                  sx={{ mb: 2 }}
                />
              )}
              
              {limitForm.limitType === 'cost' && (
                <TextField
                  fullWidth
                  margin="dense"
                  label="成本限制 (USD)"
                  type="number"
                  value={limitForm.costLimit}
                  onChange={(e) => setLimitForm({...limitForm, costLimit: parseFloat(e.target.value)})}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  sx={{ mb: 2 }}
                />
              )}
              
              <FormControlLabel
                control={
                  <Radio
                    checked={limitForm.resetUsage}
                    onChange={(e) => setLimitForm({...limitForm, resetUsage: e.target.checked})}
                  />
                }
                label="立即重置使用量计数"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditLimitDialog(false)}>取消</Button>
            <Button 
              onClick={handleSaveLimit} 
              variant="contained" 
              color="primary"
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : '保存'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  )
} 