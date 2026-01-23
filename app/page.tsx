import MainApp from './components/MainApp';

export default function Home() {
  // #region agent log
  if (typeof window !== 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:5',message:'Home component rendering',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }
  // #endregion
  try {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:8',message:'About to render MainApp',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    return <MainApp />;
  } catch (error) {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:15',message:'Error in Home component',data:{error:error instanceof Error ? error.message : String(error),stack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    throw error;
  }
}