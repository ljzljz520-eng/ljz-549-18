/**
 * AJAX Request Utility
 * Encapsulates fetch with timeout, error handling, and loading state management.
 */
export const ajaxRequest = async ({
    url,
    method = 'GET',
    headers = {},
    data = null,
    onLoading = () => { },
    onSuccess = () => { },
    onError = () => { },
    timeout = 10000 // 10s default timeout
}) => {
    onLoading(true);

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            signal: controller.signal
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);
        clearTimeout(id);

        // Parse JSON
        let result;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            result = await response.json();
        } else {
            result = await response.text();
        }

        if (!response.ok) {
            // Handle HTTP errors
            throw {
                status: response.status,
                message: result.error || result.message || 'Request failed',
                data: result
            };
        }

        // Convert headers to object
        const headersObj = {};
        response.headers.forEach((value, key) => {
            headersObj[key] = value;
        });

        onSuccess({
            data: result,
            status: response.status,
            headers: headersObj
        });
    } catch (error) {
        let errorMsg = error.message;
        if (error.name === 'AbortError') {
            errorMsg = 'Request timed out';
        }

        console.error('AJAX Error:', error);
        onError({
            message: errorMsg,
            code: error.status || 0,
            details: error.data
        });
    } finally {
        onLoading(false);
    }
};
