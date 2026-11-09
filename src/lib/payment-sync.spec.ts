import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publishPaymentHint, subscribePaymentHints } from "./payment-sync";
const reference = "BHQSUB_" + "a".repeat(32);
const topic = "belivrhq:subscription-payment-sync";
let target: EventTarget;
let storage: { setItem: ReturnType<typeof vi.fn>; removeItem: ReturnType<typeof vi.fn> };
let channels: FakeChannel[];
class FakeChannel {
  closed = false;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  constructor(public name: string) { channels.push(this); }
  postMessage(data: unknown) { channels.filter(c => c !== this && !c.closed && c.name === this.name).forEach(c => c.onmessage?.({ data })); }
  close() { this.closed = true; }
}
beforeEach(() => {
  channels = [];
  target = new EventTarget();
  storage = { setItem: vi.fn(), removeItem: vi.fn() };
  vi.stubGlobal("window", target);
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("BroadcastChannel", FakeChannel);
  vi.stubGlobal("crypto", { randomUUID: () => "nonce" });
});
afterEach(() => vi.unstubAllGlobals());
describe("payment tab wake-up hints", () => {
  it("notifies other tabs and removes its temporary storage entry", () => {
    const receive = vi.fn();
    const stop = subscribePaymentHints(receive);
    publishPaymentHint({ churchId: "church-a", reference });
    expect(receive).toHaveBeenCalledWith({ churchId: "church-a", reference });
    expect(storage.removeItem).toHaveBeenCalledWith(topic);
    stop();
    publishPaymentHint({ churchId: "church-a", reference });
    expect(receive).toHaveBeenCalledTimes(1);
  });
  it("uses storage events when BroadcastChannel is unavailable", () => {
    vi.stubGlobal("BroadcastChannel", class { constructor() { throw new Error("unavailable"); } });
    const receive = vi.fn();
    const stop = subscribePaymentHints(receive);
    publishPaymentHint({ churchId: "church-a", reference });
    const event = Object.assign(new Event("storage"), { key: topic, newValue: storage.setItem.mock.calls[0][1] });
    target.dispatchEvent(event);
    expect(receive).toHaveBeenCalledWith(expect.objectContaining({ churchId: "church-a", reference }));
    stop();
  });
  it("ignores malformed, unrelated and non-payment messages", () => {
    const receive = vi.fn();
    const stop = subscribePaymentHints(receive);
    for (const data of [null, {}, { churchId: "church-a", reference: "invalid" }]) channels[0].onmessage?.({ data });
    target.dispatchEvent(Object.assign(new Event("storage"), { key: "unrelated", newValue: JSON.stringify({ churchId: "church-a", reference }) }));
    target.dispatchEvent(Object.assign(new Event("storage"), { key: topic, newValue: "invalid json" }));
    expect(receive).not.toHaveBeenCalled();
    stop();
  });
});
