'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const config = await checkConfiguration();
        
        if (config.configured) {
          setStatus('connected');
        } else {
          setStatus('not-configured');
        }
        
        setDetails(config);
      } catch {
        setStatus('error');
      }
    };

    checkStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
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
    <div className={`space-y-2 ${className}`}>
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="font-medium">{getStatusText()}</span>
      </div>
      
      {showDetails && details && status === 'connected' && (
        <div className="text-xs text-gray-500 space-y-1 pl-7">
          <div>Model: {details.model}</div>
          <div>Max Tokens: {details.maxTokens}</div>
        </div>
      )}
      
      {showDetails && details && status === 'not-configured' && (
        <div className="text-xs text-gray-500 pl-7">
          {details.errors?.map((error: string, index: number) => (
            <div key={index} className="text-red-500">{error}</div>
          ))}
        </div>
      )}
    </div>
  );
}