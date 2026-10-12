import { useSyncExternalStore } from 'react'
import {
  getConnectivitySnapshot,
  subscribeConnectivity,
} from '@/services/connectivity'

/** Mantiene un estado de conectividad único en todo el frontend. */
export function useConnectivityStatus() {
  return useSyncExternalStore(
    subscribeConnectivity,
    getConnectivitySnapshot,
    getConnectivitySnapshot,
  )
}
