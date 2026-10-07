import { EventEmitter } from "events";
import { DomainEvent, DomainEventName } from "../types";

type Listener<TPayload extends Record<string, unknown>> = (event: DomainEvent<TPayload>) => void | Promise<void>;

class DomainEventBus {
  private readonly emitter = new EventEmitter();

  on<TPayload extends Record<string, unknown>>(name: DomainEventName, listener: Listener<TPayload>) {
    this.emitter.on(name, listener as Listener<Record<string, unknown>>);
  }

  async emit<TPayload extends Record<string, unknown>>(name: DomainEventName, payload: TPayload) {
    const event: DomainEvent<TPayload> = { name, payload, occurredAt: new Date() };
    const listeners = this.emitter.listeners(name) as Listener<TPayload>[];
    await Promise.all(listeners.map((listener) => listener(event)));
  }
}

export const domainEvents = new DomainEventBus();
