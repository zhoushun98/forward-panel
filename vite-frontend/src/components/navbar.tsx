import { useState, useEffect } from "react";
import { Link } from "@heroui/link";
import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
} from "@heroui/navbar";
import { useNavigate } from "react-router-dom";

import { Logo } from "@/components/icons";
import { siteConfig, getCachedConfig } from "@/config/site";

export const Navbar = () => {
  const navigate = useNavigate();
  // 初始状态使用siteConfig中已经从缓存读取的值，避免闪烁
  const [appName, setAppName] = useState(siteConfig.name);
  const [isWebView, setIsWebView] = useState(false);

  // 检测是否在WebView中运行
  useEffect(() => {
    if((window as any).JsInterface !== undefined) {
      setIsWebView(true);
    }else if((window as any).webkit && (window as any).webkit.messageHandlers) {
      setIsWebView(true);
    }else {
      setIsWebView(false);
    }

  }, []);

  useEffect(() => {
    // 异步检查是否有更新的配置
    const checkForUpdates = async () => {
      try {
        const cachedAppName = await getCachedConfig('app_name');
        if (cachedAppName && cachedAppName !== appName) {
          setAppName(cachedAppName);
          // 同步更新siteConfig
          siteConfig.name = cachedAppName;
        }
      } catch (error) {
        console.warn('检查配置更新失败:', error);
      }
    };

    // 延迟执行，避免阻塞初始渲染
    const timer = setTimeout(checkForUpdates, 100);

    // 监听配置更新事件
    const handleConfigUpdate = async () => {
      try {
        const cachedAppName = await getCachedConfig('app_name');
        if (cachedAppName) {
          setAppName(cachedAppName);
          siteConfig.name = cachedAppName;
        }
      } catch (error) {
        console.warn('更新配置失败:', error);
      }
    };

    window.addEventListener('configUpdated', handleConfigUpdate);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('configUpdated', handleConfigUpdate);
    };
  }, [appName]);

  return (
    <>
      <HeroUINavbar maxWidth="xl" position="sticky" height="60px" className="shrink-0">
        <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
          <NavbarBrand className="gap-2 max-w-fit">
            <Link
              className="flex justify-start items-center gap-2 max-w-[200px] sm:max-w-none"
              color="foreground"
              href="/"
            >
              <Logo size={24} />
              <p className="font-bold text-inherit truncate">{appName}</p>
            </Link>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent className="basis-1/5 sm:basis-full" justify="end">
          {/* WebView设置图标 */}
          {isWebView && (
            <button
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              onClick={() => navigate('/settings')}
              title="面板设置"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </NavbarContent>
      </HeroUINavbar>
    </>
  );
};
