import { useState, useEffect } from "react"
import * as Location from "expo-location"

interface AddressState {
  address: string | null
  isLoading: boolean
  error: string | null
}

export function useCurrentAddress(): AddressState {
  const [state, setState] = useState<AddressState>({
    address: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function fetchAddress() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          if (!cancelled)
            setState({
              address: null,
              isLoading: false,
              error: "permission_denied",
            })
          return
        }

        const location = await Location.getCurrentPositionAsync({})
        const [result] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })

        if (!cancelled && result) {
          const district = result.district || result.subregion || ""
          const street = result.street || result.name || ""
          const address = `${district} ${street}`.trim()
          setState({
            address: address || null,
            isLoading: false,
            error: address ? null : "address_not_found",
          })
        }
      } catch {
        if (!cancelled)
          setState({ address: null, isLoading: false, error: "fetch_failed" })
      }
    }

    fetchAddress()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
