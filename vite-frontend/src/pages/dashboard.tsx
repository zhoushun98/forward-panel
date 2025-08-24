import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@heroui/modal";
import { useState, useEffect } from "react";
import toast from 'react-hot-toast';

import AdminLayout from "@/layouts/admin";
import { getUserPackageInfo } from "@/api";

interface UserInfo {
  flow: number;
  inFlow: number;
  outFlow: number;
  num: number;
  expTime?: string;
  flowResetTime?: number;
}

interface UserTunnel {
  id: number;
  tunnelId: number;
  tunnelName: string;
  flow: number;
  inFlow: number;
  outFlow: number;
  num: number;
  expTime?: string;
  flowResetTime?: number;
  tunnelFlow: number;
}

interface Forward {
  id: number;
  name: string;
  tunnelId: number;
  tunnelName: string;
  inIp: string;
  inPort: number;
  remoteAddr: string;
  inFlow: number;
  outFlow: number;
}

interface AddressItem {
  id: number;
  ip: string;
  address: string;
  copying: boolean;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo>({} as UserInfo);
  const [userTunnels, setUserTunnels] = useState<UserTunnel[]>([]);
  const [forwardList, setForwardList] = useState<Forward[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressModalTitle, setAddressModalTitle] = useState('');
  const [addressList, setAddressList] = useState<AddressItem[]>([]);

  // 检查有效期通知
  const checkExpirationNotifications = (userInfo: UserInfo, tunnels: UserTunnel[]) => {
    // 避免重复通知，检查是否已经显示过
    const notificationKey = `expiration-${userInfo.expTime}-${tunnels.map(t => t.expTime).join(',')}`;
    const lastNotified = localStorage.getItem('lastNotified');
    
    if (lastNotified === notificationKey) {
      return; // 已经通知过，不重复显示
    }
    
    let hasNotification = false;
    
    // 检查主账户有效期
    if (userInfo.expTime) {
      const expDate = new Date(userInfo.expTime);
      const now = new Date();
      
      if (!isNaN(expDate.getTime()) && expDate > now) {
        const diffTime = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7 && diffDays > 0) {
          hasNotification = true;
          if (diffDays === 1) {
            toast('账户将于明天过期，请及时续费', { 
              icon: '⚠️',
              duration: 6000,
              style: { background: '#f59e0b', color: '#fff' }
            });
          } else {
            toast(`账户将于${diffDays}天后过期，请及时续费`, { 
              icon: '⚠️',
              duration: 6000,
              style: { background: '#f59e0b', color: '#fff' }
            });
          }
        } else if (diffDays <= 0) {
          hasNotification = true;
          toast('账户已过期，请立即续费', { 
            icon: '⚠️',
            duration: 8000,
            style: { background: '#ef4444', color: '#fff' }
          });
        }
      }
    }
    
