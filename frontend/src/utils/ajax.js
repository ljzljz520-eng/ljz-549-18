/**
 * ajax.js —— 跨浏览器 AJAX 请求封装
 *
 * 设计目标：
 * 1. 现代浏览器优先使用 fetch + AbortController；
 *    不支持时自动降级为 XMLHttpRequest（XHR）。
 * 2. 无论底层走哪种引擎，成功 / HTTP 错误 / 网络错误 / 超时 / 取消，
 *    都通过同一套回调通知调用方：onLoading / onSuccess / onError。
 * 3. 不依赖任何浏览器独有的全局对象：
 *    能力检测一律使用 typeof，不访问 window，不使用 ActiveXObject 等私有 API。
 */

/** 统一的错误类型，调用方通过 err.type 区分失败原因 */
export const AjaxErrorType = {
    HTTP: 'HTTP_ERROR',        // 服务器返回了非 2xx 状态码
    NETWORK: 'NETWORK_ERROR',  // 网络层失败（断网、DNS、CORS 等）
    TIMEOUT: 'TIMEOUT',        // 超过 timeout 仍未响应
    ABORT: 'ABORTED',          // 调用方主动 cancel()
    PARSE: 'PARSE_ERROR',      // 响应体解析失败
    UNSUPPORTED: 'UNSUPPORTED' // 当前环境既无 fetch 也无 XHR
};

const noop = () => { };

/* ------------------------------ 能力检测 ------------------------------ */

const canUseFetch = () =>
    typeof fetch === 'function' && typeof AbortController === 'function';

const canUseXhr = () => typeof XMLHttpRequest === 'function';

/* ------------------------------ 工具函数 ------------------------------ */

/** 判断调用方是否已（不区分大小写地）提供了某个请求头 */
const hasHeader = (headers, name) => {
    const lower = name.toLowerCase();
    return Object.keys(headers).some((key) => key.toLowerCase() === lower);
};

/** 判断 data 是否为“浏览器原生可发送”的请求体（FormData / Blob / URLSearchParams） */
const isNativeBody = (data) => {
    // 全部用 typeof 守卫，避免在缺少这些全局对象的环境（旧浏览器 / Web Worker / SSR）中抛 ReferenceError
    if (typeof FormData === 'function' && data instanceof FormData) return true;
    if (typeof Blob === 'function' && data instanceof Blob) return true;
    if (typeof URLSearchParams === 'function' && data instanceof URLSearchParams) return true;
    return false;
};

/**
 * 序列化请求体。
 * 返回 { body, json }：json 为 true 表示我们做了 JSON 序列化，需要补默认 Content-Type。
 */
const serializeBody = (data, method) => {
    if (data == null || method === 'GET' || method === 'HEAD') {
        return { body: null, json: false };
    }
    if (typeof data === 'string') return { body: data, json: false };
    if (isNativeBody(data)) return { body: data, json: false };
    return { body: JSON.stringify(data), json: true };
};

/** 构造统一格式的错误对象（保留 err.code / err.message / err.details 字段以兼容既有调用方） */
const createError = (type, message, { status = 0, details } = {}) => ({
    type,
    message,
    status,
    code: status, // 向后兼容：旧代码用 err.code 表示 HTTP 状态码
    details
});

/** 从响应体中挑选人类可读的错误信息（后端约定 { error } 或 { message }） */
const pickErrorMessage = (data) => {
    if (data && typeof data === 'object') {
        return data.error || data.message || null;
    }
    return typeof data === 'string' && data !== '' ? data : null;
};

/** fetch 的 Headers 实例 -> 普通对象 */
const fetchHeadersToObject = (headers) => {
    const result = {};
    if (headers && typeof headers.forEach === 'function') {
        headers.forEach((value, key) => { result[key] = value; });
    }
    return result;
};

