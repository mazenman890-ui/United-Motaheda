import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";

export interface DeliveryMapCoordinates {
  latitude: number;
  longitude: number;
}

export interface DeliveryMapProps {
  initialLatitude?: number;
  initialLongitude?: number;
  initialZoom?: number;
  onCoordinateChange?: (coords: DeliveryMapCoordinates) => void;
  onConfirmAddress?: (coords: DeliveryMapCoordinates) => void;
  style?: ViewStyle;
}

const DEFAULT_LATITUDE = 30.0444;
const DEFAULT_LONGITUDE = 31.2357;
const DEFAULT_ZOOM = 13;

export function DeliveryMap({
  initialLatitude = DEFAULT_LATITUDE,
  initialLongitude = DEFAULT_LONGITUDE,
  initialZoom = DEFAULT_ZOOM,
  onCoordinateChange,
  onConfirmAddress,
  style,
}: DeliveryMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<DeliveryMapCoordinates>({
    latitude: initialLatitude,
    longitude: initialLongitude,
  });

  const html = useMemo(
    () => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><style>html,body,#map{margin:0;padding:0;height:100%;width:100%;overflow:hidden;} .leaflet-container{background:#f7fafc;}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const initialLat=${initialLatitude};const initialLng=${initialLongitude};const map = L.map('map').setView([initialLat, initialLng], ${initialZoom});L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom:19}).addTo(map);const marker = L.marker([initialLat, initialLng], {draggable:true}).addTo(map);function sendPosition(){const pos = marker.getLatLng();window.ReactNativeWebView.postMessage(JSON.stringify({latitude:pos.lat,longitude:pos.lng}));}marker.on('dragend', sendPosition);map.on('click', (event)=>{marker.setLatLng(event.latlng);sendPosition();});sendPosition();</script></body></html>`,
    [initialLatitude, initialLongitude, initialZoom]
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as DeliveryMapCoordinates;
        if (
          typeof payload.latitude === "number" &&
          typeof payload.longitude === "number"
        ) {
          const nextLocation = {
            latitude: payload.latitude,
            longitude: payload.longitude,
          };
          setSelectedLocation(nextLocation);
          onCoordinateChange?.(nextLocation);
        }
      } catch {
        // Ignore unexpected payloads.
      }
    },
    [onCoordinateChange]
  );

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        automaticallyAdjustContentInsets={false}
        mixedContentMode="always"
      />

      <View style={styles.overlay}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Address pin</Text>
          <Text style={styles.coordinates}>
            {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.78}
          style={styles.confirmButton}
          onPress={() => onConfirmAddress?.(selectedLocation)}>
          <Text style={styles.confirmText}>Confirm Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 320,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#021D2E",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  coordinates: {
    color: "#dbeafe",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
  },
  confirmButton: {
    alignSelf: "stretch",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#021D2E",
    fontSize: 14,
    fontWeight: "700",
  },
});
