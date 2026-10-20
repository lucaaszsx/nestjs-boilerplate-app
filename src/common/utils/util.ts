export const safeJsonParse = <T = unknown>(text: string) => {
    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

export const isValidDate = (date: Date) => Object.prototype.toString.call(date) === "[object Date]" && !isNaN((date as Date).getTime());