/** XHR 的 getAllResponseHeaders() 字符串 -> 普通对象 */
const parseXhrHeaders = (rawHeaders) => {
    const result = {};
    if (!rawHeaders) return result;
    rawHeaders.trim().split(/[\r\n]+/).forEach((line) => {
        const index = line.indexOf(':');
        if (index > 0) {
            const key = line.slice(0, index).trim().toLowerCase();
            result[key] = line.slice(index + 1).trim();
        }
    });
    return result;
};

const isJsonContentType = (contentType) =>
    typeof contentType === 'string' &&
    contentType.toLowerCase().indexOf('application/json') !== -1;

/* ------------------------------ fetch 引擎 ------------------------------ */

/**
 * 使用 fetch 发起请求。
 * 返回一个 abort 函数，供外层在超时 / 取消时中止传输。
 */
const startFetchRequest = ({ url, method, headers, body, succeed, fail }) => {
    const controller = new AbortController();

    const run = async () => {
        let response;
        try {
            response = await fetch(url, {
                method,
                headers,
                body, // GET/HEAD 时为 null，fetch 会忽略
                signal: controller.signal
            });
        } catch (error) {
            // AbortError 一般由外层的超时 / 取消触发，那时 fail 已先执行，这里会被 settled 去重
            if (error && error.name === 'AbortError') {
                fail(createError(AjaxErrorType.ABORT, 'Request was aborted.'));
            } else {
                fail(createError(
                    AjaxErrorType.NETWORK,
                    (error && error.message) || 'Network request failed.'
                ));
            }
            return;
        }

        // 按 Content-Type 解析响应体
        let data;
        try {
            const contentType = response.headers.get('content-type');
            data = isJsonContentType(contentType) ? await response.json() : await response.text();
        } catch (error) {
            fail(createError(AjaxErrorType.PARSE, 'Failed to parse response body.', { status: response.status }));
            return;
        }

        const payload = {
            data,
            status: response.status,
            headers: fetchHeadersToObject(response.headers)
        };

        // fetch 不会对 4xx/5xx 抛错，需要手动判断
        if (response.ok) {
            succeed(payload);
        } else {
            fail(createError(
                AjaxErrorType.HTTP,
                pickErrorMessage(data) || `Request failed with status ${response.status}.`,
                { status: response.status, details: data }
            ));
        }
    };

    run();

    return () => {
        try {
            controller.abort();
        } catch (ignored) {
            /* 已结束的请求重复 abort 可能抛错，忽略 */
        }
    };
};

/* ------------------------------ XHR 引擎 ------------------------------ */

/**
 * 使用 XMLHttpRequest 发起请求（降级方案）。
 * 返回一个 abort 函数，供外层在超时 / 取消时中止传输。
 */
const startXhrRequest = ({ url, method, headers, body, succeed, fail }) => {
    const xhr = new XMLHttpRequest();

    try {
        xhr.open(method, url, true); // 始终异步
        Object.keys(headers).forEach((key) => {
            if (headers[key] != null) xhr.setRequestHeader(key, String(headers[key]));
        });
    } catch (error) {
        // open() 对非法 URL / 方法会同步抛错
        fail(createError(
            AjaxErrorType.NETWORK,
            (error && error.message) || 'Failed to open request.'
        ));
        return noop;
    }

    xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return; // 只关心 DONE

        const status = xhr.status;

        // status === 0：网络层失败（或被 abort —— 取消 / 超时已由外层先行 fail，这里会被 settled 去重）
        if (status === 0) {
            fail(createError(AjaxErrorType.NETWORK, 'Network request failed.'));
            return;
        }

        let data;
        try {
            const contentType = xhr.getResponseHeader('Content-Type');
            data = isJsonContentType(contentType) && xhr.responseText !== ''
                ? JSON.parse(xhr.responseText)
                : xhr.responseText;
        } catch (error) {
            fail(createError(AjaxErrorType.PARSE, 'Failed to parse response body.', { status }));
            return;
        }

        const payload = {
            data,
            status,
            headers: parseXhrHeaders(xhr.getAllResponseHeaders())
        };

        if ((status >= 200 && status < 300) || status === 304) {
            succeed(payload);
        } else {
            fail(createError(
                AjaxErrorType.HTTP,
                pickErrorMessage(data) || `Request failed with status ${status}.`,
                { status, details: data }
            ));
        }
    };

    try {
        xhr.send(body);
    } catch (error) {
        fail(createError(
            AjaxErrorType.NETWORK,
            (error && error.message) || 'Failed to send request.'
        ));
    }

    return () => {
        try {
            xhr.abort();
        } catch (ignored) {
            /* 忽略重复 abort */
        }
    };
};

