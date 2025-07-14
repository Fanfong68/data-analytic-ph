export enum ENV {
  DEVELOP = 2,
  PRODUCTION = 1,
}

export class TrackerUtils {
  // Check environment
  static checkEnv(environment?: number): ENV {
    return environment === ENV.DEVELOP ? ENV.DEVELOP : ENV.PRODUCTION;
  }

  // Create query params
  static createQueryParams(data?: Record<string, string>): string {
    const queryData = {
      compression: "gzip-js",
      ...(data || {}),
    };
    try {
      const queryParams = new URLSearchParams(queryData);
      return queryParams.toString();
    } catch (e) {
      // Fallback for environments without URLSearchParams
      let queryString = "compression=gzip-js";

      if (data) {
        for (const key in data) {
          if (key !== "compression") {
            // Avoid duplication
            queryString += `&${encodeURIComponent(key)}=${encodeURIComponent(
              data[key]
            )}`;
          }
        }
      }
      return queryString;
    }
  }

  static getEventName(event_name?: number): string {
    switch (event_name) {
      case 1:
        return "click_event";
      case 2:
        return "pageview_event";
      case 3:
        return "expose_event";
      default:
        return "click_event";
    }
  }

  static generateGUID(): string {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
      (
        +c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))
      ).toString(16)
    );
  }
}
