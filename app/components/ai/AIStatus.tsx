'use client';

import { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useOpenAI } from '@/app/hooks/useOpenAI';

interface AIStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function AIStatus({ className = '', showDetails = false }: AIStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error' | 'not-configured'>('checking');
  const [details, setDetails] = useState<any>(null);
  const { checkConfiguration } = useOpenAI();
  const isPollingRef = useRef(false);
  const previousStatusRef = useRef<string>('checking');

  useEffect(() => {
    let mounted = true;
    
    const checkStatus = async (isPolling = false) => {
      if (!mounted) return;
      
      // Don't show checking state during polling if we already have a status
      if (isPolling && previousStatusRef.current !== 'checking') {
        isPollingRef.current = true;
      }

      try {
        const config = await checkConfiguration();
        
        if (!mounted) return;
        
        const newStatus = config.configured ? 'connected' : 'not-configured';
        
        // Only update if status actually changed
        if (previousStatusRef.current !== newStatus) {
          setStatus(newStatus);
          previousStatusRef.current = newStatus;
        }
        
        setDetails(config);
      } catch (error) {
        if (!mounted) return;
        
        // Only set error status if it's not a transient polling error
        // and we weren't previously connected
        if (!isPolling || previousStatusRef.current === 'error' || previousStatusRef.current === 'checking') {
          // Debounce error state changes
          setTimeout(() => {
            if (mounted && previousStatusRef.current !== 'connected') {
              setStatus('error');
              previousStatusRef.current = 'error';
            }
          }, 500);
        }
        // If we were connected and polling fails, keep showing connected
        // to avoid flickering (likely a transient network issue)
      } finally {
        isPollingRef.current = false;
      }
    };

    // Initial check
    checkStatus(false);
    
    // Don't poll if we're already configured - it won't change
    let interval: NodeJS.Timeout | null = null;
    if (previousStatusRef.current !== 'connected') {
      // Only poll if not connected, check every 2 minutes
      interval = setInterval(() => checkStatus(true), 120000);
    }
    
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [checkConfiguration]);

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />;
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'not-configured':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking OpenAI connection...';
      case 'connected':
        return 'OpenAI Connected';
      case 'not-configured':
        return 'OpenAI Not Configured';
      case 'error':
        return 'OpenAI Connection Error';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'bg-gray-100 text-gray-700';
      case 'connected':
        return 'bg-green-100 text-green-700';
      case 'not-configured':
        return 'bg-yellow-100 text-yellow-700';
      case 'error':
        return 'bg-red-100 text-red-700';
    }
  };

  return (
    <div className={`${className}`}>
      {/* Fixed height container to prevent layout shifts */}
      <div className="min-h-[32px] flex items-center">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="font-medium">{getStatusText()}</span>
        </div>
      </div>
      
      {showDetails && (
        <div className="min-h-[40px] mt-2">
          {details && status === 'connected' && (
            <div className="text-xs text-gray-500 space-y-1 pl-7">
              <div>Model: {details.model}</div>
              <div>Max Tokens: {details.maxTokens}</div>
            </div>
          )}
          
          {details && status === 'not-configured' && (
            <div className="text-xs text-gray-500 pl-7">
              {details.errors?.map((error: string, index: number) => (
                <div key={index} className="text-red-500">{error}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}