import React, { useState, useEffect } from 'react';
import { ajaxRequest } from './utils/ajax';
import Toast from './components/Toast';
import CodeBlock from './components/CodeBlock';
import { JAVA_SOURCE_CODE } from './constants/sourceCode';
import { AlignLeft, Code, Database, Globe, Play, Server, Plus, Trash2, Clock, Settings, Zap } from 'lucide-react';

function App() {
    const [loading, setLoading] = useState(false);
    const [responseContext, setResponseContext] = useState(null); // { data, status, headers }
    const [activeTab, setActiveTab] = useState('response'); // response, frontend, backend

    // Request Configuration
    const [method, setMethod] = useState('POST');
    const [url, setUrl] = useState('http://localhost:8080/api/data');
    const [reqBody, setReqBody] = useState('{\n  "data": "测试中文内容"\n}');
    const [headers, setHeaders] = useState([{ key: 'Content-Type', value: 'application/json' }]);
    const [timeout, setTimeoutVal] = useState(5000);

    const [toast, setToast] = useState({ message: '', type: 'info' });

    // Generated JS Code
    const [frontendCode, setFrontendCode] = useState('');

    // Update HeadersHelper
    const updateHeader = (index, field, value) => {
        const newHeaders = [...headers];
        newHeaders[index][field] = value;
        setHeaders(newHeaders);
    };

    const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
    const removeHeader = (index) => setHeaders(headers.filter((_, i) => i !== index));

    // Scenarios Presets
    const loadScenario = (type) => {
        switch (type) {
            case 'url_params':
                setMethod('POST');
                setUrl('http://localhost:8080/api/data?pageId=10&sort=desc');
                setReqBody('{\n  "data": "测试 URL 参数回显"\n}');
                setHeaders([{ key: 'Content-Type', value: 'application/json' }]);
                setTimeoutVal(5000);
                showToast('已加载：URL 参数测试场景');
                break;
            case 'headers':
                setMethod('POST');
                setUrl('http://localhost:8080/api/data');
                setReqBody('{\n  "data": "测试自定义 Header"\n}');
                setHeaders([
                    { key: 'Content-Type', value: 'application/json' },
                    { key: 'X-User-ID', value: '8888' },
                    { key: 'X-Client-Ver', value: 'v2.0' }
                ]);
                setTimeoutVal(5000);
                showToast('已加载：自定义 Header 测试场景');
                break;
            case 'timeout':
                setMethod('POST');
                setUrl('http://localhost:8080/api/data');
                setReqBody('{\n  "data": "测试超时"\n}');
                setHeaders([{ key: 'Content-Type', value: 'application/json' }]);
                setTimeoutVal(500); // Trigger timeout (Server sleeps 1500ms)
                showToast('已加载：超时测试场景 (500ms)');
                break;
            default:
                // Reset
                setMethod('POST');
                setUrl('http://localhost:8080/api/data');
                setReqBody('{\n  "data": "测试中文内容"\n}');
                setHeaders([{ key: 'Content-Type', value: 'application/json' }]);
                setTimeoutVal(5000);
                showToast('已重置');
        }
    };

    useEffect(() => {
        // Robust Fetch Code Generation
        const headerObjStr = headers.reduce((acc, h) => {
            if (h.key) acc += `    "${h.key}": "${h.value}",\n`;
            return acc;
        }, '').trim();

        const code = `// 健壮的 Fetch 请求（包含超时与错误处理）
const url = "${url}";
const timeout = ${timeout};
const controller = new AbortController();
const id = setTimeout(() => controller.abort(), timeout);

const options = {
  method: "${method}",
  headers: {
${headerObjStr ? '    ' + headerObjStr : ''}
  },
  signal: controller.signal${method !== 'GET' ? `,\n  body: JSON.stringify(${reqBody.replace(/\n/g, '\n  ')})` : ''}
};

fetch(url, options)
  .then(async response => {
    clearTimeout(id);
    const contentType = response.headers.get("content-type");
    const data = contentType && contentType.includes("application/json") 
       ? await response.json() 
       : await response.text();

    if (!response.ok) {
       throw { status: response.status, message: data.error || '服务器错误' };
    }
    
    console.log('请求成功:', data);
    return data;
  })
  .catch(error => {
    if (error.name === 'AbortError') {
      console.error('请求超时');
    } else {
      console.error('请求错误:', error);
    }
  });`;
        setFrontendCode(code);
    }, [method, url, reqBody, headers, timeout]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const clearToast = () => setToast({ message: '', type: 'info' });

    const handleSend = () => {
        setLoading(true);
        setResponseContext(null); // clear previous response
        setActiveTab('response');

        // Prepare Headers object
        const finalHeaders = {};
        headers.forEach(h => {
            if (h.key) finalHeaders[h.key] = h.value;
        });

        let parsedBody = null;
        if (method !== 'GET') {
            try {
                parsedBody = JSON.parse(reqBody);
            } catch (e) {
                showToast('无效的 JSON 格式', 'error');
                setLoading(false);
                return;
            }
        }

        ajaxRequest({
            url,
            method,
            headers: finalHeaders,
            data: parsedBody,
            timeout,
            onLoading: setLoading,
            onSuccess: (resData) => {
                // resData contains { data, status, headers } from our modified ajax.js
                setResponseContext(resData);
                showToast('请求成功', 'success');
            },
            onError: (err) => {
                // Error object structure depends on utils/ajax.js catch block
                setResponseContext({
                    error: true,
                    status: err.code,
                    data: err.details || { message: err.message }
                });
                showToast(`请求失败: ${err.message}`, 'error');
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 flex flex-col h-screen">
            <Toast message={toast.message} type={toast.type} onClose={clearToast} />

            {/* Header */}
            <header className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-4 px-2">
                <Server className="text-blue-500 w-8 h-8" />
                <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Ajax & Servlet 异步通信演练场</h1>
                    <p className="text-xs text-slate-400">交互式 HTTP 请求构建与代码可视化工具</p>
                </div>
            </header>

            <main className="flex flex-1 gap-6 overflow-hidden">

                {/* Left Panel: Request Builder */}
                <section className="flex-1 flex flex-col gap-4 min-w-[380px] overflow-y-auto pr-2">

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-4 shadow-lg">
                        <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                            <Globe className="w-4 h-4" /> 请求参数配置
                        </h2>

                        {/* Presets (New Feature) */}
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => loadScenario('default')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-400 border border-slate-700 transition">
                                默认
                            </button>
                            <button onClick={() => loadScenario('url_params')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-400 border border-slate-700 transition">
                                URL 参数
                            </button>
                            <button onClick={() => loadScenario('headers')} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-400 border border-slate-700 transition">
                                自定义头
                            </button>
                            <button onClick={() => loadScenario('timeout')} className="px-2 py-1 bg-red-900/20 hover:bg-red-900/40 rounded text-xs text-red-400 border border-red-900/50 transition">
                                测试超时
                            </button>
                        </div>

                        {/* URL & Method */}
                        <div className="flex gap-0 rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                            <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                                className="bg-slate-900 text-white font-mono font-bold px-3 py-2 outline-none border-r border-slate-700 hover:bg-slate-800 cursor-pointer"
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="flex-1 bg-transparent px-3 py-2 text-sm font-mono outline-none placeholder-slate-600 focus:bg-slate-900/50"
                                placeholder="请输入接口 URL"
                            />
                        </div>

                        {/* Headers Editor */}
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center bg-slate-800/50 px-3 py-1 rounded">
                                <span className="text-xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                                    <Settings className="w-3 h-3" /> 请求头 (Headers)
                                </span>
                                <button onClick={addHeader} className="text-slate-400 hover:text-green-400 transition">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            {headers.map((h, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Key"
                                        value={h.key}
                                        onChange={(e) => updateHeader(i, 'key', e.target.value)}
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono outline-none focus:border-blue-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Value"
                                        value={h.value}
                                        onChange={(e) => updateHeader(i, 'value', e.target.value)}
                                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono outline-none focus:border-blue-500"
                                    />
                                    <button onClick={() => removeHeader(i)} className="text-slate-600 hover:text-red-500 transition">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Timeout Config */}
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded px-3 py-2">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className="text-xs text-slate-400">超时时间 (ms):</span>
                            <input
                                type="number"
                                value={timeout}
                                onChange={(e) => setTimeoutVal(Number(e.target.value))}
                                className="bg-transparent w-20 text-sm font-mono outline-none text-white border-b border-slate-800 focus:border-blue-500 text-center"
                            />
                        </div>

                        {/* Request Body (Condition) */}
                        {method !== 'GET' && (
                            <div className="flex flex-col gap-2 flex-1">
                                <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">请求体 (JSON)</div>
                                <textarea
                                    value={reqBody}
                                    onChange={(e) => setReqBody(e.target.value)}
                                    className="w-full h-48 bg-slate-950 border border-slate-700 rounded-lg p-3 font-mono text-sm text-green-300 outline-none focus:border-blue-500 resize-none leading-relaxed"
                                />
                            </div>
                        )}

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={loading}
                            className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            ) : (
                                <>
                                    <Play className="w-5 h-5 fill-current" /> 发送请求
                                </>
                            )}
                        </button>
                    </div>

                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50 text-xs text-slate-500">
                        <p className="font-bold mb-1">💡 提示：</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>点击上方 <b>按钮</b> 快速加载 URL参数、Header 测试场景。</li>
                            <li>在请求体中设置 <code>"data": "error"</code> 可测试 400 错误。</li>
                        </ul>
                    </div>
                </section>

                {/* Right Panel: Visualization & Code */}
                <section className="flex-[1.5] flex flex-col bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden">

                    {/* Tabs */}
                    <div className="flex border-b border-slate-800 bg-slate-950/50 backdrop-blur">
                        <button
                            onClick={() => setActiveTab('response')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'response' ? 'border-blue-500 text-blue-400 bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <AlignLeft className="w-4 h-4" /> 响应结果
                        </button>
                        <button
                            onClick={() => setActiveTab('frontend')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'frontend' ? 'border-yellow-500 text-yellow-400 bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <Code className="w-4 h-4" /> 客户端代码 (JS)
                        </button>
                        <button
                            onClick={() => setActiveTab('backend')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'backend' ? 'border-red-500 text-red-400 bg-slate-900' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                        >
                            <Database className="w-4 h-4" /> 服务端代码 (Java)
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-auto p-0 bg-slate-900 relative">

                        {/* Tab: Response */}
                        {activeTab === 'response' && (
                            <div className="h-full p-4 relative">
                                {loading && (
                                    <div className="absolute inset-0 bg-slate-900/80 z-10 flex flex-col items-center justify-center gap-4">
                                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                        <span className="text-blue-400 font-mono animate-pulse">等待服务器响应...</span>
                                    </div>
                                )}

                                {responseContext ? (
                                    <div className="space-y-4">
                                        {/* Status Bar */}
                                        <div className="flex gap-4 items-center bg-slate-950 p-2 rounded border border-slate-800">
                                            <div className={`px-3 py-1 rounded text-xs font-bold ${responseContext.status >= 200 && responseContext.status < 300 ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-red-900/50 text-red-400 border border-red-800'}`}>
                                                状态码: {responseContext.status || 'Unknown'}
                                            </div>
                                            {responseContext.headers && (
                                                <div className="text-xs text-slate-500">
                                                    大小: {JSON.stringify(responseContext.data).length} 字节
                                                </div>
                                            )}
                                        </div>

                                        {/* Response Headers */}
                                        {responseContext.headers && (
                                            <div className="text-xs font-mono">
                                                <div className="text-slate-500 mb-1 border-b border-slate-800 pb-1">响应头 (Headers)</div>
                                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-slate-400">
                                                    {Object.entries(responseContext.headers).map(([k, v]) => (
                                                        <React.Fragment key={k}>
                                                            <div className="text-blue-400 text-right">{k}:</div>
                                                            <div className="break-all">{v}</div>
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <CodeBlock
                                            title="响应体 (JSON)"
                                            language="JSON"
                                            code={typeof responseContext.data === 'string' ? responseContext.data : JSON.stringify(responseContext.data, null, 2)}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                        <Globe className="w-16 h-16 mb-4 opacity-20" />
                                        <p>请发送请求以查看响应结果。</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Tab: Frontend Code */}
                        {activeTab === 'frontend' && (
                            <div className="h-full p-4">
                                <CodeBlock
                                    title="生成的 JavaScript 代码"
                                    language="JAVASCRIPT"
                                    code={frontendCode}
                                />
                                <div className="mt-4 space-y-2">
                                    <p className="text-slate-500 text-sm">
                                        此健壮实现展示了：
                                    </p>
                                    <ul className="list-disc pl-5 text-sm text-slate-400 space-y-1">
                                        <li>使用 <code>AbortController</code> 实现 {timeout}ms 超时控制。</li>
                                        <li>检查 <code>!response.ok</code> 以手动抛出 HTTP 错误（fetch 默认不会抛出）。</li>
                                        <li>根据 Header 配置动态构建请求头。</li>
                                        <li>根据响应的 <code>Content-Type</code> 自动解析 JSON 或文本。</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Tab: Backend Code */}
                        {activeTab === 'backend' && (
                            <div className="h-full p-4">
                                <CodeBlock
                                    title="DataServlet.java"
                                    language="JAVA"
                                    code={JAVA_SOURCE_CODE}
                                />
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-sm text-red-200">
                                    <strong>核心概念：</strong> 该 Servlet 处理 POST 请求，使用 <code>Gson</code> 解析 JSON，并模拟业务处理后返回 JSON。
                                </div>
                            </div>
                        )}
                    </div>
                </section>

            </main>
        </div>
    );
}

export default App;