    // 检查隧道有效期
    tunnels.forEach(tunnel => {
      if (tunnel.expTime) {
        const expDate = new Date(tunnel.expTime);
        const now = new Date();
        
        if (!isNaN(expDate.getTime()) && expDate > now) {
          const diffTime = expDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 7 && diffDays > 0) {
            hasNotification = true;
            if (diffDays === 1) {
              toast(`隧道"${tunnel.tunnelName}"将于明天过期`, { 
                icon: '⚠️',
                duration: 5000,
                style: { background: '#f59e0b', color: '#fff' }
              });
            } else {
              toast(`隧道"${tunnel.tunnelName}"将于${diffDays}天后过期`, { 
                icon: '⚠️',
                duration: 5000,
                style: { background: '#f59e0b', color: '#fff' }
              });
            }
          } else if (diffDays <= 0) {
            hasNotification = true;
            toast(`隧道"${tunnel.tunnelName}"已过期`, { 
              icon: '⚠️',
              duration: 6000,
              style: { background: '#ef4444', color: '#fff' }
            });
          }
        }
      }
    });
    
    // 如果显示了通知，记录防止重复
    if (hasNotification) {
      localStorage.setItem('lastNotified', notificationKey);
    }
  };

  useEffect(() => {
    // 重置状态并加载数据，防止页面切换时显示旧数据
    setLoading(true);
    setUserInfo({} as UserInfo);
    setUserTunnels([]);
    setForwardList([]);

    // 检查用户是否是管理员
    const adminStatus = localStorage.getItem('admin');
    setIsAdmin(adminStatus === 'true');
    
    loadPackageData();
    localStorage.setItem('e', '/dashboard');
  }, []);

  const loadPackageData = async () => {
    setLoading(true);
    try {
      const res = await getUserPackageInfo();
      if (res.code === 0) {
        const data = res.data;
        setUserInfo(data.userInfo || {});
        setUserTunnels(data.tunnelPermissions || []);
        setForwardList(data.forwards || []);
        
        // 检查有效期并显示通知
        checkExpirationNotifications(data.userInfo, data.tunnelPermissions || []);
      } else {
        toast.error(res.msg || '获取套餐信息失败');
      }
    } catch (error) {
      console.error('获取套餐信息失败:', error);
      toast.error('获取套餐信息失败');
    } finally {
      setLoading(false);
    }
  };

  const formatFlow = (value: number, unit: string = 'bytes'): string => {
    // 99999 表示无限制
    if (value === 99999) {
      return '无限制';
    }
    
    if (unit === 'gb') {
      return value + ' GB';
    } else {
      if (value === 0) return '0 B';
      if (value < 1024) return value + ' B';
      if (value < 1024 * 1024) return (value / 1024).toFixed(2) + ' KB';
      if (value < 1024 * 1024 * 1024) return (value / (1024 * 1024)).toFixed(2) + ' MB';
      return (value / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
  };

  const formatNumber = (value: number): string => {
    // 99999 表示无限制
    if (value === 99999) {
      return '无限制';
    }
    return value.toString();
  };

  const getExpStatus = (expTime?: string) => {
    if (!expTime) return { 
      color: 'text-green-600 dark:text-green-400', 
      bg: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20',
      text: '永久' 
    };

    const now = new Date();
    const expDate = new Date(expTime);

    if (isNaN(expDate.getTime())) {
      return { 
        color: 'text-gray-600 dark:text-gray-400', 
        bg: 'bg-gray-50 dark:bg-black/10 border-gray-200 dark:border-gray-500/20',
        text: '无效' 
      };
    }

    if (expDate < now) {
      return { 
        color: 'text-red-600 dark:text-red-400', 
        bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
        text: '已过期' 
      };
    }

    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
      return { 
        color: 'text-red-600 dark:text-red-400', 
        bg: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
        text: `${diffDays}天后过期` 
      };
    } else if (diffDays <= 30) {
      return { 
        color: 'text-orange-600 dark:text-orange-400', 
        bg: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20',
        text: `${diffDays}天后过期` 
      };
    } else {
      return { 
        color: 'text-green-600 dark:text-green-400', 
        bg: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20',
        text: `${diffDays}天后过期` 
      };
    }
  };

  const calculateUserTotalUsedFlow = (): number => {
    // 后端已按计费类型处理流量，前端直接使用入站+出站总和
    return (userInfo.inFlow || 0) + (userInfo.outFlow || 0);
  };

  const calculateUsagePercentage = (type: 'flow' | 'forwards'): number => {
    if (type === 'flow') {
      const totalUsed = calculateUserTotalUsedFlow();
      const totalLimit = (userInfo.flow || 0) * 1024 * 1024 * 1024;
      // 无限制时返回0%
      if (userInfo.flow === 99999) return 0;
      return totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 100) : 0;
    } else if (type === 'forwards') {
      const totalUsed = forwardList.length;
      const totalLimit = userInfo.num || 0;
      // 无限制时返回0%
      if (userInfo.num === 99999) return 0;
      return totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 100) : 0;
    }
    return 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500 dark:bg-red-600';
    if (percentage >= 70) return 'bg-orange-500 dark:bg-orange-600';
    return 'bg-blue-500 dark:bg-blue-600';
  };

  const renderProgressBar = (percentage: number, size: 'sm' | 'md' = 'md', isUnlimited: boolean = false) => {
    const height = size === 'sm' ? 'h-1.5' : 'h-2';
    
    if (isUnlimited) {
      return (
        <div className="w-full">
          <div className={`w-full bg-gradient-to-r from-blue-200 to-purple-200 dark:from-blue-500/30 dark:to-purple-500/30 rounded-full ${height}`}>
            <div className={`${height} bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-full opacity-60`}></div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="w-full">
        <div className={`w-full bg-gray-200 dark:bg-gray-800 rounded-full ${height}`}>
          <div 
            className={`${height} rounded-full transition-all duration-300 ${getUsageColor(percentage)}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const calculateTunnelUsedFlow = (tunnel: UserTunnel): number => {
    if (!tunnel) return 0;
    const inFlow = tunnel.inFlow || 0;
    const outFlow = tunnel.outFlow || 0;
    // 后端已按计费类型处理流量，前端直接使用入站+出站总和
    return inFlow + outFlow;
  };

  const calculateTunnelFlowPercentage = (tunnel: UserTunnel): number => {
    const totalUsed = calculateTunnelUsedFlow(tunnel);
    const totalLimit = (tunnel.flow || 0) * 1024 * 1024 * 1024;
    // 无限制时返回0%
    if (tunnel.flow === 99999) return 0;
    return totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 100) : 0;
  };

  const getTunnelUsedForwards = (tunnelId: number): number => {
    return forwardList.filter(forward => forward.tunnelId === tunnelId).length;
  };

  const calculateTunnelForwardPercentage = (tunnel: UserTunnel): number => {
    const totalUsed = getTunnelUsedForwards(tunnel.tunnelId);
    const totalLimit = tunnel.num || 0;
    // 无限制时返回0%
    if (tunnel.num === 99999) return 0;
    return totalLimit > 0 ? Math.min((totalUsed / totalLimit) * 100, 100) : 0;
  };

  const formatResetTime = (resetDay?: number): string => {
    if (resetDay === undefined || resetDay === null) return '';
    if (resetDay === 0) return '不重置';
    
    const now = new Date();
    const currentDay = now.getDate();
    
    let daysUntilReset;
    if (resetDay > currentDay) {
      daysUntilReset = resetDay - currentDay;
    } else if (resetDay < currentDay) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
      const diffTime = nextMonth.getTime() - now.getTime();
      daysUntilReset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } else {
      daysUntilReset = 0;
    }
    
    if (daysUntilReset === 0) {
      return '今日重置';
    } else if (daysUntilReset === 1) {
      return '明日重置';
    } else {
      return `${daysUntilReset}天后重置`;
    }
  };

  const groupedForwards = () => {
    const groups: { [key: string]: { tunnelName: string; forwards: Forward[] } } = {};
    forwardList.forEach(forward => {
      const tunnelName = forward.tunnelName || '未知隧道';
      if (!groups[tunnelName]) {
        groups[tunnelName] = {
          tunnelName,
          forwards: []
        };
      }
      groups[tunnelName].forwards.push(forward);
    });
    return Object.values(groups);
  };

  const formatInAddress = (ipString: string, port: number): string => {
    if (!ipString || !port) return '';
    
    const ips = ipString.split(',').map(ip => ip.trim()).filter(ip => ip);
    
    if (ips.length === 0) return '';
    
    if (ips.length === 1) {
      const ip = ips[0];
      if (ip.includes(':') && !ip.startsWith('[')) {
        return `[${ip}]:${port}`;
      } else {
        return `${ip}:${port}`;
      }
    }
    
    const firstIp = ips[0];
    let formattedFirstIp;
    
    if (firstIp.includes(':') && !firstIp.startsWith('[')) {
      formattedFirstIp = `[${firstIp}]`;
    } else {
      formattedFirstIp = firstIp;
    }
    
    return `${formattedFirstIp}:${port} (+${ips.length - 1})`;
  };

  const formatRemoteAddress = (remoteAddr: string): string => {
    if (!remoteAddr) return '';
    
    const addresses = remoteAddr.split(',').map(addr => addr.trim()).filter(addr => addr);
    
    if (addresses.length === 0) return '';
    
    if (addresses.length === 1) {
      return addresses[0];
    }
    
    return `${addresses[0]} (+${addresses.length - 1})`;
  };

  const hasMultipleIps = (ipString: string): boolean => {
    if (!ipString) return false;
    const ips = ipString.split(',').map(ip => ip.trim()).filter(ip => ip);
    return ips.length > 1;
  };

  const hasMultipleRemoteAddresses = (remoteAddr: string): boolean => {
    if (!remoteAddr) return false;
    const addresses = remoteAddr.split(',').map(addr => addr.trim()).filter(addr => addr);
    return addresses.length > 1;
  };

  const showAddressModal = (ipString: string, port: number, title: string) => {
    if (!ipString || !port) return;
    
    const ips = ipString.split(',').map(ip => ip.trim()).filter(ip => ip);
    
    if (ips.length <= 1) {
              copyToClipboard(formatInAddress(ipString, port));
      return;
    }
    
    const formattedList = ips.map((ip, index) => {
      let formattedAddress;
      if (ip.includes(':') && !ip.startsWith('[')) {
        formattedAddress = `[${ip}]:${port}`;
      } else {
        formattedAddress = `${ip}:${port}`;
      }
      return {
        id: index,
        ip: ip,
        address: formattedAddress,
        copying: false
      };
    });
    
    setAddressList(formattedList);
    setAddressModalTitle(`${title} (${ips.length}个)`);
    setAddressModalOpen(true);
  };

  const showRemoteAddressModal = (remoteAddr: string, title: string) => {
    if (!remoteAddr) return;
    
    const addresses = remoteAddr.split(',').map(addr => addr.trim()).filter(addr => addr);
    
    if (addresses.length <= 1) {
              copyToClipboard(remoteAddr);
      return;
    }
    
    const formattedList = addresses.map((address, index) => {
      return {
        id: index,
        ip: address,
        address: address,
        copying: false
      };
    });
    
    setAddressList(formattedList);
    setAddressModalTitle(`${title} (${addresses.length}个)`);
    setAddressModalOpen(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`已复制`);
    } catch (error) {
      toast.error('复制失败');
    }
  };

  const copyAddress = async (addressItem: AddressItem) => {
    try {
      setAddressList(prev => prev.map(item => 
        item.id === addressItem.id ? { ...item, copying: true } : item
      ));
      await copyToClipboard(addressItem.address);
    } catch (error) {
      toast.error('复制失败');
    } finally {
      setAddressList(prev => prev.map(item => 
        item.id === addressItem.id ? { ...item, copying: false } : item
      ));
    }
  };

  const copyAllAddresses = async () => {
    if (addressList.length === 0) return;
    const allAddresses = addressList.map(item => item.address).join('\n');
    await copyToClipboard(allAddresses);
  };

  const calculateForwardBillingFlow = (forward: Forward): number => {
    if (!forward) return 0;
    
    const inFlow = forward.inFlow || 0;
    const outFlow = forward.outFlow || 0;
    
    // 后端已按计费类型处理流量，前端直接使用入站+出站总和
    return inFlow + outFlow;
  };

      if (loading) {
      return (
        <AdminLayout>
          <div className="px-3 lg:px-6 flex-grow pt-2 lg:pt-4">
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="text-default-600">正在加载数据...</span>
              </div>
            </div>
          </div>
        </AdminLayout>
      );
    }

      return (
      <AdminLayout>
        <div className="px-3 lg:px-6 py-2 lg:py-4">

                          {/* 响应式统计卡片 */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6 lg:mb-8">
           <Card className="border border-gray-200 dark:border-default-200 shadow-md hover:shadow-lg transition-shadow">
             <CardBody className="p-3 lg:p-4">
               <div className="flex flex-col space-y-2">
                 <div className="flex items-center justify-between">
                   <p className="text-xs lg:text-sm text-default-600 truncate">总流量</p>
                   <div className="p-1.5 lg:p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex-shrink-0">
                     <svg className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                       <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                     </svg>
                   </div>
                 </div>
                 <p className="text-base lg:text-xl font-bold text-foreground truncate">{formatFlow(userInfo.flow, 'gb')}</p>
               </div>
             </CardBody>
           </Card>

           <Card className="border border-gray-200 dark:border-default-200 shadow-md hover:shadow-lg transition-shadow">
             <CardBody className="p-3 lg:p-4">
               <div className="flex flex-col space-y-2">
                 <div className="flex items-center justify-between">
                   <p className="text-xs lg:text-sm text-default-600 truncate">已用流量</p>
                   <div className="p-1.5 lg:p-2 bg-green-100 dark:bg-green-500/20 rounded-lg flex-shrink-0">
                     <svg className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                     </svg>
                   </div>
                 </div>
                 <p className="text-base lg:text-xl font-bold text-foreground truncate">{formatFlow(calculateUserTotalUsedFlow())}</p>
                 <div className="mt-1">
                   {renderProgressBar(calculateUsagePercentage('flow'), 'sm', userInfo.flow === 99999)}
                   <div className="flex items-center justify-between mt-1">
                     <p className="text-xs text-default-500 truncate">
                       {userInfo.flow === 99999 ? '无限制' : `${calculateUsagePercentage('flow').toFixed(1)}%`}
                     </p>
                     {(userInfo.flowResetTime !== undefined && userInfo.flowResetTime !== null) && (
                       <div className="text-xs text-default-500 flex items-center gap-1">
                         <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                         </svg>
                         <span className="truncate">{formatResetTime(userInfo.flowResetTime)}</span>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             </CardBody>
           </Card>

           <Card className="border border-gray-200 dark:border-default-200 shadow-md hover:shadow-lg transition-shadow">
             <CardBody className="p-3 lg:p-4">
               <div className="flex flex-col space-y-2">
                 <div className="flex items-center justify-between">
                   <p className="text-xs lg:text-sm text-default-600 truncate">转发配额</p>
                   <div className="p-1.5 lg:p-2 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex-shrink-0">
                     <svg className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                     </svg>
                   </div>
                 </div>
                 <p className="text-base lg:text-xl font-bold text-foreground truncate">{formatNumber(userInfo.num || 0)}</p>
               </div>
             </CardBody>
           </Card>

           <Card className="border border-gray-200 dark:border-default-200 shadow-md hover:shadow-lg transition-shadow">
             <CardBody className="p-3 lg:p-4">
               <div className="flex flex-col space-y-2">
                 <div className="flex items-center justify-between">
                   <p className="text-xs lg:text-sm text-default-600 truncate">已用转发</p>
                   <div className="p-1.5 lg:p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex-shrink-0">
                     <svg className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                       <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                     </svg>
                   </div>
                 </div>
                 <p className="text-base lg:text-xl font-bold text-foreground truncate">{forwardList.length}</p>
                 <div className="mt-1">
                   {renderProgressBar(calculateUsagePercentage('forwards'), 'sm', userInfo.num === 99999)}
                   <p className="text-xs text-default-500 mt-1 truncate">
                     {userInfo.num === 99999 ? '无限制' : `${calculateUsagePercentage('forwards').toFixed(1)}%`}
                   </p>
                 </div>
               </div>
             </CardBody>
           </Card>
         </div>

          {/* 隧道权限 - 管理员不显示 */}
          {!isAdmin && (
         <Card className="mb-6 lg:mb-8 border border-gray-200 dark:border-default-200 shadow-md">
           <CardHeader className="pb-3">
             <div className="flex items-center gap-2">
               <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
               </svg>
               <h2 className="text-lg lg:text-xl font-semibold text-foreground">隧道权限</h2>
               <span className="px-2 py-1 bg-default-100 dark:bg-default-50 text-default-600 rounded-full text-xs">
                 {userTunnels.length}
               </span>
             </div>
           </CardHeader>
           <CardBody className="pt-0">
            {userTunnels.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-default-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-default-500">暂无隧道权限</p>
              </div>
            ) : (
                             <div className="space-y-3">
                 {userTunnels.map((tunnel) => {
                   const tunnelExpStatus = getExpStatus(tunnel.expTime);
                   return (
                     <div key={tunnel.id} className="border border-gray-200 dark:border-default-100 rounded-lg p-3 lg:p-4 hover:shadow-md transition-shadow">
                       <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                         <div>
                           <h3 className="font-semibold text-foreground">{tunnel.tunnelName} ID: {tunnel.id}</h3>
                           <div className="flex flex-wrap items-center gap-2 mt-1">
                             <span className={`px-2 py-1 rounded-md text-xs font-medium ${tunnel.tunnelFlow === 1 ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300'}`}>
                               {tunnel.tunnelFlow === 1 ? '单向计费' : '双向计费'}
                             </span>
                             <span className={`px-2 py-1 rounded-md text-xs font-medium border ${tunnelExpStatus.bg} ${tunnelExpStatus.color}`}>
                               {tunnelExpStatus.text}
                             </span>
                             {(tunnel.flowResetTime !== undefined && tunnel.flowResetTime !== null) && (
                               <span className="text-xs text-default-500">
                                 {formatResetTime(tunnel.flowResetTime)}
                               </span>
                             )}
                           </div>
                         </div>
                       </div>
                       
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                         <div>
                           <p className="text-sm text-default-600 mb-1">流量配额</p>
                           <p className="font-semibold text-foreground">{formatFlow(tunnel.flow, 'gb')}</p>
                         </div>
                         <div>
                           <p className="text-sm text-default-600 mb-1">已用流量</p>
                           <p className="font-semibold text-foreground">{formatFlow(calculateTunnelUsedFlow(tunnel))}</p>
                           <div className="mt-1">
                             {renderProgressBar(calculateTunnelFlowPercentage(tunnel), 'sm', tunnel.flow === 99999)}
                           </div>
                         </div>
                         <div>
                           <p className="text-sm text-default-600 mb-1">转发配额</p>
                           <p className="font-semibold text-foreground">{formatNumber(tunnel.num)}</p>
                         </div>
                         <div>
                           <p className="text-sm text-default-600 mb-1">已用转发</p>
                           <p className="font-semibold text-foreground">{getTunnelUsedForwards(tunnel.tunnelId)}</p>
                           <div className="mt-1">
                             {renderProgressBar(calculateTunnelForwardPercentage(tunnel), 'sm', tunnel.num === 99999)}
                           </div>
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
            )}
          </CardBody>
        </Card>
          )}

                 {/* 转发配置 */}
         <Card className="border border-gray-200 dark:border-default-200 shadow-md">
           <CardHeader className="pb-3">
             <div className="flex items-center gap-2">
               <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
               </svg>
               <h2 className="text-lg lg:text-xl font-semibold text-foreground">转发配置</h2>
               <span className="px-2 py-1 bg-default-100 dark:bg-default-50 text-default-600 rounded-full text-xs">
                 {forwardList.length}
               </span>
             </div>
           </CardHeader>
           <CardBody className="pt-0">
            {groupedForwards().length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-default-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
                <p className="text-default-500">暂无转发配置</p>
              </div>
            ) : (
                             <div className="space-y-4">
                 {groupedForwards().map((group) => (
                   <div key={group.tunnelName} className="border border-gray-200 dark:border-default-100 rounded-lg p-3 lg:p-4">
                     <div className="flex items-center justify-between mb-3">
                       <h3 className="font-semibold text-foreground">{group.tunnelName}</h3>
                       <span className="px-2 py-1 bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 rounded-md text-sm">
                         {group.forwards.length} 个转发
                       </span>
                     </div>
                     
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                       {group.forwards.map((forward) => (
                         <div key={forward.id} className="bg-white dark:bg-default-100/50 border border-gray-200 dark:border-default-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-medium text-foreground text-sm mb-2 truncate">{forward.name}</h4>
                              <div className="space-y-1">
                                <code 
                                  className={`block px-2 py-1 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 rounded font-mono text-xs truncate ${hasMultipleIps(forward.inIp) ? 'cursor-pointer hover:bg-green-200 dark:hover:bg-green-500/30' : ''}`}
                                  onClick={() => hasMultipleIps(forward.inIp) && showAddressModal(forward.inIp, forward.inPort, '入口地址')}
                                  title={formatInAddress(forward.inIp, forward.inPort)}
                                >
                                  {formatInAddress(forward.inIp, forward.inPort)}
                                </code>
                                <div className="text-center text-default-400 text-xs">↓</div>
                                <code 
                                  className={`block px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded font-mono text-xs truncate ${hasMultipleRemoteAddresses(forward.remoteAddr) ? 'cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-500/30' : ''}`}
                                  onClick={() => hasMultipleRemoteAddresses(forward.remoteAddr) && showRemoteAddressModal(forward.remoteAddr, '出口地址')}
                                  title={formatRemoteAddress(forward.remoteAddr)}
                                >
                                  {formatRemoteAddress(forward.remoteAddr)}
                                </code>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t border-gray-200 dark:border-default-200">
                              <div className="grid grid-cols-3 gap-1 text-xs">
                                <div className="text-center">
                                  <div className="text-default-500 mb-1">上传</div>
                                  <div className="font-medium text-green-600 dark:text-green-400 truncate">{formatFlow(forward.inFlow || 0)}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-default-500 mb-1">下载</div>
                                  <div className="font-medium text-orange-600 dark:text-orange-400 truncate">{formatFlow(forward.outFlow || 0)}</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-default-500 mb-1">计费</div>
                                  <div className="font-medium text-primary truncate">{formatFlow(calculateForwardBillingFlow(forward))}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* 地址列表弹窗 */}
        <Modal isOpen={addressModalOpen} onClose={() => setAddressModalOpen(false)} size="lg">
          <ModalContent>
            <ModalHeader className="text-base">{addressModalTitle}</ModalHeader>
            <ModalBody className="pb-6">
              <div className="mb-4 text-right">
                <Button size="sm" onClick={copyAllAddresses}>
                  复制全部
                </Button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {addressList.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border border-default-200 dark:border-default-100 rounded-lg">
                    <code className="text-sm flex-1 mr-3 text-foreground">{item.address}</code>
                    <Button
                      size="sm"
                      variant="light"
                      isLoading={item.copying}
                      onClick={() => copyAddress(item)}
                    >
                      复制
                    </Button>
                  </div>
                ))}
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
      </div>
          </AdminLayout>
  );
} 