import { IdentifyEvent, TrackerInitData } from "./tracker-interface";
import { TrackerUtils, ENV } from "./tracker-utils";
import { gzip, gzipSync, strToU8 } from "fflate";

export class Tracker {
  private _trackerSettings: {
    [key: string]: { token: string; apiLink: string };
  } = {
    test: {
      token: "TOKEN",
      apiLink: "API_LINK",
    },
    production: {
      token: "TOKEN",
      apiLink: "API_LINK",
    },
  };
  private _MAX_SIZE = 2048;
  private _token!: string;
  private _apiLink!: string;
  private _queryParam!: string;
  private _guid!: string;
  private _distinctId!: string;

  /**
   * Initializes the tracker
   * @param environment The environment to use 1 for production & 2 for develop
   * @param data The data to use for init guid & queryParam
   * @returns Success status with message and guid
   */
  private _init(environment?: number, data?: TrackerInitData) {
    try {
      const settingKey =
        TrackerUtils.checkEnv(environment) === ENV.PRODUCTION
          ? "production"
          : "test";
      const settings = this._trackerSettings[settingKey];
      ({ token: this._token, apiLink: this._apiLink } = settings);
      this._queryParam = TrackerUtils.createQueryParams(data?.queryParam);
      this._guid = data?.guid || TrackerUtils.generateGUID();
      return { status: 200, message: "Success Init Tracker", guid: this._guid };
    } catch (error) {
      return { status: 500, message: JSON.stringify(error) };
    }
  }

  /**
   * Identifies a user in tracker analytics
   * @param new_distinct_id The new distinct id to identify the user
   * @param userProps The user properties to identify the user
   * @throws If tracker is not initialized
   * @throws If error occurs while identifying user
   */
  //TODO: NEED ENHANCE identify function //
  private _identify(new_distinct_id: string, userProps: IdentifyEvent) {
    if (!new_distinct_id) throw new Error("new_distinct_id is required");

    try {
      if (!this._token || !this._apiLink) {
        throw new Error("Tracker not initialized. Call init() first.");
      }

      this._distinctId = new_distinct_id;

      const payload = {
        type: "identify",
        properties: {
          distinct_id: this._distinctId,
          email: userProps.email || "",
          name: userProps.name || "",
        },
      };
      // Send event
      this._sendEvent(payload);
    } catch (error) {
      throw new Error("Error identifying: " + error);
    }
  }

  /**
   * Tracks an event in tracker analytics
   * @param event_name Optional event name (3 for expose,2 for pageview, 1 for click)
   * @param properties ClickEvent or PageViewEvent object containing event data
   * @throws If tracker is not initialized
   * @throws If error occurs while sending event
   */
  //TODO: SEE IF PROPERTIES NEEDED TO ADD IN INTERFACE //
  private _send(event_name?: number, properties?: any) {
    try {
      if (!this._token || !this._apiLink) {
        throw new Error("Tracker not initialized. Call init() first.");
      }
      const payload = {
        event: TrackerUtils.getEventName(event_name),
        properties: {
          ...(properties || {}),
          //TODO: NEED ADD MORE PROPERTIES HERE INSTEAD OF ...(properties || {})
        },
      };

      // Call the internal method that handles retries
      this._sendEvent(payload);
    } catch (error) {
      throw new Error("Error sending event: " + error);
    }
  }

  /**
   * Internal method that handles sending the event with retries
   * Also handles compression of the event by size
   * @param payload Event payload
   * @param retryCount Retry count (default is 0)
   * @throws If error occurs after 3 retries
   * @throws If error occurs while sending event
   * @throws If error occurs while compressing event
   */
  private _sendEvent(payload: any, retryCount: number = 0) {
    const encoded = strToU8(JSON.stringify(payload));
    const size = encoded.length;

    // Create a new XMLHttpRequest for each event
    const xhr = new XMLHttpRequest();

    const sendCompressed = (compressed: Uint8Array) => {
      try {
        xhr.open("POST", `${this._apiLink}?${this._queryParam}`, true);
        xhr.setRequestHeader("Content-Type", "text/plain");
        xhr.setRequestHeader("Accept", "*/*");
        xhr.setRequestHeader("Content-Encoding", "gzip");
        xhr.onreadystatechange = () => {
          if (xhr.readyState !== 4) return;
          // Release XHR after completion (success or failure)
          if (xhr.status !== 200) {
            if (retryCount < 3) this._sendEvent(payload, retryCount + 1);
          }
          // Success case - release XHR
          this._releaseXHR(xhr);
        };

        // Add timeout and error handlers to ensure XHR is always released
        xhr.ontimeout = () => {
          this._releaseXHR(xhr);
          if (retryCount < 3) {
            this._sendEvent(payload, retryCount + 1);
          } else {
            throw new Error("Tracker event timed out after 3 retries");
          }
        };

        xhr.onerror = () => {
          this._releaseXHR(xhr);
          if (retryCount < 3) {
            this._sendEvent(payload, retryCount + 1);
          } else {
            throw new Error(
              "Tracker event failed with network error after 3 retries"
            );
          }
        };

        xhr.send(compressed.buffer as ArrayBuffer); // Ensure ArrayBuffer is sent
      } catch (error) {
        this._releaseXHR(xhr);
        if (retryCount < 3) {
          this._sendEvent(payload, retryCount + 1);
        } else {
          throw new Error("Error sending event: " + error);
        }
      }
    };

    // Compress based on size
    if (size > this._MAX_SIZE) {
      // Use async gzip
      gzip(encoded, (err, compressed) => {
        if (err) {
          throw new Error("Compression error: " + err);
        }
        sendCompressed(compressed);
      });
    } else {
      // Use fast sync gzip
      const compressed = gzipSync(encoded);
      sendCompressed(compressed);
    }
  }

  /**
   * Releases an XMLHttpRequest to prevent memory leaks
   * @param xhr The XMLHttpRequest to release
   */
  private _releaseXHR(xhr: XMLHttpRequest) {
    // Reset the XHR to a clean state
    xhr.onreadystatechange = null;
    xhr.onload = null;
    xhr.onerror = null;
    xhr.ontimeout = null;
    xhr.abort();
  }

  public init(environment?: number, data?: TrackerInitData) {
    this._init(environment, data);
  }

  public identify(new_distinct_id: string, userProps: IdentifyEvent) {
    this._identify(new_distinct_id, userProps);
  }

  public send(event_name?: number, properties?: any) {
    this._send(event_name, properties);
  }

  public sendEvent(payload: any) {
    this._sendEvent(payload);
  }

  //TODO: Future need to add PageView, Expose & AutoCapture //
}

export default Tracker;
