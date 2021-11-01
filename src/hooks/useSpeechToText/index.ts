/* eslint-disable no-console, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { Socket } from 'socket.io-client';
import { useCallback, useState, useContext, createContext } from 'react';
import useWebSocket from '../useWebSocket';

type HookParams = {
  isRoot?: boolean;
  isWidget?: boolean;
  closeOnUnmount?: boolean;
  isManualConnected?: boolean;
  socket?: Socket;
  query?: {
    visitorId?: string;
    workspaceId?: string;
    token?: string;
  };
};
export type Callback<T> = (res: T) => void;

/**
 * Context to store socket
 * singleton socket instance
 */
export const ConversationContext = createContext<Socket | undefined>(undefined);
/**
 * An easy to use way to work with conversation socket
 * @note: if sth is going to be shared between widget and inbox
 *        please add it here. all returned things from here will
 *        be available on useWidgetConversation too
 */
// eslint-disable-next-line import/no-anonymous-default-export
export default function (options: HookParams = {}) {
  const socketContext = useContext(ConversationContext);
  const [isReady, setIsReady] = useState<boolean>(false);
  // check debug mode and print message
  const print = (...params: any) => {
    console.log(...params);
  };

  /**
   * Connect only in root context
   */
  options.isManualConnected = !options.isRoot;
  options.socket = socketContext;
  // const { REACT_APP_WS_GATEWAY = '' } = process.env;
  // // Throw error in dev mode in case env variable was undefined
  // if (!REACT_APP_WS_GATEWAY) {
  //   throw new Error('REACT_APP_WS_GATEWAY is undefined');
  // }

  let socket: Socket | undefined = useWebSocket('http://localhost:3001/', {
    ...options,
    debugMode: true,
    onConnect: () => setIsReady(true),
    onDisconnect: () => setIsReady(false)
  });
  if (options.isManualConnected) {
    socket = socketContext;
  }

  const sendSpeech = useCallback((base64: string) => {
    if (!socket) {
      print('Socket is not ready yet: sendSpeech');
      return false;
    }
    print('sending speech!');

    socket.emit('stt', base64);
  }, [socket]);
  const onTextAvailable = useCallback(
    (cb: Callback<any>) => {
      if (!socket) {
        print('Socket is not ready yet: onTextAvailable');
        return false;
      }
      socket.off('stt').on('stt', (res: string) => {
        print('onTextAvailable: ', res);
        cb(res);
      });
    },
    [socket]
  );
  const onConnectionEstablished = useCallback(
    (cb: Callback<string>) => {
      if (!socket) {
        print('Socket is not ready yet: onConnectionEstablished');
        return false;
      }
      socket.off('connection').on('connection', (res: string) => {
        print('Connection is ready: ', res);
        cb(res);
      });
    },
    [socket]
  );
  const onConnectionLost = useCallback(
    (cb: Callback<string>) => {
      if (!socket) {
        print('Socket is not ready yet: onConnectionLost');
        return false;
      }
      socket.off('disconnect').on('disconnect', (res: string) => {
        print('Connection is lost: ', res);
        cb(res);
      });
    },
    [socket]
  );
  return {
    socket,
    isReady,
    /* emitters */
    sendSpeech,
    /* listeners */
    onTextAvailable,
    onConnectionEstablished,
    onConnectionLost
  };
}