/* ------------------------------ 统一入口 ------------------------------ */

/**
 * 发起一次 AJAX 请求。
 *
 * @param {Object}   options
 * @param {string}   options.url                请求地址
 * @param {string}   [options.method='GET']     HTTP 方法
 * @param {Object}   [options.headers={}]       请求头
 * @param {*}        [options.data=null]        请求体；普通对象会自动 JSON 序列化
 * @param {number}   [options.timeout=10000]    超时毫秒数；<= 0 表示不限制
 * @param {Function} [options.onLoading]        (isLoading: boolean) => void
 * @param {Function} [options.onSuccess]        ({ data, status, headers }) => void
 * @param {Function} [options.onError]          ({ type, message, status, code, details }) => void
 * @returns {{ cancel: () => void }} 请求句柄，cancel() 可中止请求（同样走 onError，type 为 ABORTED）
 */
export const ajaxRequest = ({
    url,
    method = 'GET',
    headers = {},
    data = null,
    timeout = 10000,
    onLoading = noop,
    onSuccess = noop,
    onError = noop
} = {}) => {
    const upperMethod = String(method).toUpperCase();

    // 组装最终请求头：对象数据默认补 Content-Type: application/json
    const { body, json } = serializeBody(data, upperMethod);
    const finalHeaders = { ...headers };
    if (json && !hasHeader(finalHeaders, 'Content-Type')) {
        finalHeaders['Content-Type'] = 'application/json';
    }

    let settled = false;   // 保证成功 / 失败回调全局只触发一次
    let timer = null;
    let abortTransport = noop;

    const clearTimer = () => {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
    };

    const succeed = (payload) => {
        if (settled) return;
        settled = true;
        clearTimer();
        onSuccess(payload);
        onLoading(false);
    };

    const fail = (error) => {
        if (settled) return;
        settled = true;
        clearTimer();
        onError(error);
        onLoading(false);
    };

    onLoading(true);

    // 选择引擎：fetch 优先，XHR 兜底
    if (canUseFetch()) {
        abortTransport = startFetchRequest({ url, method: upperMethod, headers: finalHeaders, body, succeed, fail });
    } else if (canUseXhr()) {
        abortTransport = startXhrRequest({ url, method: upperMethod, headers: finalHeaders, body, succeed, fail });
    } else {
        fail(createError(
            AjaxErrorType.UNSUPPORTED,
            'Neither fetch nor XMLHttpRequest is available in this environment.'
        ));
        return { cancel: noop };
    }

    // 统一的超时控制：两种引擎共用同一个定时器
    if (!settled && typeof timeout === 'number' && timeout > 0) {
        timer = setTimeout(() => {
            // 先 fail 再 abort：abort 可能同步触发底层事件，settled 去重保证回调只走一次
            fail(createError(AjaxErrorType.TIMEOUT, `Request timed out after ${timeout}ms.`));
            abortTransport();
        }, timeout);
    }

    return {
        /** 主动取消请求：与超时一样走 onError（type = ABORTED） */
        cancel() {
            if (settled) return;
            fail(createError(AjaxErrorType.ABORT, 'Request was cancelled by the caller.'));
            abortTransport();
        }
    };
};
