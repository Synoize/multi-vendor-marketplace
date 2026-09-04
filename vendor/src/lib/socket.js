import { io } from "socket.io-client"
import { API_ORIGIN } from "./axios"

const SOCKET_URL = API_ORIGIN || window.location.origin

let socket = null

export const connectSocket = () => {
  if (socket?.connected) return socket
  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  })
  return socket
}

export const getSocket = () => {
  if (!socket) return connectSocket()
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}