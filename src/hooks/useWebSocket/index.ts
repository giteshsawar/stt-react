import { useEffect, useRef } from 'react';
import {io, Socket} from 'socket.io-client';

/* eslint-disable no-console, @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any */
type Options = {
  [name: string]: any;
};

/**
 * A hook that helps us working with web-socket connections
 */
export default function (address: string, options: Options) {
  const socket = useRef<Socket>();
  const onConnect = options.onConnect || new Function();
  const onDisconnect = options.onDisconnect || new Function();
  const refreshDep = options.refreshDeps || [];

  // check debug mode and print message
  const print = (...params: any) => {
    console.log(...params);
  };

  useEffect(() => {
    /**
     * Initialize socket connection
     */
    if (options.isManualConnected || options.socket) {
      print('Using existing socket!');
      socket.current = options.socket;
    } else {
      print('Connecting to socket!', options);
      socket.current = io(address, {
        // reconnection: true,
        // multiplex: true,
        // timeout: 2000,
        ...options
      });
    }

    /**
     * Connection controller
     */
    const connection = (connected: boolean) => () => {
      // callbacks after connection
      if (connected) {
        onConnect();
      } else {
        onDisconnect();
      }

      // set logs
      if (options.debugMode) {
        print(`${connected ? 'connected' : 'disconnected'} web socket`);
      }
    };

    /**
     * Watch connection
     */
    socket.current?.on('connect', connection(true));
    socket.current?.on('disconnect', connection(false));

    /**
     * Close connection on unmount
     */
    return () => {
      if (options.closeOnUnmount) {
        socket.current?.disconnect();
      }
    };

    // eslint-disable-next-line
  }, [address, ...refreshDep]);

  return socket.current;
}
