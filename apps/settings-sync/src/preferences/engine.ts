import {
  createRecord,
  mergeRecords,
  parseRecord,
  recordsEqual,
  resetPreferences,
  updatePreference,
} from "./merge";
import {
  applyPreferencesToDocument,
  CHANNEL_NAME,
  readStoredRecord,
  STORAGE_KEY,
  writeStoredRecord,
} from "./storage";
import {
  DEFAULT_PREFERENCES,
  type PreferenceKey,
  type PreferenceRecord,
  type PreferenceValues,
  type SyncInfo,
  type SyncMessage,
} from "./types";

const HEARTBEAT_MS = 2_500;
const PEER_TTL_MS = 7_000;
const PING_MS = 4_500;
const PRUNE_MS = 3_000;

type StateListener = (record: PreferenceRecord) => void;
type SyncListener = (info: SyncInfo) => void;

function createActorId(): string {
  try {
    const existing = window.sessionStorage.getItem("atelier.tab.actor");
    if (existing) return existing;

    const random =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replaceAll("-", "").slice(0, 10)
        : Math.random().toString(36).slice(2, 12);

    const actor = `tab-${random}`;
    window.sessionStorage.setItem("atelier.tab.actor", actor);
    return actor;
  } catch {
    return `tab-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function isSyncMessage(value: unknown): value is SyncMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { type?: unknown; actor?: unknown };
  return (
    typeof candidate.type === "string" &&
    typeof candidate.actor === "string" &&
    candidate.actor.length > 0
  );
}

export class PreferencesEngine {
  private readonly actor: string;
  private record: PreferenceRecord;
  private channel: BroadcastChannel | null = null;
  private started = false;
  private storageAvailable = false;
  private peers = new Map<string, number>();
  private latencyMs: number | null = null;
  private lastSyncAt: number | null = null;
  private lastPing: { nonce: string; sentAt: number } | null = null;
  private stateListeners = new Set<StateListener>();
  private syncListeners = new Set<SyncListener>();
  private heartbeatTimer: number | null = null;
  private pingTimer: number | null = null;
  private pruneTimer: number | null = null;

  constructor() {
    this.actor = createActorId();
    const stored = readStoredRecord();
    this.record = stored ?? createRecord(DEFAULT_PREFERENCES, this.actor);
    this.storageAvailable = writeStoredRecord(this.record);
    applyPreferencesToDocument(this.record);
  }

  getSnapshot = (): PreferenceRecord => this.record;

  getActor = (): string => this.actor;

  getSyncInfo = (): SyncInfo => {
    this.prunePeers(false);
    return {
      peerCount: this.peers.size + 1,
      latencyMs: this.latencyMs,
      lastSyncAt: this.lastSyncAt,
      transport: this.channel
        ? "broadcast-channel"
        : this.storageAvailable
          ? "storage"
          : "local",
      actor: this.actor,
    };
  };

  subscribeState = (listener: StateListener): (() => void) => {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  };

  subscribeSync = (listener: SyncListener): (() => void) => {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  };

  start = (): void => {
    if (this.started) return;
    this.started = true;

    if (typeof BroadcastChannel !== "undefined") {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.addEventListener("message", this.handleMessage);
      } catch {
        this.channel = null;
      }
    }

    window.addEventListener("storage", this.handleStorage);
    window.addEventListener("pagehide", this.handlePageHide);
    document.addEventListener("visibilitychange", this.handleVisibility);

    this.post({ type: "hello", actor: this.actor, sentAt: Date.now() });

    this.heartbeatTimer = window.setInterval(this.sendHeartbeat, HEARTBEAT_MS);
    this.pingTimer = window.setInterval(this.sendPing, PING_MS);
    this.pruneTimer = window.setInterval(() => this.prunePeers(true), PRUNE_MS);
    this.notifySync();
  };

  stop = (): void => {
    if (!this.started) return;
    this.started = false;

    if (this.heartbeatTimer !== null) window.clearInterval(this.heartbeatTimer);
    if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
    if (this.pruneTimer !== null) window.clearInterval(this.pruneTimer);
    this.heartbeatTimer = null;
    this.pingTimer = null;
    this.pruneTimer = null;

    this.post({ type: "bye", actor: this.actor, sentAt: Date.now() });
    this.channel?.close();
    this.channel = null;
    this.peers.clear();

    window.removeEventListener("storage", this.handleStorage);
    window.removeEventListener("pagehide", this.handlePageHide);
    document.removeEventListener("visibilitychange", this.handleVisibility);
  };

  setPreference = <K extends PreferenceKey>(key: K, value: PreferenceValues[K]): void => {
    const next = updatePreference(this.record, key, value, this.actor);
    this.commit(next, true);
  };

  reset = (): void => {
    this.commit(resetPreferences(this.record, this.actor), true);
  };

  private commit(next: PreferenceRecord, broadcast: boolean): void {
    this.record = next;
    this.storageAvailable = writeStoredRecord(next);
    applyPreferencesToDocument(next);
    this.stateListeners.forEach((listener) => listener(next));

    if (broadcast) {
      this.post({ type: "state", actor: this.actor, sentAt: Date.now(), state: next });
    }
  }

  private mergeIncoming(incoming: PreferenceRecord, sentAt: number): void {
    const merged = mergeRecords(this.record, incoming);
    const valuesChanged = !recordsEqual(merged, this.record);
    const clockAdvanced = merged.clock > this.record.clock;

    if (!valuesChanged && !clockAdvanced) return;

    this.record = merged;
    this.storageAvailable = writeStoredRecord(merged);
    applyPreferencesToDocument(merged);

    if (valuesChanged) {
      this.lastSyncAt = Date.now();
      this.latencyMs = Math.max(0, Math.round(Date.now() - sentAt));
      this.stateListeners.forEach((listener) => listener(merged));
      this.notifySync();
    }
  }

  private post(message: SyncMessage): void {
    try {
      this.channel?.postMessage(message);
    } catch {
      // A closing channel can throw. Local persistence still carries the state.
    }
  }

  private sendHeartbeat = (): void => {
    this.post({ type: "heartbeat", actor: this.actor, sentAt: Date.now() });
    this.prunePeers(true);
  };

  private sendPing = (): void => {
    const nonce = `${this.actor}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.lastPing = { nonce, sentAt: Date.now() };
    this.post({ type: "ping", actor: this.actor, nonce, sentAt: this.lastPing.sentAt });
  };

  private handleMessage = (event: MessageEvent<unknown>): void => {
    const message = event.data;
    if (!isSyncMessage(message) || message.actor === this.actor) return;

    switch (message.type) {
      case "hello": {
        this.touchPeer(message.actor);
        this.post({ type: "heartbeat", actor: this.actor, sentAt: Date.now() });
        this.post({
          type: "state",
          actor: this.actor,
          sentAt: Date.now(),
          state: this.record,
        });
        break;
      }
      case "heartbeat":
        this.touchPeer(message.actor);
        break;
      case "bye":
        this.removePeer(message.actor);
        break;
      case "ping":
        this.touchPeer(message.actor);
        this.post({
          type: "pong",
          actor: this.actor,
          nonce: message.nonce,
          sentAt: Date.now(),
          receivedAt: message.sentAt,
        });
        break;
      case "pong": {
        this.touchPeer(message.actor);
        if (this.lastPing?.nonce === message.nonce) {
          this.latencyMs = Math.max(0, Math.round(Date.now() - message.receivedAt));
          this.notifySync();
        }
        break;
      }
      case "state": {
        this.touchPeer(message.actor);
        const incoming = parseRecord(JSON.stringify(message.state));
        if (incoming) this.mergeIncoming(incoming, message.sentAt);
        break;
      }
      default:
        break;
    }
  };

  private handleStorage = (event: StorageEvent): void => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    const incoming = parseRecord(event.newValue);
    if (incoming) this.mergeIncoming(incoming, Date.now());
  };

  private handlePageHide = (): void => {
    this.post({ type: "bye", actor: this.actor, sentAt: Date.now() });
  };

  private handleVisibility = (): void => {
    if (document.visibilityState === "visible") {
      this.sendHeartbeat();
      this.notifySync();
    }
  };

  private touchPeer(actor: string): void {
    const existed = this.peers.has(actor);
    this.peers.set(actor, Date.now());
    if (!existed) this.notifySync();
  }

  private removePeer(actor: string): void {
    if (this.peers.delete(actor)) {
      this.notifySync();
    }
  }

  private prunePeers(notify: boolean): void {
    const cutoff = Date.now() - PEER_TTL_MS;
    let changed = false;

    for (const [actor, lastSeen] of this.peers) {
      if (lastSeen < cutoff) {
        this.peers.delete(actor);
        changed = true;
      }
    }

    if (changed && notify) this.notifySync();
  }

  private notifySync(): void {
    const info = this.getSyncInfo();
    this.syncListeners.forEach((listener) => listener(info));
  }
}

let singleton: PreferencesEngine | null = null;

export function getPreferencesEngine(): PreferencesEngine {
  if (!singleton) singleton = new PreferencesEngine();
  return singleton;
}
