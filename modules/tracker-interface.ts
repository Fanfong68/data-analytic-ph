export interface TrackerInitData {
  guid?: string;
  queryParam?: Record<string, string>;
}

export interface IdentifyEvent {
  email: string;
  name: string;
}
