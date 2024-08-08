export function fetchWithTimeout(
    url: URL | Request | string,
    options?: RequestInit,
    timeout = 3 * 1e3,
) {
    const controller = new AbortController();
    const signal = controller.signal;

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    return fetch(url, { ...options, signal })
        .then((response) => {
            clearTimeout(timeoutId);
            return response;
        })
        .catch((error) => {
            if (error.name === "AbortError") {
                throw new Error("Request timed out");
            }
            throw error;
        });
}
