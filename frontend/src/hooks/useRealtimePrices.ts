import { useEffect, useRef, useState } from 'react';

export function useRealtimePrices(onPriceUpdate: (data: any) => void) {
    const callbackRef = useRef(onPriceUpdate);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        callbackRef.current = onPriceUpdate;
    }, [onPriceUpdate]);

    useEffect(() => {
        let socket: WebSocket;
        let timeoutId: NodeJS.Timeout;

        function connect() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Extract host from NEXT_PUBLIC_API_URL or fallback to localhost:8000
            let host = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            host = host.replace(/^https?:\/\//, '').replace(/\/$/, '');

            // Adapt if we are not on localhost but host is localhost
            if (host.startsWith('localhost') && window.location.hostname !== 'localhost') {
                host = `${window.location.hostname}:8000`;
            }

            socket = new WebSocket(`${protocol}//${host}/ws/prices`);
            console.log(`Connecting to WebSocket: ${protocol}//${host}/ws/prices`);

            socket.onopen = () => {
                console.log("WebSocket connected successfully");
                setIsConnected(true);
            };

            socket.onmessage = (event) => {
                console.log("WebSocket message received:", event.data);
                try {
                    const data = JSON.parse(event.data);
                    callbackRef.current(data);
                } catch (error) {
                    console.error("Failed to parse websocket message", error);
                }
            };

            socket.onclose = (e) => {
                console.log("WebSocket connection closed. Retrying in 3 seconds...", e.reason);
                setIsConnected(false);
                timeoutId = setTimeout(connect, 3000);
            };

            socket.onerror = (err) => {
                console.error("WebSocket error:", err);
                socket.close();
            };
        }

        connect();

        return () => {
            if (socket) socket.close();
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);

    return { isConnected };
}
