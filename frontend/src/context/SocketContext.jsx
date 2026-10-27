import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const clockOffsetRef = useRef(0);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_BACKEND_URL || '/';
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket connected to CricAuction Live server');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.warn('⚠️ Socket disconnected');
      setConnected(false);
    });

    // Clock-skew compensation listener
    socketInstance.on('ROOM_STATE_SYNC', (data) => {
      if (data && data.serverNow) {
        clockOffsetRef.current = data.serverNow - Date.now();
      }
    });

    socketInstance.on('TIMER_SYNC', (data) => {
      if (data && data.serverNow) {
        clockOffsetRef.current = data.serverNow - Date.now();
      }
    });

    socketInstance.on('BID_ACCEPTED', (data) => {
      if (data && data.serverNow) {
        clockOffsetRef.current = data.serverNow - Date.now();
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token]);

  const getTrueServerTime = () => {
    return Date.now() + clockOffsetRef.current;
  };

  return (
    <SocketContext.Provider value={{ socket, connected, clockOffset: clockOffsetRef.current, getTrueServerTime }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
