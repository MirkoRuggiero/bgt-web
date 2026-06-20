import { useEffect, useRef, useCallback } from 'react';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from '../context/AuthContext';

interface UseStompClientReturn {
  subscribe: (destination: string, callback: (msg: IMessage) => void) => () => void;
  publish: (destination: string, body?: unknown) => void;
  connected: boolean;
}

let clientInstance: Client | null = null;
let connectionPromise: Promise<void> | null = null;

function getClient(username: string, password: string): Promise<Client> {
  if (clientInstance && clientInstance.connected) {
    return Promise.resolve(clientInstance);
  }

  // If there's an existing connection attempt in progress, wait for it
  if (connectionPromise) {
    return connectionPromise.then(() => {
      if (clientInstance && clientInstance.connected) {
        return clientInstance;
      }
      // Connection attempt finished but client is not connected — fall through to retry
      connectionPromise = null;
      return getClient(username, password);
    });
  }

  const client = new Client({
    webSocketFactory: () => new SockJS('/ws'),
    connectHeaders: {
      login: username,
      passcode: password,
    },
    reconnectDelay: 5000,
    debug: (msg) => console.debug('[STOMP]', msg),
  });

  connectionPromise = new Promise<void>((resolve, reject) => {
    client.onConnect = () => {
      console.log('[STOMP client] Connected successfully');
      resolve();
    };
    client.onWebSocketError = (err) => {
      console.error('[STOMP client] WebSocket error:', err);
      connectionPromise = null;
      clientInstance = null;
      reject(err);
    };
    client.onStompError = (frame) => {
      console.error(`[STOMP client] STOMP error: ${frame.headers['message']}`, frame.body);
      connectionPromise = null;
      clientInstance = null;
      reject(new Error(frame.headers['message']));
    };
  });

  client.activate();
  clientInstance = client;

  return connectionPromise.then(() => clientInstance!);
}

export function useStompClient(): UseStompClientReturn {
  const { credentials } = useAuth();
  const subscriptionsRef = useRef<Map<string, StompSubscription[]>>(new Map());
  const connectedRef = useRef(false);

  const subscribe = useCallback((destination: string, callback: (msg: IMessage) => void): (() => void) => {
    if (!credentials) {
      console.error('[STOMP subscribe] Not authenticated');
      throw new Error('Not authenticated');
    }

    console.log(`[STOMP subscribe] Subscribing to "${destination}"`);

    const subs: StompSubscription[] = [];

    const doSubscribe = async () => {
      const client = await getClient(credentials.username, credentials.password);
      connectedRef.current = true;
      console.log(`[STOMP subscribe] Client connected, subscribing to "${destination}"`);
      const sub = client.subscribe(destination, (msg) => {
        console.log(`[STOMP subscribe] Received message from "${destination}":`, msg.body);
        callback(msg);
      });
      subs.push(sub);
      const existing = subscriptionsRef.current.get(destination) || [];
      existing.push(sub);
      subscriptionsRef.current.set(destination, existing);
      console.log(`[STOMP subscribe] Successfully subscribed to "${destination}"`);
    };

    doSubscribe().catch((err) => {
      console.error(`[STOMP subscribe] Error subscribing to "${destination}":`, err);
    });

    return () => {
      console.log(`[STOMP subscribe] Unsubscribing from "${destination}"`);
      subs.forEach((s) => s.unsubscribe());
      subscriptionsRef.current.delete(destination);
    };
  }, [credentials]);

  const publish = useCallback((destination: string, body?: unknown) => {
    if (!credentials) {
      console.error('[STOMP publish] Not authenticated');
      throw new Error('Not authenticated');
    }

    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    console.log(`[STOMP publish] Sending to "${destination}" with body:`, payload);

    getClient(credentials.username, credentials.password)
      .then((client) => {
        console.log(`[STOMP publish] Client connected, publishing to "${destination}"`);
        client.publish({
          destination,
          body: payload,
        });
        console.log(`[STOMP publish] Successfully published to "${destination}"`);
      })
      .catch((err) => {
        console.error(`[STOMP publish] Error publishing to "${destination}":`, err);
      });
  }, [credentials]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((subs) => {
        subs.forEach((s) => s.unsubscribe());
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  return {
    subscribe,
    publish,
    connected: connectedRef.current,
  };
}
